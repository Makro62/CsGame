import { useL4DStore, type L4DInfected } from "../../stores/useL4DStore";
import { SpatialGrid } from "../zombie/SpatialGrid";
import { clampL4DInfected, getL4DZone, pickL4DZoneSpawn, L4D_ZONES } from "./l4dLayout";
import { hordeSeparationFromIds, L4D_HORDE_SEP } from "../zombie/hordeMovement";

const SPECIAL_TYPES = ["hunter", "smoker", "boomer", "tank", "witch"] as const;

const SPECIAL_STATS: Record<(typeof SPECIAL_TYPES)[number], { hp: number; speed: number }> = {
  hunter: { hp: 250, speed: 5.4 },
  smoker: { hp: 220, speed: 3.6 },
  boomer: { hp: 180, speed: 3.0 },
  tank: { hp: 1200, speed: 4.2 },
  witch: { hp: 400, speed: 4.8 },
};

export class L4DDirector {
  private grid = new SpatialGrid(6);
  private engineId = 0;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private clearDelay = 0;
  private advancing = false;
  private specialTimer = 12;

  init() {
    this.grid.clear();
    this.engineId = Date.now();
    this.spawnTimer = 0;
    this.clearDelay = 0;
    this.advancing = false;
    this.specialTimer = 12;
    const zone = getL4DZone(useL4DStore.getState().currentZone);
    this.spawnQueue = zone.zombieCount;
    useL4DStore.setState({
      zoneQuota: zone.zombieCount,
      zombiesRemaining: zone.zombieCount,
      infected: [],
      zoneBanner: zone.name,
    });
  }

  cleanup() {
    this.spawnQueue = 0;
    this.clearDelay = 0;
    this.advancing = false;
    this.specialTimer = 12;
  }

  setSurvivorPositions(_pos: { x: number; z: number }[]) {
    void _pos;
  }

  update(dt: number) {
    const st = useL4DStore.getState();
    if (st.isGameOver || st.isVictory) return;

    this.updateInfected(dt);

    if (this.spawnQueue > 0) {
      this.spawnTimer += dt;
      while (this.spawnQueue > 0 && this.spawnTimer >= 0.22) {
        this.spawnTimer -= 0.22;
        this.spawnZoneCommon();
        this.spawnQueue -= 1;
      }
      this.syncRemaining();
      return;
    }

    if (this.clearDelay > 0) {
      this.clearDelay -= dt;
      if (this.clearDelay <= 0) this.finishClear();
      return;
    }

    const alive = useL4DStore.getState().infected.filter(i => !i.isDead).length;
    this.syncRemaining();
    if (alive === 0 && this.spawnQueue === 0 && !this.advancing) {
      this.advancing = true;
      this.clearDelay = 1.35;
      const last = st.currentZone >= L4D_ZONES.length - 1;
      useL4DStore.getState().setZoneBanner(last ? "SEMUA WILAYAH AMAN" : "WILAYAH BARU TERBUKA");
      return;
    }

    if (alive > 0 && this.spawnQueue === 0 && !this.advancing) {
      this.specialTimer -= dt;
      if (this.specialTimer <= 0) {
        this.specialTimer = 10 + Math.random() * 6;
        this.spawnSpecial();
      }
    }
  }

  private finishClear() {
    const more = useL4DStore.getState().unlockNextZone();
    this.advancing = false;
    this.clearDelay = 0;
    this.specialTimer = 12;
    if (!more) return;
    const zone = getL4DZone(useL4DStore.getState().currentZone);
    this.spawnQueue = zone.zombieCount;
    this.spawnTimer = 0;
  }

  private syncRemaining() {
    const alive = useL4DStore.getState().infected.filter(i => !i.isDead).length;
    useL4DStore.getState().setZombiesRemaining(alive + this.spawnQueue);
  }

