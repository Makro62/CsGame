import { useEffect, useRef, useCallback, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Physics } from "@react-three/rapier";
import { WEAPONS } from "@cs-game/shared";
import { L4DSurvivorSelect } from "./L4DSurvivorSelect";
import {
  PlayerController,
  WeaponModel,
  MinecraftCharacter,
  ShootingSystem,
  ReloadSystem,
  TracerManager,
  Crosshair,
  SniperScope,
  ADSOpticSight,
  DamageVignette,
  ClickToPlayOverlay,
  gameEvents,
  useL4DStore,
  L4DDirector,
  L4DCampaignMap,
  L4D_SAFE_Z,
  L4D_ZONES,
  L4D_CAMPAIGN_WEAPON,
  clampL4DInfected,
  l4dRoughLos,
  getL4DZone,
  useGameStore,
  useWeaponStore,
  useWeaponSwitch,
  InfectedFigure,
  PauseMenu,
  InGameChrome,
  GameModal,
  ModalBody,
  ModalHeader,
  OverlayButton,
  HUD_Z,
  getL4DSurvivor,
  type L4DSurvivorDef,
} from "../game/l4d/l4dKit";

function applyL4DSurvivorStats(survivor: L4DSurvivorDef) {
  useL4DStore.setState(s => ({
    survivors: s.survivors.map((sv, i) => {
      if (i !== 0) return sv;
      return {
        ...sv,
        name: survivor.name,
        maxHp: survivor.stats.maxHp,
        hp: survivor.stats.maxHp,
        speed: survivor.stats.speed,
      };
    }),
  }));
  applyL4DLoadout(survivor);
}

const L4D_CANVAS_ID = "l4d-game-canvas";

function lockL4DCanvas() {
  const canvas = document.querySelector(`#${L4D_CANVAS_ID} canvas`) as HTMLCanvasElement | null;
  canvas?.requestPointerLock();
}

const L4D_ABILITY_LABEL: Record<string, string> = {
  rally: "RALLY",
  heal_pulse: "HEAL PULSE",
  sprint_burst: "SPRINT",
  lucky_shot: "LUCKY SHOT",
};

function tryL4DSurvivorAbility(def: L4DSurvivorDef): boolean {
  const st = useL4DStore.getState();
  if (st.abilityCooldownRemaining > 0) return false;
  const me = st.survivors[0];
  if (!me || me.isDead || me.isDowned) return false;
  const now = Date.now();

  if (def.ability === "rally") {
    useL4DStore.setState(s => ({
      survivors: s.survivors.map(sv => sv.isDead ? sv : {
        ...sv,
        hp: Math.min(sv.maxHp, sv.hp + 35),
        isDowned: sv.isDowned && sv.hp + 35 >= 20 ? false : sv.isDowned,
        downedTimer: sv.isDowned && sv.hp + 35 >= 20 ? 0 : sv.downedTimer,
      }),
      abilityCooldownRemaining: def.abilityCooldown,
    }));
  } else if (def.ability === "heal_pulse") {
    useL4DStore.setState(s => ({
      survivors: s.survivors.map(sv => {
        if (sv.isDead) return sv;
        const heal = sv.id === "survivor_0" ? 40 : 20;
        return { ...sv, hp: Math.min(sv.maxHp, sv.hp + heal) };
      }),
      abilityCooldownRemaining: def.abilityCooldown,
    }));
  } else if (def.ability === "sprint_burst") {
    useL4DStore.setState({
      sprintBoostUntil: now + 6000,
      abilityCooldownRemaining: def.abilityCooldown,
    });
  } else if (def.ability === "lucky_shot") {
    useL4DStore.setState({
      luckyShotUntil: now + 8000,
      abilityCooldownRemaining: def.abilityCooldown,
    });
  } else {
    return false;
  }
  return true;
}

