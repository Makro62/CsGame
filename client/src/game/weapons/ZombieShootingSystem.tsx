// Arcade shooting for Zombie Shooter + L4D — offline only
// Uses useAimStore (single source) instead of window globals.
import { useCallback, useEffect } from "react";
import { WEAPONS } from "@cs-game/shared";
import { useWeaponStore } from "../../stores/useWeaponStore";
import { useAimStore } from "../../stores/useAimStore";
import { useGameStore } from "../../stores/useGameStore";
import { zombieEngine } from "../zombie/ZombieEngine";
import { useL4DStore } from "../../stores/useL4DStore";
import { Sound } from "../../components/AudioManager";

export function ZombieShootingSystem({ engineRef }: { engineRef?: React.RefObject<typeof zombieEngine | null> }) {
  const shoot = useCallback(() => {
    const ws = useWeaponStore.getState();
    const weapon = ws.activeWeapon;
    if (!weapon || !ws.canFire()) return;
    if (ws.isReloading || ws.isSwitching) return;

    const aim = useAimStore.getState();
    const stats = (WEAPONS as Record<string, { dmg?: number; headshot?: number }>)[weapon];
    const dmg = stats?.dmg ?? 35;
    const headDmg = stats?.headshot ?? dmg * 2;
    const isHead = Math.random() < 0.18;

    Sound.gunshot(weapon);
    ws.incrementBullets();
    ws.setLastFireTime(performance.now());
    useGameStore.getState().triggerShoot();

    const mode = useGameStore.getState().mode;
    if (mode === "l4d") {
      // L4D: damage nearest infected in facing cone
      const l4d = useL4DStore.getState();
      const pos = aim.pos;
      let best: (typeof l4d.infected)[0] | null = null;
      let bestDist = Infinity;
      for (const inf of l4d.infected) {
        if (inf.isDead) continue;
        const dx = inf.x - pos.x, dz = inf.z - pos.z;
        const d = Math.hypot(dx, dz);
        if (d > 45 || d >= bestDist) continue;
        const dot = (dx / d) * aim.direction.x + (dz / d) * aim.direction.z;
        if (dot > 0.78) { bestDist = d; best = inf; }
      }
      if (best) {
        const dmgVal = isHead ? headDmg : dmg;
        const nhp = best.hp - dmgVal;
        useL4DStore.setState({
          infected: l4d.infected.map(x => x.id === best!.id ? (nhp <= 0 ? { ...x, isDead: true, hp: 0 } : { ...x, hp: nhp }) : x),
        });
      }
    } else {
      const engine = engineRef?.current ?? zombieEngine;
      engine.handleShoot(aim.origin.clone(), aim.direction.clone(), dmg, isHead);
    }
  }, [engineRef]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const mode = useGameStore.getState().mode;
      if (mode !== "zombie" && mode !== "l4d") return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag !== "CANVAS") return;
      const ws = useWeaponStore.getState();
      // auto reload on empty
      if (
        ws.activeWeapon &&
        !["knife", "combatknife", "he", "smoke", "flash"].includes(ws.activeWeapon) &&
        ws.currentAmmo === 0 && !ws.isReloading && !ws.isSwitching
      ) {
        Sound.dryFire();
        ws.startReload();
        return;
      }
      shoot();
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [shoot]);

  // Auto fire while held
  useEffect(() => {
    let held = false;
    let raf = 0;
    const loop = () => {
      if (held) shoot();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    const onDown = (e: MouseEvent) => { if (e.button === 0) held = true; };
    const onUp = (e: MouseEvent) => { if (e.button === 0) held = false; };
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
    };
  }, [shoot]);

  return null;
}