  private spawnZoneCommon() {
    const st = useL4DStore.getState();
    if (st.infected.filter(i => !i.isDead).length >= 42) return;
    const pos = pickL4DZoneSpawn(st.currentZone);
    const hp = 50 + st.currentZone * 12;
    const inf: L4DInfected = {
      id: `l4d_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type: "common",
      x: pos.x,
      y: 0,
      z: pos.z,
      hp,
      maxHp: hp,
      rotationY: Math.random() * Math.PI * 2,
      isDead: false,
      isAttacking: false,
      speed: 3.2 + st.currentZone * 0.15,
      alerted: true,
      pinTarget: null,
      grabTarget: null,
    };
    useL4DStore.getState().addInfected(inf);
  }

  private spawnSpecial() {
    const st = useL4DStore.getState();
    const alive = st.infected.filter(i => !i.isDead);
    if (alive.length >= 42) return;
    const type = SPECIAL_TYPES[Math.floor(Math.random() * SPECIAL_TYPES.length)];
    const stats = SPECIAL_STATS[type];
    const pos = pickL4DZoneSpawn(st.currentZone);
    const hp = Math.round(stats.hp * (1 + st.currentZone * 0.08));
    const inf: L4DInfected = {
      id: `l4d_sp_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type,
      x: pos.x,
      y: 0,
      z: pos.z,
      hp,
      maxHp: hp,
      rotationY: Math.random() * Math.PI * 2,
      isDead: false,
      isAttacking: false,
      speed: stats.speed,
      alerted: true,
      pinTarget: null,
      grabTarget: null,
    };
    useL4DStore.setState(s => ({
      infected: [...s.infected, inf],
      zoneBanner: type.toUpperCase(),
    }));
  }

  private updateInfected(dt: number) {
    const st = useL4DStore.getState();
    const survivors = st.survivors.filter(s => !s.isDead);
    if (survivors.length === 0) return;
    this.grid.clear();
    st.infected.forEach(i => { if (!i.isDead) this.grid.insert(i.id, i.x, i.z); });
    const updated: L4DInfected[] = [];
    let anyChanged = false;
    const unlocked = st.unlockedZones;

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
      let nx = inf.x, nz = inf.z;
      let rot: number;
      let isAttacking: boolean;
      const spd = inf.speed;

      const atkRange = 1.5;
      if (dist < atkRange) {
        isAttacking = true;
        rot = Math.atan2(dx, dz);
      } else {
        isAttacking = false;
        rot = Math.atan2(dx, dz);
        if (dist > 0.1) {
          nx += (dx / dist * spd + sepX) * dt;
          nz += (dz / dist * spd + sepZ) * dt;
          const clamped = clampL4DInfected(nx, nz, unlocked);
          nx = clamped.x;
          nz = clamped.z;
        }
      }

      if (nx !== inf.x || nz !== inf.z || rot !== inf.rotationY || isAttacking !== inf.isAttacking) {
        anyChanged = true;
        updated.push({ ...inf, x: nx, z: nz, rotationY: rot, isAttacking, speed: spd });
      } else {
        updated.push(inf);
      }
    }