function applyL4DLoadout(_survivor?: L4DSurvivorDef) {
  const ws = useWeaponStore.getState();
  const primary = L4D_CAMPAIGN_WEAPON;
  ws.setInfiniteAmmo(false);
  ws.syncLoadout({ primary, secondary: "glock", knife: "knife" });
  ws.equipWeapon(primary, { ammo: WEAPONS[primary].mag, reserveAmmo: WEAPONS[primary].reserveAmmo * 3 });
  useWeaponStore.setState({
    primaryAmmo: WEAPONS[primary].mag,
    primaryReserve: WEAPONS[primary].reserveAmmo * 3,
    secondaryWeapon: "glock",
    secondaryAmmo: 20,
    secondaryReserve: 999,
  });
}

function L4DInfectedRenderer() {
  const infected = useL4DStore(s => s.infected);
  return (
    <group>
      {infected.filter(i => !i.isDead).map(inf => (
        <group
          key={inf.id}
          position={[inf.x, inf.y, inf.z]}
          rotation={[0, inf.rotationY, 0]}
          userData={{ infectedId: inf.id }}
        >
          <InfectedFigure
            type={inf.type}
            infectedId={inf.id}
            attacking={inf.isAttacking}
            moving={!inf.isAttacking}
          />
        </group>
      ))}
    </group>
  );
}

function SurvivorBots({ survivorDefs }: { survivorDefs: Record<string, L4DSurvivorDef> }) {
  const survivors = useL4DStore(s => s.survivors);
  return (
    <group>
      {survivors.map((s, idx) => {
        if (idx === 0 || s.isDead) return null;
        const def = survivorDefs[s.id];
        const firing = s.shootingUntil > Date.now();
        return (
          <group key={s.id} position={[s.x, 0, s.z]} rotation={[0, s.rotationY, 0]}>
            <MinecraftCharacter
              team="CT"
              isDead={s.isDowned}
              limbSwingSpeed={s.isDowned || firing ? 0 : 6}
              holdWeapon={!s.isDowned}
              weaponType="rifle"
              weaponScale={1}
              muzzleUntil={s.shootingUntil}
              heroColor={def?.armorColor}
              heroAccent={def?.accentColor}
              bodyStyle={def?.id}
            />
          </group>
        );
      })}
    </group>
  );
}

