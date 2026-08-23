# Zombie Shooter Gameplay System — v1.0 Offline
**Target:** CsGame — Zombie Survival Mode (Full Offline)
**Tanggal:** 2026-08-23
**Arsitektur:** Single Source of Truth, Frame-rate Independence, Spatial Partitioning, Instanced Rendering

---

## 1. Arsitektur Sistem
```
ZombieSurvivalMode (React Component)
    ├── Zustand Store (useZombieStore - Single Source of Truth)
    ├── ZombieEngine (Game Logic + Wave + DOT)
    ├── SpatialGrid 5m (Collision O(1))
    ├── HitDetection (head/body sphere)
    ├── InstancedZombieRenderer (1 draw call / 100 zombies)
    ├── ZombieArcadeController (Top-Down Input)
    └── HUD/DownedOverlay (UI)
```
Principles: All logic runs offline in `requestAnimationFrame` 60Hz, store sync throttled, materials pooled.

---

## 2. State Management (Zustand) — `stores/useZombieStore.ts`
```ts
export type ZombieType = "walker"|"runner"|"tank"|"spitter"|"exploder"|"boss";
export type WaveState = "waiting"|"buy_phase"|"wave_active"|"wave_clear"|"game_over"|"extraction";
export type PowerUpType = "max_ammo"|"insta_kill"|"double_points"|"nuke"|"speed_cola"|"juggernog";
```
`ZombieState { id, type, x,y,z, rotationY, hp,maxHp, speed, damage, isDead, isAttacking, attackCooldown, animTime }`
`PlayerState { hp,maxHp, armor, points, isDowned, downedTimer, reviveProgress, activePowerUps: Map }`
`BarricadeState { id,x,z, health, planks,maxPlanks }`

Store methods: `setWaveState, setZombies, updateZombie, addPowerUp, updateBarricade, setPlayer, addPoints (double_points x2), resetGame`.

**START → FINISH:** `BARRICADES = [ b_start 0,-25 (START), b1 -5,-10, b2 5,-10, b3 -10,0, b4 10,0, b_finish 0,25 (FINISH)]` 
- START ring `0,-30` hijau, FINISH circle `0,30` (kuning available, hijau extraction).

---

## 3. Zombie Engine — `game/zombie/ZombieEngine.ts`
`ZOMBIE_CFG: walker 100/2.0/10, runner 80/4.5/8, tank 400/1.5/20, spitter 120/2.5/12, exploder 60/3.0/50, boss 2000/1.8/35`
- `startWave(wave): count = (6+wave*3)*scale (1+(wave-1)*0.15), interval = max(400,2000-wave*80)`
- `update(dt): spawnQueue drip, grid clear+insert, updateZombie per z, toRemove after 3s, sync store`
- `updateZombie: separation via grid query 2m, barricade block <2m, move spd*dT + sep, attack <1.5m kd 1.0, spitter acid 3s/5dps, exploder 2.5m suicide`
- `handleShoot(origin,dir,dmg,isHeadshot): raycast grid, insta_kill, points, 5% powerUp drop`

---

## 4. Spatial Grid — `game/zombie/SpatialGrid.ts`
`cellSize 5, key = floor(x/cellSize), insert, query(radius) -> Set<string>, clear`. O(1) query vs O(N²).

---

## 5. Hit Detection — `game/zombie/HitDetection.ts`
`HITBOX head/body sphere per type`, `raycastZombies(origin,dir,maxDist,zombies,obstacles) -> HitResult {zombieId,isHeadshot,point}` with obstacle Box3 blocking.

---

## 6. Barricade — `game/zombie/Barricade.tsx`
`planks/maxPlanks 6, health, mesh box 2.2x2.4, plank 0.6x0.15`. Repair via `F` near barricade cost 10 pts.

---