    if (anyChanged) useL4DStore.setState({ infected: updated });
    this.applySpecialBehaviors(dt, survivors, updated);
  }

  private applySpecialBehaviors(
    dt: number,
    survivors: Array<{ id: string; x: number; z: number; isDead: boolean }>,
    updated: L4DInfected[],
  ) {
    const specials = updated.filter(i => !i.isDead && i.type !== "common");
    if (specials.length === 0) return;
    let changed = false;
    const bitten = new Map<string, { downed?: boolean; bileUntil?: number }>();

    for (const inf of specials) {
      if (inf.type === "hunter") {
        if (inf.pinTarget) {
          const target = survivors.find(s => s.id === inf.pinTarget);
          if (!target || target.isDead) {
            const idx = updated.findIndex(i => i.id === inf.id);
            if (idx >= 0) {
              updated[idx] = { ...inf, pinTarget: null };
              changed = true;
            }
            continue;
          }
          const dx = target.x - inf.x;
          const dz = target.z - inf.z;
          const dist = Math.hypot(dx, dz);
          if (dist > 1.2) {
            const idx = updated.findIndex(i => i.id === inf.id);
            if (idx >= 0) {
              updated[idx] = {
                ...inf,
                x: inf.x + (dx / dist) * 6.5 * dt,
                z: inf.z + (dz / dist) * 6.5 * dt,
              };
              changed = true;
            }
          }
          continue;
        }
        const near = nearestSurvivor(inf, survivors);
        if (near && distToNearest(inf, [near]) < 1.6) {
          const idx = updated.findIndex(i => i.id === inf.id);
          if (idx >= 0) {
            updated[idx] = { ...inf, pinTarget: near.id };
            changed = true;
          }
          bitten.set(near.id, { downed: true });
        }
        continue;
      }

      if (inf.type === "smoker") {
        if (inf.grabTarget) {
          const target = survivors.find(s => s.id === inf.grabTarget);
          if (!target || target.isDead) {
            const idx = updated.findIndex(i => i.id === inf.id);
            if (idx >= 0) {
              updated[idx] = { ...inf, grabTarget: null };
              changed = true;
            }
            continue;
          }
          const dx = target.x - inf.x;
          const dz = target.z - inf.z;
          const dist = Math.hypot(dx, dz) || 1;
          if (dist > 2) {
            const idx = updated.findIndex(i => i.id === inf.id);
            if (idx >= 0) {
              updated[idx] = {
                ...inf,
                x: inf.x + (dx / dist) * 1.4 * dt,
                z: inf.z + (dz / dist) * 1.4 * dt,
              };
              changed = true;
            }
          }
          continue;
        }
        const near = nearestSurvivor(inf, survivors);
        if (near && distToNearest(inf, [near]) < 14) {
          const idx = updated.findIndex(i => i.id === inf.id);
          if (idx >= 0) {
            updated[idx] = { ...inf, grabTarget: near.id };
            changed = true;
          }
        }
        continue;
      }

      if (inf.type === "boomer" && distToNearest(inf, survivors) < 1.4) {
        window.dispatchEvent(new CustomEvent("l4dBoomerPop"));
        const idx = updated.findIndex(i => i.id === inf.id);
        if (idx >= 0) {
          updated[idx] = { ...inf, isDead: true, hp: 0 };
          changed = true;
        }
        for (const s of survivors) {
          if (Math.hypot(s.x - inf.x, s.z - inf.z) < 6) {
            bitten.set(s.id, { bileUntil: Date.now() + 15000 });
          }
        }
      }
    }

    if (changed) useL4DStore.setState({ infected: [...updated] });
    if (bitten.size > 0) {
      useL4DStore.setState(s => ({
        survivors: s.survivors.map(sv => {
          const b = bitten.get(sv.id);
          if (!b) return sv;
          if (b.downed && !sv.isDead) {
            return {
              ...sv,
              isDowned: true,
              downedTimer: Math.max(sv.downedTimer, 18),
              pinnedBy: updated.find(i => i.pinTarget === sv.id)?.id ?? sv.pinnedBy,
            };
          }
          if (b.bileUntil) return { ...sv, bileUntil: b.bileUntil };
          return sv;
        }),
      }));
    }
  }
}

function nearestSurvivor(
  inf: L4DInfected,
  survivors: Array<{ id: string; x: number; z: number; isDead: boolean }>,
) {
  let best: { id: string; x: number; z: number; isDead: boolean } | null = null;
  let bestD = Infinity;
  for (const s of survivors) {
    if (s.isDead) continue;
    const d = Math.hypot(s.x - inf.x, s.z - inf.z);
    if (d < bestD) {
      bestD = d;
      best = s;
    }
  }
  return best;
}

function distToNearest(inf: L4DInfected, survivors: Array<{ x: number; z: number }>) {
  let best = Infinity;
  for (const s of survivors) {
    const d = Math.hypot(s.x - inf.x, s.z - inf.z);
    if (d < best) best = d;
  }
  return best;
}