function L4DSimLoop({
  directorRef,
  pausedRef,
  startedRef,
}: {
  directorRef: React.MutableRefObject<L4DDirector | null>;
  pausedRef: React.MutableRefObject<boolean>;
  startedRef: React.MutableRefObject<boolean>;
}) {
  const last = useRef(performance.now());
  const acc = useRef(0);
  const botRevive = useRef(new Map<string, number>());
  const botFireCd = useRef(new Map<string, number>());

  useFrame(() => {
    if (pausedRef.current || !startedRef.current) {
      last.current = performance.now();
      return;
    }
    const now = performance.now();
    acc.current += Math.min((now - last.current) / 1000, 0.1);
    last.current = now;
    const FIXED = 1 / 60;
    let steps = 0;
    while (acc.current >= FIXED && steps < 4) {
      tick(FIXED);
      acc.current -= FIXED;
      steps++;
    }
  });

    const tick = (dt: number) => {
    const st = useL4DStore.getState();
    if (st.isGameOver || st.isVictory) return;
    const p = st.survivors[0];

    for (let i = 1; i < st.survivors.length; i++) {
      const bot = st.survivors[i];
      if (bot.isDead) continue;
      if (bot.isDowned) {
        const nt = bot.downedTimer - dt;
        if (nt <= 0) useL4DStore.getState().updateSurvivor(bot.id, s => ({ ...s, isDead: true, isDowned: false, downedTimer: 0 }));
        else useL4DStore.getState().updateSurvivor(bot.id, s => ({ ...s, downedTimer: nt }));
        continue;
      }
      const helpTarget = p.isDowned ? p : st.survivors.find(s => s.isDowned && !s.isDead && s.id !== bot.id);
      const unlocked = st.unlockedZones;
      const targetX = helpTarget ? helpTarget.x : p.x + (i % 2 ? 1.6 : -1.6);
      const targetZ = helpTarget ? helpTarget.z : p.z - 1.4 - i * 0.45;
      const dx = targetX - bot.x, dz = targetZ - bot.z, d = Math.hypot(dx, dz);
      let rotationY = bot.rotationY;
      if (d > 0.35) {
        const step = 3.2 * dt;
        const nx = bot.x + (dx / d) * step;
        const nz = bot.z + (dz / d) * step;
        const clamped = clampL4DInfected(nx, nz, unlocked);
        rotationY = Math.atan2(dx, dz);
        useL4DStore.getState().updateSurvivor(bot.id, s => ({
          ...s,
          x: clamped.x,
          z: clamped.z,
          rotationY,
        }));
      }
      const progress = botRevive.current.get(bot.id) ?? 0;
      if (helpTarget && d < 1.7) {
        const next = progress + dt;
        if (next >= 3.5) {
          botRevive.current.set(bot.id, 0);
          useL4DStore.getState().updateSurvivor(helpTarget.id, s => ({
            ...s, isDowned: false, downedTimer: 0, hp: Math.max(40, s.hp), pinnedBy: null, grabbedBy: null,
          }));
        } else {
          botRevive.current.set(bot.id, next);
        }
      } else {
        botRevive.current.set(bot.id, Math.max(0, progress - dt));
      }

      let nearest = null as typeof st.infected[0] | null;
      let nd = Infinity;
      for (const inf of st.infected) {
        if (inf.isDead) continue;
        const dd = Math.hypot(inf.x - bot.x, inf.z - bot.z);
        if (dd < nd) { nd = dd; nearest = inf; }
      }
      const cd = Math.max(0, (botFireCd.current.get(bot.id) ?? 0) - dt);
      botFireCd.current.set(bot.id, cd);
      if (nearest && nd < 18 && l4dRoughLos(bot.x, bot.z, nearest.x, nearest.z, unlocked)) {
        const aimYaw = Math.atan2(nearest.x - bot.x, nearest.z - bot.z);
        useL4DStore.getState().updateSurvivor(bot.id, s => ({ ...s, rotationY: aimYaw }));
        if (cd <= 0) {
          botFireCd.current.set(bot.id, 0.26);
          const dmg = 22 + Math.random() * 12;
          useL4DStore.getState().damageInfected(nearest.id, dmg);
          const barrel = 0.9;
          useGameStore.getState().setTracerEvent({
            start: {
              x: bot.x + Math.sin(aimYaw) * barrel,
              y: 1.42,
              z: bot.z + Math.cos(aimYaw) * barrel,
            },
            end: { x: nearest.x, y: 1.05, z: nearest.z },
            color: "#fde047",
          });
          useL4DStore.getState().updateSurvivor(bot.id, s => ({
            ...s,
            rotationY: aimYaw,
            shootingUntil: Date.now() + 140,
          }));
        }
      }
    }

    directorRef.current?.setSurvivorPositions(useL4DStore.getState().survivors.filter(s => !s.isDead).map(s => ({ x: s.x, z: s.z })));
    directorRef.current?.update(dt);
    useL4DStore.getState().tickAbility(dt);

    const survivorsNow = useL4DStore.getState().survivors;
    for (const inf of useL4DStore.getState().infected) {
      if (inf.isDead || !inf.isAttacking) continue;
      if (inf.type === "hunter" && inf.pinTarget) continue;
      for (const sv of survivorsNow) {
        if (sv.isDead || sv.isDowned) continue;
        if (Math.hypot(inf.x - sv.x, inf.z - sv.z) < 1.8 && Math.random() < 0.04) {
          const dmg = inf.type === "tank" ? 28 : inf.type === "witch" ? 40 : inf.type === "hunter" ? 18 : 10;
          useL4DStore.getState().updateSurvivor(sv.id, s => {
            const nhp = Math.max(0, s.hp - dmg);
            if (nhp <= 0) return { ...s, hp: 0, isDowned: false, isDead: true };
            if (nhp < 20) return { ...s, hp: nhp, isDowned: true, downedTimer: 22 };
            return { ...s, hp: nhp };
          });
          if (sv.id === "survivor_0") {
            gameEvents.emit("playerHitFeedback", { shooterX: inf.x, shooterZ: inf.z, damage: dmg });
            window.dispatchEvent(new CustomEvent("zombieDamageTaken"));
          }
        }
      }
    }

    const st2 = useL4DStore.getState();
    const player = st2.survivors[0];
    if (player.isDowned && !player.isDead) {
      const nt = player.downedTimer - dt;
      if (nt <= 0) useL4DStore.getState().updateSurvivor(player.id, s => ({ ...s, isDead: true, isDowned: false }));
      else useL4DStore.getState().updateSurvivor(player.id, s => ({ ...s, downedTimer: nt }));
    }

    const alive = useL4DStore.getState().survivors.filter(s => !s.isDead).length;
    if (alive === 0 && !useL4DStore.getState().isGameOver) useL4DStore.setState({ isGameOver: true });
  };

  return null;
}

