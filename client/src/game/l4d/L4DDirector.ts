import { useL4DStore, type L4DInfected, type L4DSurvivor, type SpecialType } from "../../stores/useL4DStore";
import { SpatialGrid } from "../zombie/SpatialGrid";
import { pickL4DSpawn, clampL4DInfected } from "./l4dLayout";
import { hordeSeparationFromIds, L4D_HORDE_SEP } from "../zombie/hordeMovement";

type DirectorPhase = "buildUp" | "sustain" | "relief" | "finale";

export class L4DDirector {
  private grid = new SpatialGrid(6);
  private phase: DirectorPhase = "buildUp";
  private phaseTimer = 0;
  private hordeCooldown = 25;
  private specialCooldown = 12;
  private intensity = 0;
  private survivorPositions: { x: number; z: number }[] = [];
  private engineId = 0;

  /** Horde spawn queue — replaces leaked setTimeout */
  private hordeQueue: Array<{ delay: number }> = [];
  private hordeTimer = 0;
  /** Crescendo timer — replaces leaked setTimeout */
  private crescendoTimer = 0;

  init() {
    this.phase = "buildUp";
    this.phaseTimer = 0;
    this.hordeCooldown = 25 + Math.random() * 10;
    this.specialCooldown = 10;
    this.intensity = 10;
    this.grid.clear();
    this.engineId = Date.now();
    this.hordeQueue = [];
    this.hordeTimer = 0;
    this.crescendoTimer = 0;
  }

  cleanup() {
    this.hordeQueue = [];
    this.crescendoTimer = 0;
  }

  setSurvivorPositions(pos: { x: number; z: number }[]) {
    this.survivorPositions = pos;
  }

  update(dt: number) {
    const st = useL4DStore.getState();
    if (st.isGameOver || st.isVictory) return;
    if (st.chapterState === "safeRoom") return;

    this.phaseTimer += dt;
    this.hordeCooldown -= dt;
    this.specialCooldown -= dt;

    // Crescendo timer
    if (this.crescendoTimer > 0) {
      this.crescendoTimer -= dt;
      if (this.crescendoTimer <= 0) {
        useL4DStore.setState({ crescendoActive: false });
      }
    }

    // Horde spawn queue (drip spawns instead of setTimeout burst)
    if (this.hordeQueue.length > 0) {
      this.hordeTimer += dt * 1000;
      while (this.hordeQueue.length > 0 && this.hordeQueue[0].delay <= this.hordeTimer) {
        this.hordeQueue.shift();
        this.spawnCommonHorde();
      }
    }

    // Intensity based on avg survivor HP
    const avgHp = st.survivors.reduce((a, s) => a + s.hp, 0) / Math.max(1, st.survivors.length);
    const stress = 100 - avgHp;
    let target = 30;
    if (this.phase === "buildUp") target = 70;
    if (this.phase === "sustain") target = 85;
    if (this.phase === "relief") target = 15;
    if (st.chapterState === "finale") target = 95;
    this.intensity = this.intensity * 0.97 + target * 0.03 + (stress * 0.05);
    this.intensity = Math.max(0, Math.min(100, this.intensity));
    useL4DStore.getState().setDirectorIntensity(this.intensity);
    useL4DStore.getState().setPanic(Math.min(100, st.panicLevel * 0.995 + (this.intensity > 70 ? dt * 4 : 0)));

    // Phase transitions
    if (this.phase === "buildUp" && this.phaseTimer > 35) { this.phase = "sustain"; this.phaseTimer = 0; }
    else if (this.phase === "sustain" && this.phaseTimer > 20) { this.phase = "relief"; this.phaseTimer = 0; }
    else if (this.phase === "relief" && this.phaseTimer > 18) { this.phase = "buildUp"; this.phaseTimer = 0; }

    // Horde trigger
    const shouldHorde = (this.intensity > 60 && this.hordeCooldown <= 0) || st.crescendoActive || (st.chapterState === "finale" && st.finaleState === "holdout");
    if (shouldHorde && !st.hordeActive) {
      this.triggerHorde();
    }
    if (st.hordeActive) {
      let t = st.hordeTimer - dt;
      if (t <= 0) {
        useL4DStore.getState().setHorde(false, 0);
        useL4DStore.getState().setPanic(0);
        this.hordeCooldown = 35 + Math.random() * 25;
        this.phase = "relief"; this.phaseTimer = 0;
      } else {
        useL4DStore.getState().setHorde(true, t);
        if (Math.random() < 0.08) this.spawnPanicCommon();
      }
    }

    // Special infected
    if (this.specialCooldown <= 0 && this.intensity > 25) {
      if (st.infected.filter(i => !i.isDead && i.type !== "common").length < 3) {
        this.spawnSpecial();
        this.specialCooldown = 12 + Math.random() * 12;
        if (st.chapterState === "finale") this.specialCooldown *= 0.7;
      }
    }

    // Witch / Tank rare
    if (this.phase === "sustain" && Math.random() < 0.002) {
      this.spawnSpecialType(st.chapterProgress < 0.5 ? "witch" : "tank");
    }

    // Update infected movement
    this.updateInfected(dt);
  }

