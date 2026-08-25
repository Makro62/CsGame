import { useL4DStore, L4DInfected, SpecialType } from "../../stores/useL4DStore";
import { SpatialGrid } from "../zombie/SpatialGrid";

// AI Director — paces the campaign like Left 4 Dead: BuildUp → Sustain → Relief
type DirectorPhase = "buildUp" | "sustain" | "relief" | "finale";

export class L4DDirector {
  private grid = new SpatialGrid(6);
  private phase: DirectorPhase = "buildUp";
  private phaseTimer = 0;
  private hordeCooldown = 25; // seconds between hordes
  private specialCooldown = 12;
  private intensity = 0;
  private survivorPositions: { x: number; z: number }[] = [];
  private engineId = 0;

  init() {
    this.phase = "buildUp";
    this.phaseTimer = 0;
    this.hordeCooldown = 25 + Math.random()*10;
    this.specialCooldown = 10;
    this.intensity = 10;
    this.grid.clear();
    this.engineId = Date.now();
  }

  setSurvivorPositions(pos: { x:number; z:number }[]) {
    this.survivorPositions = pos;
  }

  update(dt: number) {
    const st = useL4DStore.getState();
    if (st.isGameOver || st.isVictory) return;

    this.phaseTimer += dt;
    this.hordeCooldown -= dt;
    this.specialCooldown -= dt;

    // Intensity based on avg survivor HP + recent damage
    const avgHp = st.survivors.reduce((a,s)=>a+s.hp,0) / Math.max(1, st.survivors.length);
    const stress = 100 - avgHp; // low hp = high stress
    // Director tries to keep intensity oscillating
    let target = 30;
    if (this.phase === "buildUp") target = 70;
    if (this.phase === "sustain") target = 85;
    if (this.phase === "relief") target = 15;
    if (st.chapterState === "finale") target = 95;
    this.intensity = this.intensity * 0.97 + target * 0.03 + (stress * 0.05);
    this.intensity = Math.max(0, Math.min(100, this.intensity));
    useL4DStore.getState().setDirectorIntensity(this.intensity);
    useL4DStore.getState().setPanic(Math.min(100, st.panicLevel * 0.995 + (this.intensity > 70 ? dt*4 : 0)));

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
        this.hordeCooldown = 35 + Math.random()*25;
        this.phase = "relief"; this.phaseTimer = 0;
      } else {
        useL4DStore.getState().setHorde(true, t);
        // drip common infected during horde (capped, 5/s max)
        if (Math.random() < 0.08) this.spawnPanicCommon();
      }
    }

    // Special infected
    if (this.specialCooldown <= 0 && this.intensity > 25) {
      if (st.infected.filter(i=> !i.isDead && i.type!=="common").length < 3) {
        this.spawnSpecial();
        this.specialCooldown = 12 + Math.random()*12;
        if (st.chapterState === "finale") this.specialCooldown *= 0.7;
      }
    }

    // Witch / Tank rare
    if (this.phase === "sustain" && Math.random() < 0.002) {
      this.spawnSpecialType(st.chapterProgress < 0.5 ? "witch" : "tank");
    }

    // Update infected movement (common + specials chase nearest survivor)
    this.updateInfected(dt);
  }

  private triggerHorde() {
    const count = 12 + Math.floor(Math.random()*10) + (useL4DStore.getState().chapter-1)*4;
    useL4DStore.getState().setHorde(true, 22);
    useL4DStore.getState().setPanic(80);
    for (let i=0;i<count;i++) {
      setTimeout(()=> this.spawnCommonHorde(), i*180);
    }
    // panic music event
    if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("l4dHorde", { detail: { count }}));
  }

  private spawnCommonHorde() {
    const pos = this.randomSpawnAroundSurvivors(28, 38);
    this.spawnCommonAt(pos.x, pos.z);
  }
  private spawnPanicCommon() {
    const pos = this.randomSpawnAroundSurvivors(22, 32);
    this.spawnCommonAt(pos.x, pos.z);
  }
  private spawnCommonAt(x:number, z:number) {
    const st = useL4DStore.getState();
    if (st.infected.filter(i=>!i.isDead).length >= 42) return; // cap common
    const inf: L4DInfected = {
      id: `l4d_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type: "common", x, y:0, z, hp: 50, maxHp: 50, rotationY: Math.random()*Math.PI*2, isDead:false, isAttacking:false, speed: 3.2
    };
    useL4DStore.getState().addInfected(inf);
  }
  private spawnSpecial() {
    const pool: SpecialType[] = ["hunter","smoker","boomer"];
    const t = pool[Math.floor(Math.random()*pool.length)];
    this.spawnSpecialType(t);
  }
  private spawnSpecialType(type: SpecialType) {
    const pos = this.randomSpawnAroundSurvivors(type==="tank"||type==="witch" ? 18: 26, 36);
    const hpMap: Record<SpecialType, number> = { common:50, hunter:250, smoker:200, boomer:150, tank:3000, witch:800 };
    const spd: Record<SpecialType, number> = { common:3.2, hunter:4.5, smoker:3.0, boomer:2.8, tank:2.2, witch:3.8 };
    const inf: L4DInfected = {
      id: `l4d_${this.engineId}_${Date.now()}_${Math.random().toString(36).slice(2,6)}`,
      type, x: pos.x, y:0, z: pos.z, hp: hpMap[type], maxHp: hpMap[type], rotationY: 0, isDead:false, isAttacking:false, speed: spd[type]
    };
    useL4DStore.getState().addInfected(inf);
  }

  private randomSpawnAroundSurvivors(minR:number, maxR:number): { x:number; z:number } {
    const base = this.survivorPositions[0] ?? { x:0, z:0 };
    const ang = Math.random()*Math.PI*2;
    const r = minR + Math.random()*(maxR-minR);
    const ch = useL4DStore.getState().chapter;
    const scale = ch===1?1:ch===2?1.15:ch===3?1.35:1.5;
    const halfLen = 36 * scale;
    const halfW = 22;
    return {
      x: Math.max(-halfW, Math.min(halfW, base.x + Math.cos(ang)*r)),
      z: Math.max(-halfLen, Math.min(halfLen, base.z + Math.sin(ang)*r)),
    };
  }

  private updateInfected(dt: number) {
    const st = useL4DStore.getState();
    const survivors = st.survivors.filter(s=>!s.isDead);
    if (survivors.length===0) return;
    this.grid.clear();
    st.infected.forEach(i=> { if(!i.isDead) this.grid.insert(i.id, i.x, i.z); });
    const updated: L4DInfected[] = [];
    let anyChanged = false;
    for (const inf of st.infected) {
      if (inf.isDead) { updated.push(inf); continue; }
      // find nearest survivor
      let best = survivors[0]; let bestD = Math.hypot(inf.x - best.x, inf.z - best.z);
      for (const s of survivors) {
        const d = Math.hypot(inf.x - s.x, inf.z - s.z);
        if (d < bestD) { bestD = d; best = s; }
      }
      const dx = best.x - inf.x, dz = best.z - inf.z;
      const dist = Math.hypot(dx, dz);
      // separation
      let sepX=0, sepZ=0;
      this.grid.query(inf.x, inf.z, 2).forEach(nid=>{
        if(nid===inf.id) return;
        const o = st.infected.find(x=>x.id===nid); if(!o||o.isDead) return;
        const ndx = inf.x - o.x, ndz = inf.z - o.z, nd=Math.hypot(ndx,ndz);
        if(nd<1.4 && nd>0){ sepX += (ndx/nd)*(1.4-nd)*1.5; sepZ += (ndz/nd)*(1.4-nd)*1.5; }
      });
      let nx = inf.x, nz = inf.z, rot = inf.rotationY;
      const atkRange = inf.type==="tank"?2.2 : inf.type==="hunter"?1.9 : 1.5;
      if (dist < atkRange) {
        // attack survivor
        inf.isAttacking = true;
        // damage tick (handled in L4DMode loop via direct hp deduction)
        rot = Math.atan2(dx, dz);
      } else {
        inf.isAttacking = false;
        rot = Math.atan2(dx, dz);
        nx += (dx/dist * inf.speed + sepX) * dt;
        nz += (dz/dist * inf.speed + sepZ) * dt;
      }
      if (nx!==inf.x || nz!==inf.z || rot!==inf.rotationY || inf.isAttacking!== (inf as unknown as {isAttacking:boolean}).isAttacking) {
        anyChanged = true;
        updated.push({ ...inf, x: nx, z: nz, rotationY: rot, isAttacking: inf.isAttacking });
      } else {
        updated.push(inf);
      }
    }
    if (anyChanged) useL4DStore.setState({ infected: updated });
  }

  crescendo() {
    useL4DStore.setState({ crescendoActive: true });
    setTimeout(()=> useL4DStore.setState({ crescendoActive: false }), 8000);
    this.hordeCooldown = 0;
  }
}
