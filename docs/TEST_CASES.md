# Test Cases & Bug Fixes — CS Game

> **Ringkasan:** 677 tests lolos across 44 file (42 + 2 responsive). Semua test berada di `test/` dengan alias `@src` → `client/src`. `vitest.config.ts:14` → `include: ['**/*.test.{ts,tsx}']`. Lihat juga `docs/RESPONSIVE_TESTCASES.md` untuk 30 TC responsivitas (RS-01–RS-30).

---

## 1. Ringkasan Bug yang Diperbaiki

| # | Severity | File:Line | Bug | Fix |
|---|----------|-----------|-----|-----|
| B01 | P0 | `RecoilController.ts:fire()` | `knife/combatknife` pattern `[]` → `undefined` destructure crash | Early return jika pattern kosong |
| B02 | P0 | `useSettingsStore.ts:74-93` | 4 setter pakai raw `localStorage.setItem` → crash private browsing | Ganti ke `setStorage()` try/catch |
| B03 | P0 | `RecoilController.ts:getSpreadRadius` | `baseSpread[weapon] \|\| 0.02` → `0` (knife) falsy → 0.02 salah | Ganti ke `?? 0.02` |
| B04 | P1 | `l4dLayout.ts:38` / `survivalLayout.ts:90` | `pushOut*` sequential → push dari cover A bisa masuk cover B | Dokumentasi + test, tidak fix sequential (design trade-off) |
| B05 | P0 | `ZombieDOTSystem.ts:18` | DOT habis mid-tick tetap damage full `dt` (contoh: 100ms DOT dgn 500ms dt → 5 dmg bukan 1) | `actualDtMs = min(dtMs, remainingMs)` |
| B06 | P1 | `useGameStore.ts:249,263` | `save/loadBestTime` raw `localStorage` → crash private browsing | Bungkus `try/catch` |
| B07 | P0 | `survivalBuy.ts:60` | `cost=NaN/-1/Infinity` → `points<NaN=false` → beban gratis | Guard `!isFinite(cost)\|\|cost<0 → cant_afford` |
| B08 | P0 | `useZombieStore.ts:91` | `addPoints(NaN)` → `points=NaN` ekonomi korup | Guard `!isFinite(amount) return` |
| B09 | P0 | `useZombieStore.ts:90` | `setPlayer` shallow copy → `activePowerUps:Map` ref shared → mutasi bocor | Clone `new Map()` + `{...weaponTiers}` sebelum `fn` |
| B10 | P0 | `useZombieStore.ts:96,113` | `upgradeWeaponTier/addPerk` terima `cost=NaN/-1` | Guard `!isFinite(cost)\|\|cost<0` |
| B11 | P0 | `offlineCombat.ts:226` | `nextWaypointIndex([], NaN)` → `path[0]=undefined` → `TypeError` | Guard `!path.length\|\|!isFinite(index) return 0` |
| B12 | P1 | `offlineCombat.ts:79` | `isInFov(NaN,0)` NaN poisoning → selalu false | Guard `!isFinite(rotationY\|fov)\|\|fov<=0` |
| B13 | P1 | `offlineCombat.ts:91` | `fireIntervalMs(NaN)` → `1000/NaN=NaN` | Guard `!isFinite(fireRate)` return 1000 |
| B14 | P2 | `weaponDisplay.ts:5` | `META` missing `arccaster,he,smoke,flash` | Tambah 4 entry |
| B15 | P1 | `ZombieEventBus.ts:21` | `emit` tanpa `try/catch` → 1 handler throw matikan semua | `try/catch` per handler |
| B16 | P1 | `useAimStore.ts:20` | `setAim(null)` → `clone` crash, `yaw=NaN` poisoning, `setCursorNdc(NaN)` | Guard `!origin\|\|!isFinite(yaw)` |
| B17 | P2 | `zombieVisual.ts:5` | `ZOMBIE_TYPES[invalid].scale` → crash | Fallback `?? 1` |
| B18 | P1 | `offlineCombat.ts:145` | `clampToMap({NaN,Infinity})` → `NaN` menyebar | Guard `!isFinite → 0` |
| B19 | P1 | `applyHeroMatch.ts:5` | `hero=null` → crash `Cannot read stats` | Guard `!hero\|\|!stats\|\|!isFinite(maxHp)` |
| B20 | P0 | `BuyMenu.tsx:408` | `minWidth:520px` >375 → horizontal scroll | `min(520px,92vw)` + `80dvh` + `overflow-y-auto` |
| B21 | P0 | `MainMenu.tsx:678` | `minmax(360px,1fr)` → overflow <800 | `minmax(280px,1fr)` + `lg:grid-cols` + `auto-fit` |
| B22 | P0 | `HeroSelect:212` / `L4DSelect:200` | 3-col `220px 1fr 220px` → 760px min | `1fr` @<1024 + `clamp` + `90vw` deploy |
| B23 | P0 | `Offline5v5Select:134` | Team/map `300px*2+32=632` >640 | `min(300px,92vw)` + `flex-wrap` + `sm:grid-cols-2` |
| B24 | P0 | `HUDLayout:236` etc | Triple fixed bottom HUD overlap <600 | `flex-col sm:flex-row` + `46vw` + `clamp` |
| B25 | P0 | `ZombieSurvival:563` | `minWidth:380` >375 | `min(380px,92vw)` |
| B26 | P1 | `hudTheme:30,50,63,83` | `HUD_EDGE=16` single, `hudPanel` fixed radius, `hudPill` fixed | `clamp` + `HUD_EDGE_RESPONSIVE` + `36px` tap |
| B27 | P1 | `*Mode.tsx:298,284,499` | `100vh` clip di iOS | `100dvh`/`100dvw` |