export function L4DMode() {
  const directorRef = useRef<L4DDirector | null>(null);
  const survivors = useL4DStore(s => s.survivors);
  const chapter = useL4DStore(s => s.chapter);
  const currentZone = useL4DStore(s => s.currentZone);
  const unlockedZones = useL4DStore(s => s.unlockedZones);
  const zoneBanner = useL4DStore(s => s.zoneBanner);
  const zombiesRemaining = useL4DStore(s => s.zombiesRemaining);
  const zoneQuota = useL4DStore(s => s.zoneQuota);
  const isGameOver = useL4DStore(s => s.isGameOver);
  const isVictory = useL4DStore(s => s.isVictory);
  const abilityCooldownRemaining = useL4DStore(s => s.abilityCooldownRemaining);
  const sprintBoostUntil = useL4DStore(s => s.sprintBoostUntil);
  const luckyShotUntil = useL4DStore(s => s.luckyShotUntil);
  const currentAmmo = useWeaponStore(s => s.currentAmmo);
  const reserveAmmo = useWeaponStore(s => s.reserveAmmo);
  const activeWeapon = useWeaponStore(s => s.activeWeapon);
  const [session, setSession] = useState(0);
  useWeaponSwitch({ buyMenu: false, lockLoadout: true });
  const [paused, setPaused] = useState(false);
  const [survivorSelected, setSurvivorSelected] = useState(false);
  const [selectedSurvivorId, setSelectedSurvivorId] = useState("coach");
  const selectedSurvivorDef = getL4DSurvivor(selectedSurvivorId);
  const pausedRef = useRef(false);
  pausedRef.current = paused;
  const startedRef = useRef(false);
  startedRef.current = survivorSelected;
  const survivorSelectedRef = useRef(false);
  survivorSelectedRef.current = survivorSelected;
  const selectedSurvivorIdRef = useRef(selectedSurvivorId);
  selectedSurvivorIdRef.current = selectedSurvivorId;

  useEffect(() => {
    useGameStore.getState().setMode("l4d");
  }, []);

  useEffect(() => {
    if (!survivorSelected) return;
    directorRef.current = new L4DDirector();
    useL4DStore.getState().resetCampaign(1);
    applyL4DSurvivorStats(getL4DSurvivor(selectedSurvivorId));
    directorRef.current.init();
    applyL4DLoadout();
    return () => {
      directorRef.current?.cleanup();
      directorRef.current = null;
    };
  }, [survivorSelected, selectedSurvivorId]);

  useEffect(() => {
    if (!survivorSelected) return;
    applyL4DLoadout();
  }, [currentZone, survivorSelected]);

  useEffect(() => {
    if (!zoneBanner) return;
    const t = window.setTimeout(() => useL4DStore.getState().setZoneBanner(null), 2800);
    return () => window.clearTimeout(t);
  }, [zoneBanner]);

  useEffect(() => {
    let holding = false;
    let progress = 0;
    let raf = 0;
    const tick = () => {
      if (!holding) return;
      const st = useL4DStore.getState();
      const me = st.survivors[0];
      const downed = st.survivors.find(s => s.isDowned && !s.isDead && s.id !== "survivor_0");
      if (!downed || me.isDowned || me.isDead) { progress = 0; return; }
      if (Math.hypot(me.x - downed.x, me.z - downed.z) > 2.2) { progress = 0; return; }
      progress += 1 / 60 / 3.2;
      if (progress >= 1) {
        useL4DStore.getState().updateSurvivor(downed.id, s => ({
          ...s, isDowned: false, downedTimer: 0, hp: 40, pinnedBy: null, grabbedBy: null,
        }));
        progress = 0;
      }
      raf = requestAnimationFrame(tick);
    };
    const down = (e: KeyboardEvent) => {
      if (e.code !== "KeyF" || holding) return;
      holding = true; progress = 0; raf = requestAnimationFrame(tick);
    };
    const up = (e: KeyboardEvent) => {
      if (e.code !== "KeyF") return;
      holding = false; cancelAnimationFrame(raf); progress = 0;
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      cancelAnimationFrame(raf);
    };
  }, []);

  const handleBack = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(false);
    useGameStore.getState().setMode("menu");
  }, []);
  const handleRestart = useCallback(() => {
    setPaused(false);
    useL4DStore.getState().resetCampaign(1);
    applyL4DSurvivorStats(getL4DSurvivor(selectedSurvivorId));
    useL4DStore.getState().resetAbility();
    directorRef.current?.init();
    setSession(s => s + 1);
    lockL4DCanvas();
  }, [selectedSurvivorId]);

  const resume = useCallback(() => {
    setPaused(false);
    lockL4DCanvas();
  }, []);

  const openPause = useCallback(() => {
    if (document.pointerLockElement) document.exitPointerLock();
    setPaused(true);
  }, []);

  const hasLockedRef = useRef(false);
  useEffect(() => {
    const onPointerLockChange = () => {
      if (!survivorSelectedRef.current) return;
      const locked = !!document.pointerLockElement;
      if (locked) {
        hasLockedRef.current = true;
        setPaused(false);
        return;
      }
      if (hasLockedRef.current && !isGameOver && !isVictory) setPaused(true);
    };
    document.addEventListener("pointerlockchange", onPointerLockChange);
    return () => document.removeEventListener("pointerlockchange", onPointerLockChange);
  }, [isGameOver, isVictory]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "KeyQ") {
        if (!survivorSelectedRef.current || pausedRef.current) return;
        tryL4DSurvivorAbility(getL4DSurvivor(selectedSurvivorIdRef.current));
        return;
      }
      if (e.code === "Escape") {
        if (paused) resume();
        else if (document.pointerLockElement) document.exitPointerLock();
        return;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [paused, resume]);

  const aliveCount = survivors.filter(s => !s.isDead).length;
  const me = survivors[0];
  const zone = getL4DZone(currentZone);
  const subtitle = `${zone.name} · ${unlockedZones}/${L4D_ZONES.length} wilayah`;

  const handleSurvivorSelect = useCallback((id: string) => {
    selectedSurvivorIdRef.current = id;
    survivorSelectedRef.current = true;
    setSelectedSurvivorId(id);
    setSurvivorSelected(true);
  }, []);

  // Build survivor defs map for bot colors
  const survivorDefsMap: Record<string, L4DSurvivorDef> = {};
  const botIds = survivors.filter(s => s.isBot).map(s => s.id);
  for (const s of survivors) {
    // Map survivor_0 to selected, others to remaining defs
    if (s.id === "survivor_0") {
      survivorDefsMap[s.id] = selectedSurvivorDef;
    } else {
      // Find a bot def that isn't the selected one
      const usedNames = Object.values(survivorDefsMap).map(d => d.name);
      const allDefs = ["coach", "rochelle", "ellis", "nick"]
        .map(id => getL4DSurvivor(id))
        .filter(d => d.name !== selectedSurvivorDef.name && !usedNames.includes(d.name));
      const idx = botIds.indexOf(s.id);
      survivorDefsMap[s.id] = allDefs[idx] ?? allDefs[0];
    }
  }

  if (!survivorSelected) {
    return <L4DSurvivorSelect onSelect={handleSurvivorSelect} onBack={handleBack} />;
  }

  return (
    <div className="w-full bg-black relative overflow-hidden" style={{ height: "100dvh", width: "100%" }}>

      <div
        id={L4D_CANVAS_ID}
        className="w-full h-full cursor-crosshair"
        onClick={() => {
          if (survivorSelected && !paused) lockL4DCanvas();
        }}
      >
      <Canvas shadows camera={{ fov: 75, position: [0, 1.6, L4D_SAFE_Z] }}>
        <color attach="background" args={["#070c09"]} />
        <fog attach="fog" args={["#070c09", 18, 90]} />
        <ambientLight intensity={0.28} />
        <hemisphereLight args={["#3a4a40", "#0a0c08", 0.35]} />
        <directionalLight position={[6, 14, 4]} intensity={0.5} castShadow />
        <Physics gravity={[0, -9.81, 0]}>
          <L4DCampaignMap />
          <PlayerController key={`${session}`} />
          <SurvivorBots survivorDefs={survivorDefsMap} />
          <L4DInfectedRenderer />
          <WeaponModel />
        </Physics>
        <ShootingSystem />
        <ReloadSystem />
        <TracerManager />
        <L4DSimLoop directorRef={directorRef} pausedRef={pausedRef} startedRef={startedRef} />
      </Canvas>
      </div>

      <div className="absolute bg-black/60 border border-white/10 rounded px-3 py-2 text-white font-mono" style={{ top: "clamp(8px, 2vw, 12px)", left: "clamp(8px, 2vw, 12px)", maxWidth: "42dvw" }}>
        <div className="text-lg font-bold" style={{ fontSize: "clamp(14px, 2vw, 18px)" }}>WILAYAH {chapter}/{L4D_ZONES.length}</div>
        <div className="text-xs opacity-80" style={{ fontSize: "clamp(10px, 1.2vw, 12px)" }}>{subtitle}</div>
        <div className="text-xs" style={{ fontSize: "clamp(10px, 1.2vw, 12px)" }}>Zombie {zombiesRemaining}/{zoneQuota}</div>
        <div className="text-xs opacity-70" style={{ fontSize: "clamp(10px, 1.2vw, 12px)" }}>Hidup {aliveCount}/4 · 3 teman AI</div>
      </div>
      {survivorSelected && !isGameOver && !isVictory && <InGameChrome onMenu={openPause} />}

      <div className="absolute flex gap-2" style={{ bottom: "clamp(8px, 2vw, 12px)", left: "clamp(8px, 2vw, 12px)", maxWidth: "58dvw" }}>
        {survivors.map(s => (
          <div key={s.id} className={`px-3 py-2 rounded border font-mono ${s.isDead ? "bg-red-900 border-red-600 text-white/50" : s.isDowned ? "bg-yellow-900 border-yellow-600 text-white" : "bg-black/60 border-white/20 text-white"}`} style={{ fontSize: "clamp(10px, 1.3vw, 12px)", minWidth: "clamp(70px, 12vw, 100px)" }}>
            <div className="font-bold" style={{ fontSize: "clamp(10px, 1.4vw, 12px)" }}>{s.name} {s.id === "survivor_0" && "(YOU)"}</div>
            <div>HP {Math.ceil(s.hp)}/{s.maxHp}</div>
            {s.isDowned && <div className="text-yellow-300 animate-pulse">DOWNED {Math.ceil(s.downedTimer)}s</div>}
            {s.grabbedBy && <div className="text-green-300">SMOKER!</div>}
            {s.pinnedBy && <div className="text-blue-300">HUNTER PIN</div>}
          </div>
        ))}
      </div>
      <div className="absolute bg-black/60 border border-white/10 rounded px-3 py-2 text-white font-mono text-right" style={{ bottom: "clamp(8px, 2vw, 12px)", right: "clamp(8px, 2vw, 12px)", minWidth: "clamp(120px, 30vw, 160px)", maxWidth: "42dvw" }}>
        <div className="text-lg" style={{ fontSize: "clamp(14px, 2vw, 18px)" }}>{(activeWeapon ?? "—").toUpperCase()}</div>
        <div className="text-2xl" style={{ fontSize: "clamp(18px, 3vw, 24px)" }}>{currentAmmo} <span className="text-sm opacity-60" style={{ fontSize: "clamp(11px, 1.5vw, 14px)" }}>/ {reserveAmmo}</span></div>
        <div className="text-white/60 text-xs" style={{ fontSize: "clamp(9px, 1.2vw, 12px)" }}>1 senjata · WASD · LMB · RMB ADS · R reload · F revive · Q ability</div>
        <div className={`mt-1 text-xs font-bold ${abilityCooldownRemaining <= 0 ? "text-emerald-400" : "text-white/40"}`}>
          [Q] {L4D_ABILITY_LABEL[selectedSurvivorDef.ability] ?? selectedSurvivorDef.ability}
          {abilityCooldownRemaining > 0
            ? ` ${Math.ceil(abilityCooldownRemaining)}s`
            : Date.now() < sprintBoostUntil
              ? " ACTIVE"
              : Date.now() < luckyShotUntil
                ? " ACTIVE"
                : " READY"}
        </div>
      </div>

      <Crosshair />
      <SniperScope />
      <ADSOpticSight />
      <DamageVignette />
      {zoneBanner && !isGameOver && !isVictory && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 bg-emerald-800/90 text-white px-6 py-3 rounded font-bold tracking-wide">
          {zoneBanner}
        </div>
      )}
      {me?.isDowned && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="bg-red-950/80 text-white px-8 py-4 rounded font-bold text-xl">INCAPACITATED — wait for a teammate</div>
        </div>
      )}
      {(isGameOver || isVictory) && (
        <GameModal accent={isVictory ? "green" : "red"} zIndex={HUD_Z.modal}>
          <ModalHeader
            eyebrow={isVictory ? "SEMUA WILAYAH AMAN" : "PARTY WIPED"}
            title={isVictory ? "EVAKUASI BERHASIL" : "K.I.A."}
          />
          <ModalBody>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <OverlayButton variant={isVictory ? "accent" : "danger"} onClick={handleRestart}>ULANGI</OverlayButton>
              <OverlayButton variant="ghost" onClick={handleBack}>MENU UTAMA</OverlayButton>
            </div>
          </ModalBody>
        </GameModal>
      )}
      <ClickToPlayOverlay
        onLock={() => setPaused(false)}
        suppressed={isGameOver || isVictory || paused}
        canvasSelector={`#${L4D_CANVAS_ID} canvas`}
      />
      {paused && !isGameOver && !isVictory && (
        <PauseMenu
          title="KAMPANYE SURVIVOR"
          accent="green"
          onResume={resume}
          onRestart={handleRestart}
          onQuit={handleBack}
        />
      )}
    </div>
  );
}
