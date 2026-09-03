import { useL4DStore, type L4DInfected } from "../../stores/useL4DStore";
import { SpatialGrid } from "../zombie/SpatialGrid";
import { clampL4DInfected, getL4DZone, pickL4DZoneSpawn, L4D_ZONES } from "./l4dLayout";
import { hordeSeparationFromIds, L4D_HORDE_SEP } from "../zombie/hordeMovement";

export class L4DDirector {
  private grid = new SpatialGrid(6);
  private engineId = 0;
  private spawnQueue = 0;
  private spawnTimer = 0;
  private clearDelay = 0;
  private advancing = false;

  init() {
    this.grid.clear();
    this.engineId = Date.now();
    this.spawnTimer = 0;
    this.clearDelay = 0;
    this.advancing = false;
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
    }
  }

  private finishClear() {
    const more = useL4DStore.getState().unlockNextZone();
    this.advancing = false;
    this.clearDelay = 0;
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
      let nx = inf.x, nz = inf.z, rot = inf.rotationY;
      let isAttacking = inf.isAttacking;
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
  }
}