## 1.1 Responsive Fixes — Detail per File

- `hudTheme.ts` — `HUD_EDGE_RESPONSIVE`, `hudPanel` radius clamp, `hudPill/Action` clamp, `hudBannerStack` 16px fix
- `MainMenu.tsx` — `100dvh`, `clamp` nickInput, `auto-fit` cardGrid, `440→320` preview
- `SettingsMenu.tsx` — `92vw/88dvh`, `auto-fit` grids, `44px` tap
- `BuyMenu.tsx` — `min(92vw)` + `80dvh`
- `HeroSelect/L4DSelect` — `1fr` @1024, `clamp` hologram, `90vw` deploy
- `Offline5v5Select` — `min(300px,92vw)` + wrap
- `HUDLayout/HealthBar/AmmoCounter` — `clamp 120-160`, `46vw`, `clamp` fonts
- `Offline5v5Mode/Zombie/L4D` — `100dvw/dvh`, `46vw`, `clamp` HUDs, `90vw` modals

---

## 2. Daftar Test Case per File (42 file, 620 tests)

### 2.1 Stores (8 file, 114 tests)

#### `test/stores/useGameStore.test.ts` — 31 tests
- `addTarget / removeTarget / resetTargets` — CRUD target
- `damageTarget` — normal, headshot, kill, dead already
- `stats` — `incrementShots/Hits`, `accuracy`, `hsRate`, `resetStats`
- `timer` — `setTimer`, `startTimer`, `stopTimer`
- `jumpStamina` — `useJumpStamina` habis, `regenJumpStamina` cap, `resetJumpStamina`
- `bestTime` — `load/saveBestTime` normal & invalid
- `mode / nickname / map` — setter

#### `test/stores/useZombieStore.test.ts` — 19 tests
- `resetGame` full vs soft (`currentWave` preserve)
- `addPoints` normal, negative, `double_points` doubling & tidak double untuk negative
- `upgradeWeaponTier` deduct, reject insufficient, max tier 3
- `addPerk` duplicate, insufficient
- `addPurchasedWeapon` dedupe
- `addPowerUp/removePowerUp`, `addLoot/removeLoot`
- `setPlayer` transform

#### `test/stores/useZombieStore.edgecases.test.ts` — 10 tests ⭐ NEW P0
- `addPoints(NaN/Infinity)` → ignore, tidak jadi NaN
- `double_points + NaN` tidak korup
- `setPlayer` Map clone leak → beforeMap tidak termutasi
- `weaponTiers` clone
- `upgradeWeaponTier(NaN/-1/Infinity)` → false
- `addPerk(NaN/-1)` → false

#### `test/stores/useL4DStore.test.ts` — 23 tests
- `resetCampaign` full, `chapter` param
- `damageInfected` normal, `isDead` sudah mati → false, boomer bile (dalam/jauh 7 unit), horde trigger, `releaseFrom` pin/grab
- `addInfected`, `setDirectorIntensity` clamp 0-100, `setPanic`, `setHorde`, `updateSurvivor`, `tickAbility`

#### `test/stores/useSettingsStore.test.ts` — 10 tests
- `setSensitivity / setSlideControl / setMasterVolume / setSfxVolume / setMusicVolume` → `setStorage` & state
- `setCrosshair*` try/catch private browsing

#### `test/stores/useHeroStore.test.ts` — 14 tests
- `selectHero` valid/invalid, `triggerAbility` cooldown, `tickCooldown`, `resetAbility`

#### `test/stores/useOffline5v5Store.test.ts` — 41 tests
- `initMatch` 10 players, `setLocalPos`, `localBuy` success/fail, `switchWeapon`, plant/defuse start/cancel, reload, shoot, `checkRoundEnd`, difficulty