  private triggerHorde() {
    const count = 12 + Math.floor(Math.random() * 10) + (useL4DStore.getState().chapter - 1) * 4;
    useL4DStore.getState().setHorde(true, 22);
    useL4DStore.getState().setPanic(80);
    // Queue spawns instead of setTimeout
    this.hordeQueue = [];
    for (let i = 0; i < count; i++) {
      this.hordeQueue.push({ delay: i * 180 });
    }
    this.hordeTimer = 0;
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("l4dHorde", { detail: { count } }));
  }

  private spawnCommonHorde() {
    const pos = pickL4DSpawn(this.survivorPositions, 12, 22);
    this.spawnCommonAt(pos.x, pos.z);
  }
  private spawnPanicCommon() {
    const pos = pickL4DSpawn(this.survivorPositions, 10, 18);
    this.spawnCommonAt(pos.x, pos.z);
  }
  private spawnCommonAt(x: number, z: number) {
    const st = useL4DStore.getState();
    if (st.infected.filter(i => !i.isDead).length >= 42) return;
    const inf: L4DInfected = {
      id: `l4d_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "common", x, y: 0, z, hp: 50, maxHp: 50, rotationY: Math.random() * Math.PI * 2, isDead: false, isAttacking: false, speed: 3.2,
      alerted: true, pinTarget: null, grabTarget: null,
    };
    useL4DStore.getState().addInfected(inf);
  }
  private spawnSpecial() {
    const pool: SpecialType[] = ["hunter", "smoker", "boomer"];
    const t = pool[Math.floor(Math.random() * pool.length)];
    this.spawnSpecialType(t);
  }
  private spawnSpecialType(type: SpecialType) {
    const pos = pickL4DSpawn(this.survivorPositions, type === "tank" || type === "witch" ? 14 : 12, type === "tank" || type === "witch" ? 24 : 22);
    const hpMap: Record<SpecialType, number> = { common: 50, hunter: 250, smoker: 200, boomer: 150, tank: 3000, witch: 800 };
    const spd: Record<SpecialType, number> = { common: 3.2, hunter: 4.5, smoker: 3.0, boomer: 2.8, tank: 2.2, witch: 3.8 };
    const inf: L4DInfected = {
      id: `l4d_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type, x: pos.x, y: 0, z: pos.z, hp: hpMap[type], maxHp: hpMap[type], rotationY: 0, isDead: false, isAttacking: false, speed: spd[type],
      alerted: type !== "witch", pinTarget: null, grabTarget: null,
    };
    useL4DStore.getState().addInfected(inf);
  }

  private updateInfected(dt: number) {
    const st = useL4DStore.getState();
    const survivors = st.survivors.filter(s => !s.isDead);
    if (survivors.length === 0) return;
    this.grid.clear();
    st.infected.forEach(i => { if (!i.isDead) this.grid.insert(i.id, i.x, i.z); });
    const updated: L4DInfected[] = [];
    let anyChanged = false;
    const survivorPatches = new Map<string, Partial<L4DSurvivor>>();

    const patchSurvivor = (id: string, patch: Partial<L4DSurvivor>) => {
      survivorPatches.set(id, { ...(survivorPatches.get(id) ?? {}), ...patch });
    };

    for (const inf of st.infected) {
      if (inf.isDead) { updated.push(inf); continue; }
      let best = survivors[0]; let bestD = Math.hypot(inf.x - best.x, inf.z - best.z);
      for (const s of survivors) {
        const d = Math.hypot(inf.x - s.x, inf.z - s.z);
        if (d < bestD) { bestD = d; best = s; }
      }
      const dx = best.x - inf.x, dz = best.z - inf.z;
      const dist = Math.hypot(dx, dz);
      const { x: sepX, z: sepZ } = hordeSeparationFromIds(
        inf,
        this.grid.query(inf.x, inf.z, L4D_HORDE_SEP.queryRadius),
        (id) => {
          const o = st.infected.find(x => x.id === id);
          return o && !o.isDead ? o : undefined;
        },
        L4D_HORDE_SEP.radius,
        L4D_HORDE_SEP.strength,
      );
      let nx = inf.x, nz = inf.z, rot = inf.rotationY;
      let isAttacking = inf.isAttacking;
      let alerted = inf.alerted ?? inf.type !== "witch";
      let pinTarget = inf.pinTarget ?? null;
      let grabTarget = inf.grabTarget ?? null;
      let spd = inf.speed;

      if (inf.type === "witch") {
        if (!alerted) {
          if (dist < 3.2 || inf.hp < inf.maxHp) alerted = true;
          else { updated.push(inf); continue; }
        }
        spd = 5.2;
      }

      if (inf.type === "hunter" && pinTarget) {
        const pinned = survivors.find(s => s.id === pinTarget);
        if (!pinned || pinned.isDead) {
          pinTarget = null;
        } else {
          nx = pinned.x; nz = pinned.z; isAttacking = true;
          if (Math.random() < 0.12) {
            const nhp = Math.max(0, pinned.hp - 6);
            patchSurvivor(pinned.id, nhp <= 0
              ? { hp: 0, isDead: true, isDowned: false, pinnedBy: null }
              : { hp: nhp, isDowned: true, pinnedBy: inf.id });
          }
          rot = Math.atan2(dx, dz);
          updated.push({ ...inf, x: nx, z: nz, rotationY: rot, isAttacking, alerted, pinTarget, grabTarget });
          anyChanged = true;
          continue;
        }
      }

      if (inf.type === "smoker" && grabTarget) {
        const grabbed = survivors.find(s => s.id === grabTarget);
        if (!grabbed || grabbed.isDead || dist < 1.6) {
          if (grabbed && dist < 1.6) {
            const nhp = Math.max(0, grabbed.hp - 8);
            patchSurvivor(grabbed.id, {
              grabbedBy: null,
              hp: nhp,
              isDowned: nhp < 20,
              isDead: nhp <= 0,
            });
          }
          grabTarget = null;
        } else {
          isAttacking = true;
          rot = Math.atan2(dx, dz);
          if (grabbed.isBot) {
            const pull = 2.6 * dt;
            patchSurvivor(grabbed.id, {
              x: grabbed.x - (dx / dist) * pull,
              z: grabbed.z - (dz / dist) * pull,
              grabbedBy: inf.id,
            });
          } else {
            patchSurvivor(grabbed.id, { grabbedBy: inf.id });
          }
          updated.push({ ...inf, rotationY: rot, isAttacking, alerted, pinTarget, grabTarget });
          anyChanged = true;
          continue;
        }
      }

      if (inf.type === "hunter" && dist < 2.0 && !best.isDowned && !best.pinnedBy) {
        pinTarget = best.id;
        isAttacking = true;
        patchSurvivor(best.id, { isDowned: true, pinnedBy: inf.id, downedTimer: 22 });
      } else if (inf.type === "smoker" && dist > 6 && dist < 16 && !best.grabbedBy && !best.isDowned) {
        grabTarget = best.id;
        patchSurvivor(best.id, { grabbedBy: inf.id });
      } else if (inf.type === "boomer" && dist < 2.2) {
        useL4DStore.getState().damageInfected(inf.id, inf.hp);
        continue;
      }

      const atkRange = inf.type === "tank" ? 2.2 : inf.type === "witch" ? 1.6 : inf.type === "hunter" ? 1.9 : 1.5;
      if (dist < atkRange && inf.type !== "hunter") {
        isAttacking = true;
        rot = Math.atan2(dx, dz);
        if (inf.type === "witch" && Math.random() < 0.2) {
          patchSurvivor(best.id, { hp: 0, isDowned: true, downedTimer: 22, isDead: false });
        }
      } else if (dist >= atkRange) {
        isAttacking = false;
        rot = Math.atan2(dx, dz);
        if (dist > 0.1) {
          nx += (dx / dist * spd + sepX) * dt;
          nz += (dz / dist * spd + sepZ) * dt;
          const clamped = clampL4DInfected(nx, nz);
          nx = clamped.x;
          nz = clamped.z;
        }
      }

      if (nx !== inf.x || nz !== inf.z || rot !== inf.rotationY || isAttacking !== inf.isAttacking || pinTarget !== inf.pinTarget || grabTarget !== inf.grabTarget || alerted !== inf.alerted) {
        anyChanged = true;
        updated.push({ ...inf, x: nx, z: nz, rotationY: rot, isAttacking, alerted, pinTarget, grabTarget, speed: spd });
      } else {
        updated.push(inf);
      }
    }

    if (anyChanged) useL4DStore.setState({ infected: updated });
    if (survivorPatches.size > 0) {
      useL4DStore.setState({
        survivors: useL4DStore.getState().survivors.map(s => survivorPatches.has(s.id) ? { ...s, ...survivorPatches.get(s.id) } : s),
      });
    }
  }

  crescendo() {
    useL4DStore.setState({ crescendoActive: true });
    this.crescendoTimer = 8;
    this.hordeCooldown = 0;
  }
}