## 7. PowerUp Renderer — `game/zombie/PowerUpRenderer.tsx`
`COLORS: max_ammo gold, insta_kill red, double_points green, nuke orange, speed_cola cyan, juggernog pink`
`octahedron 0.3 + emissive + pointLight 2 + ring 0.4-0.6`, `useFrame y=0.5+sin(t*3)*0.2, rot y=t*2`

---

## 8. Instanced Renderer — `game/zombie/InstancedZombieRenderer.tsx`
`COLORS walker 0x5a7a28 etc, MAX 100, InstancedMesh box 0.6x1.5x0.4, dummy Object3D, setMatrixAt + setColorAt, count = alive`. **1 draw call vs 60 meshes**.

---

## 9. Downed Overlay — `ui/hud/DownedOverlay.tsx`
Fixed fullscreen `bg-black/70`, `DOWNED` red pulse, `Revive in Xs`, `progress bar`, `Hold F 500 pts`.

---

## 10. Integration — `screens/ZombieSurvivalMode.tsx`
- `BARRICADES 6 termasuk START/FINISH`, `engine init + setBarricades`, `requestAnimationFrame 60Hz loop + proximity powerUp collect <2.5m + extraction 15s timer + downed 30s bleedout`
- `Canvas: fog #0a0f14 40-90, Physics gravity -9.81, Ground 120 + corridor 8x70, START ring 3m, FINISH circle 5m, pointLights`
- `HUD: Wave/Points/HP/Armor/Zombies, extraction ready, wave_active`
- Hold `F` near barricade = repair, hold `F` when downed = revive 500 pts (progress 0-1).

---

## 11. Controller — `game/player/ZombieArcadeController.tsx`
Top-down: `WALK 4 SPRINT 7 BOUNDS -59, raycaster ground Plane, posRef 0,-30, yaw atan2(dx,dz), move normalized * speed*dt, setPlayerPos → engine, camera lerp 0.1 lookAt, broadcast __zombieAim {origin,direction,yaw,pos}`. Offline only, no Rapier KinematicCharacterController needed (simplified).

---

## 12. Shooting — `game/weapons/ZombieShootingSystem.tsx`
`mousedown left -> get __zombieAim, damage awp 150 else 35, headshot 15% random, engine.handleShoot(origin,dir,damage,isHeadshot)`. No ammo/network check offline.

---

## 13. Performance Checklist (Before→After)
| Area | Before | After | How |
|---|---|---|---|
| Zombie collision | O(N²) loops | O(1) grid query | SpatialGrid |
| Rendering | 60 meshes | 1 InstancedMesh | InstancedMesh MAX 100 |
| Store sync | every frame | every tick | engine update only |
| Materials | per zombie | shared pool | reuse |
| Anim hooks | 60 useFrame | 1 useFrame | single loop |

---

## 14. File Structure (Offline)
```
client/src/
├── screens/ZombieSurvivalMode.tsx (rewrite)
├── game/zombie/
│   ├── ZombieEngine.ts (new)
│   ├── SpatialGrid.ts (new)
│   ├── HitDetection.ts (new)
│   ├── Barricade.tsx (new)
│   ├── PowerUpRenderer.tsx (rewrite)
│   └── InstancedZombieRenderer.tsx (new)
├── game/player/ZombieArcadeController.tsx (rewrite)
├── game/weapons/ZombieShootingSystem.tsx (new)
├── ui/hud/DownedOverlay.tsx (rewrite)
└── stores/useZombieStore.ts (rewrite)
HAPUS: server/, useNetworkStore, useZombieNetworkStore, useNetwork, config/network, ServerPredictionManager
```

---

## 15. Dokumen Terkait
- `ZOMBIE_MODE.md` → sinkronkan ke WaveState offline ini.
- `Game_Design_Document.md` v3.1 → tambah link ke dokumen ini.
- `IMPROVEMENTS_AND_FIXES_AUDIT.md` → P0.3 Spatial Grid ✅, P1.2 InstancedMesh ✅.