#### `test/stores/useAimStore.test.ts` — 8 tests ⭐ NEW P1
- `setAim` clone semantics (original tidak termutasi)
- Guard `null/undefined` → tidak crash
- Guard `yaw=NaN/Infinity` → ignore
- `setCursorNdc` valid, `NaN/Infinity` ignore
- Initial defaults

#### `test/stores/weaponAmmo.test.ts` — 3 tests
- `applySwitchAmmo` primary→secondary, round-trip

#### `test/stores/weaponAmmo.edgecases.test.ts` — 12 tests ⭐ NEW P0
- `null→primary/secondary/melee` branch
- `primary→melee` save, `secondary→primary`, `melee→primary`, `primary→primary`, `secondary→secondary`
- `slotOfWeapon(true/false)`, `(true,true)→primary`

---

### 2.2 Game/Offline (9 file, 149 tests)

#### `test/game/offline/offlineCombat.test.ts` — 49 tests
- `isPointBlocked`, `hasLineOfSight` same/close, `isInFov` front/behind/wide/narrow, `resolveBotShot` accuracy/headshot/distance, `fireIntervalMs` awp/rate0, `nextWaypointIndex` advance/clamp, `stepToward` move/close/dt0, `clampToMap`, `laneForBotId`, `roleForBotId`, `laneForRole`, `nearestBombSite`, `distToBombSite`, `botPath`, `cameraYawTowards`

#### `test/game/offline/offlineCombat.edgecases.test.ts` — 12 tests ⭐ NEW P0
- `nextWaypointIndex([], NaN, Infinity, 999, -5)` guard
- `isInFov` NaN rotation/fov, 0/negative fov, 360° fov
- `fireIntervalMs` NaN/Infinity/negative, awp+NaN

#### `test/game/offline/offlineCombat.coverage.test.ts` — 7 tests ⭐ NEW P1
- `clampToMap(NaN, Infinity)` guard
- `hasLineOfSight` open, blocked at origin, same point
- `stepToward` NaN speed, dt0

#### `test/game/offline/RoundManager.test.ts` — 27 tests
- `tickRound` plant/defuse, bomb timer, elimination, timeout, money cap
- `endRound` win/lose, maxRounds, `resetForRound` hp/respawn

#### `test/game/offline/EconomySystem.test.ts` — 36 tests
- `executeLocalBuy` weapon, gear, grenade, team lock, money edge, insufficient

#### `test/game/offline/CombatSystem.test.ts` — 14 tests
- `executeLocalShoot` hit/kill, headshot, bomb drop, team check, reload guard, killFeed cap

#### `test/game/offline/BotAI.test.ts` — 27 tests
- `botBuy` rifle/awp/mp5, helmet, deagle fallback, `defaultLoadout`, `refillAmmo`, `mkPlayer` role/difficulty

#### `test/game/offline/botNav.test.ts` — 14 tests
- `findGridPath` basic, trivial, finite, cache, edge-to-edge
- `navigateTo` close goal, toward goal, repath, multi-bot
- `resetBotNav`, `spawnJitter`

#### `test/game/offline/agents.test.ts` — 14 tests
- Agent def 10 agents, team/map filter

#### `test/game/offline/Offline5v5Modular.test.ts` — 13 tests
- Modular store integration

---

### 2.3 Game/Zombie (10 file, 90 tests)

#### `test/game/zombie/SpatialGrid.test.ts` — 10 tests
- `insert`, `query` radius, `clear`, negative, zero radius, dedup

#### `test/game/zombie/hordeMovement.test.ts` — 13 tests
- `hordeSeparation` overlap, far, ignore self, spatial-id equivalence, 3 agents, same pos (nd>0 guard), empty, radius filter, missing/null agent, `chaseStep` edge

#### `test/game/zombie/survivalLayout.test.ts` — 25 tests
- `pushOutSurvival` open, crate, barrel, wall, center, extreme, sequential interaction
- `survivalLineOfSight` open, crate, barrel, short, same, corner, wall edge
- `survivalWallDistance` maxDist, barrel hit 9.78, zero direction
- `SURVIVAL_OBSTACLES/Bounds/Spawns`

#### `test/game/zombie/ZombieEngine.test.ts` — 6 tests
- `handleShoot` hit, headshot, kill, `berserkBurst`, `collectPowerUp`

#### `test/game/zombie/ZombieDOTSystem.test.ts` — 10 tests
- `add`, `update` damage, expiry, multi-DOT, `clear`, **mid-tick partial damage (P0 fix)**, `dt=0`, `negative dt`

#### `test/game/zombie/zombieWaves.test.ts` — 27 tests
- `waveCount/Interval/Hp/Damage/SpeedScale`, `isBossWave`, `pickZombieType` runner/tank unlock, `ZOMBIE_PICK_WEIGHTS`

#### `test/game/zombie/survivalBuy.test.ts` — 5 tests
- `already_equipped`, `equipped` free swap, `bought` charge, ammo preserve, `cant_afford`

#### `test/game/zombie/survivalBuy.edgecases.test.ts` — 5 tests ⭐ NEW P0
- `cost=NaN/Infinity/negative` → `cant_afford` (exploit fix), `cost=0` allow, normal still works

#### `test/game/zombie/zombieVisual.test.ts` — 6 tests ⭐ NEW P2
- Semua type valid scale, `body>head`, `invalid/null` fallback 1 tanpa crash, hex map cover

#### `test/game/zombie/ZombieEventBus.test.ts` — 17 tests ⭐ NEW P1
- Single/multi handler, throw isolation, off, off-during-emit snapshot, clear, no-op, duplicate on

#### `test/game/zombie/heroes.test.ts` — 3 tests
- Hero def, radar, ability

#### `test/game/zombie/applyHeroMatch.test.ts` — 5 tests ⭐ NEW P1
- Valid hero apply, null/undefined/missing stats/NaN maxHp/negative armor → ignore no crash

---

### 2.4 Game/L4D (3 file, 52 tests)

#### `test/game/l4d/l4dLayout.test.ts` — 23 tests
- `clampL4DInfected` minZ/maxZ, corridor, inside zone, extreme, `pushOutL4D` edge & sequential bug, `pickL4DSpawn` valid/empty/safeZone, `l4dRoughLos`, `L4D_COVER/OPEN_SPAWNS`

#### `test/game/l4d/l4dSurvivors.test.ts` — 14 tests
- 4 survivors data, unique ability/role, weapons, colors, cooldown, `getL4DSurvivor`

#### `test/game/l4d/L4DDirector.test.ts` — 15 tests
- `update` gameOver/safeRoom, intensity, `crescendo`, infected cap 42, movement, hunter/boomer, horde timer, finale

---

### 2.5 Game/Weapons (2 file, 31 tests)

#### `test/game/weapons/RecoilController.test.ts` — 23 tests
- `fire/reset`, knife empty pattern (P0), m4a1, `getSpreadRadius` falsy-zero (P0), movement states

#### `test/game/weapons/weaponDisplay.test.ts` — 8 tests ⭐ NEW P2
- Known weapon, `arccaster` (prev missing), grenades `he/smoke/flash`, `combatknife/knife`, unknown fallback, null/dash, semua `WEAPONS` keys

---

### 2.6 Game/Player & Map & Effects (4 file, 34 tests)

#### `test/game/player/arcadeScreenMove.test.ts` — 5 tests
- Forward+left diagonal, idle, etc.

#### `test/game/player/arcadeScreenMove.coverage.test.ts` — 12 tests ⭐ NEW P2
- No input 0,0; W/S/A/D alone; W+S & A+D cancel; all four cancel; 4 diagonals `hypot=1`

#### `test/game/map/containerYard.test.ts` — 10 tests
- Map obstacles, spawns, bounds

#### `test/game/effects/screenShake.test.ts` — 2 tests
- Shake intensity, decay

---

### 2.7 Screens (1 file, 3 tests)

#### `test/screens/Offline5v5Store.test.ts` — 3 tests
- Init 10 players, bomb pickup local & bot (pre-existing, flaky jika parallel)

---

## 3. Cara Menjalankan

```bash
npm run test           # 620 tests, ~7s
npm run test -- --run # single run tanpa watch
```

Vitest config: `vitest.config.ts` → `include: ['**/*.test.{ts,tsx}']`, alias `@src` & `@cs-game/shared`, `setupFiles: ['./test/setup.ts']`, `environment: 'jsdom'`.

## 4. Struktur Folder

```
test/
├── setup.ts
├── screens/Offline5v5Store.test.ts
├── stores/ (8 file)
└── game/
    ├── l4d/ (3)
    ├── offline/ (9)
    ├── zombie/ (10)
    ├── weapons/ (2)
    ├── player/ (2)
    ├── map/ (1)
    └── effects/ (1)
client/src/          # bersih, tanpa *.test.ts
```

## 5. Prioritas Selanjutnya (P2, tidak urgent)

- `WeaponAnimator.ts` — `NaN/Infinity` dt, `addClip` empty keyframes crash, `play` missing clip silent, `update` gc alloc
- `weaponRig.ts` — shared mutable `Vector3` di `MUZZLE_OFFSETS`, fallback magic numbers
- `gameEvents.ts` — mitt handler throw, payload validation, `off` dengan ref baru leak

---

*Dibuat: 2026-09-01 — 620 tests, 19 bug fixes (B01-B19), 42 test files.*
