# Web-Based FPS Game Design & Implementation Plan (CS:GO / Valorant Tactical Shooter)

**Version:** v3.0 — CS:GO Aligned  
**Status:** Design Complete — Ready for Implementation  
**Last Updated:** 2026-08-13  
**Design Philosophy:** Tactical 5v5 Bomb Defusal with Competitive Integrity

---

## 🎯 Executive Summary

A competitive web-based First-Person Shooter inspired by **CS:GO's tactical gameplay** and **Valorant's ability-driven combat**, built for modern browsers. This document serves as the **single source of truth** for all game mechanics, systems, and implementation guidelines.

### Core Identity
- **Genre:** Tactical FPS (5v5 Bomb Defusal)
- **Platform:** Web Browser (WebGL + WebSocket)
- **Tick Rate:** 30 tick/server (optimized for web)
- **Target FPS:** 60 FPS (minimum 30 FPS on low-end devices)
- **Player Count:** 5v5 (max 10 players per match)
- **Round Time:** 1 minute 55 seconds
- **Match Format:** First to 8 wins (15 rounds max, OT at 7-7)

---

## 🎮 Core Gameplay Pillars

### 1. Tactical Movement (Precision Over Speed)
Unlike arcade shooters, movement is **deliberate and punishable**:
- **No momentum-based mechanics** (slide-hop, strafe-hop removed for competitive integrity)
- **Accuracy penalty while moving** (encourages counter-strafing)
- **Crouch for precision** (reduces spread, lowers profile)
- **Shift-walk for silence** (reduces footstep audio range)

### 2. Economic Strategy (Buy Phase System)
Every round starts with a **15-second Buy Phase**:
- Earn money from kills, round wins, and objective completion
- Manage team economy (force buy, eco round, full buy)
- Purchase weapons, armor, and utility grenades
- **Max money cap: $16,000**

### 3. One-Life Per Round (High Stakes)
- **No respawns during active round** (death = spectate until next round)
- **Team elimination** is a win condition
- **Trade kills** require coordination and timing

### 4. Weapon Mastery (Recoil Control & Spray Patterns)
- **Deterministic recoil patterns** (learnable spray control)
- **First-shot accuracy** when stationary
- **Weapon switch penalties** (deploy/undeploy time)
- **Wall penetration** (specific materials, damage falloff)

### 5. Utility-Based Combat (Grenades & Abilities)
- **Smoke Grenades:** Block lines of sight
- **Flashbangs:** Blind enemies facing the explosion
- **HE Grenades:** Area damage with self-damage risk
- **Tactical positioning** over raw aim

---

## 📋 Table of Contents

1. [Game Loop & Match Flow](#game-loop--match-flow)
2. [Round Structure](#round-structure)
3. [Economy System](#economy-system)
4. [Movement System](#movement-system)
5. [Weapon Mechanics](#weapon-mechanics)
6. [Combat & Damage](#combat--damage)
7. [Bomb Defusal Mode](#bomb-defusal-mode)
8. [Grenades & Utility](#grenades--utility)
9. [Map Design](#map-design)
10. [Audio System](#audio-system)
11. [Networking & Anti-Cheat](#networking--anti-cheat)
12. [UI & HUD](#ui--hud)
13. [Spectator System](#spectator-system)
14. [Settings & Accessibility](#settings--accessibility)

---

## 🔁 Game Loop & Match Flow

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Main Menu   │ ──► │ Matchmaking  │ ──► │ Warmup      │
│ (Nickname)  │     │ (5v5 Queue)  │     │ (Optional)  │
└─────────────┘     └──────────────┘     └──────┬──────┘
                                                 │
                                                 ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ Match End   │ ◄── │ Round 15     │ ◄── │ Round 1     │
│ (Victory/   │     │ (OT if 7-7)  │     │ (Pistol     │
│  Defeat)    │     └──────────────┘     │  Round)     │
└──────┬──────┘                          └─────────────┘
       │
       ▼
┌─────────────┐
│ Return to   │
│ Main Menu   │
└─────────────┘
```

### Match Flow States
1. **Main Menu:** Enter nickname, select game mode
2. **Matchmaking:** Join/create room (Colyseus `joinOrCreate`)
3. **Warmup (Optional):** 2-minute practice before match
4. **Round Loop:** 15 rounds maximum (first to 8 wins)
5. **Overtime:** Triggered at 7-7 (first to 9, sudden death at 8-8)
6. **Match End:** Victory/defeat screen with stats
7. **Return:** Back to main menu

**Reference:** [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-1-game-loop-inti)

---

## ⏱️ Round Structure

| Phase | Duration | Rules |
| :--- | :--- | :--- |
| **Freeze Time** | 0s (removed in MVP) | Players frozen at spawn (CS:GO style: optional) |
| **Buy Phase** | 15s | Purchase weapons/armor/utility in Buy Zone |
| **Active Round** | 115s (1m 55s) | Combat, bomb plant/defuse, elimination |
| **Round End** | 4s | Score update, kill feed, free cam |

### Round Win Conditions

**Terrorists (T) Win When:**
- Bomb explodes after successful plant
- All Counter-Terrorists eliminated
- Timer expires with bomb planted

**Counter-Terrorists (CT) Win When:**
- Bomb defused successfully
- All Terrorists eliminated
- Timer expires without bomb plant

### Overtime Rules
- **Trigger:** Score 7-7 after 14 rounds
- **Format:** Maximum 2 overtime rounds (first to 9 wins)
- **Sudden Death:** If 8-8 after OT, final round determines winner
- **Loadout:** Full buy granted (no buy phase in sudden death)

**Reference:** [Design_Gameplay.md](docs/Design_Gameplay.md#2-mode-bomb-defusal-5v5-cs-go-style)

---

## 💰 Economy System

### Starting Money
- **Pistol Round (Round 1):** $800 per player

### Round Rewards

| Event | Reward ($) | Recipient |
| :--- | :--- | :--- |
| **Win Round** | 3,250 | All winning team players |
| **Lose Round (1st loss)** | 1,400 | All losing team players |
| **Lose Round (2+ streak)** | 1,900 | All losing team players |
| **Kill with Rifle** | 300 | Killer (AK-47, M4A1-S) |
| **Kill with AWP** | 100 | Killer (sniper penalty) |
| **Kill with SMG** | 600 | Killer (MP5 reward) |
| **Plant Bomb** | 300 | All T team (planter gets bonus) |
| **Defuse Bomb** | 300 | Defuser (CT only) |

### Money Cap
- **Maximum:** $16,000 (excess is discarded)

### Buy Phase Rules
- **Duration:** 15 seconds at round start
- **Location:** Must be in team's Buy Zone
- **Ready/Skip:** All players can press READY; if 8/10 ready, skip remaining time (+10s to active round)

### Weapon Prices

| Weapon | Team | Price ($) | Category |
| :--- | :--- | :--- | :--- |
| AK-47 | T | 2,700 | Rifle |
| M4A1-S | CT | 3,100 | Rifle |
| AWP | Both | 4,750 | Sniper |
| MP5 | Both | 1,500 | SMG |
| Desert Eagle | Both | 700 | Pistol |
| Tec-9 | T | 500 | Machine Pistol |
| Auto Pistol | CT | 500 | Machine Pistol |
| Glock-18 | Both | 200 | Pistol (default T) |

### Equipment Prices

| Item | Price ($) | Notes |
| :--- | :--- | :--- |
| Kevlar Vest | 650 | Reduces bullet damage |
| Helmet + Kevlar | 1,000 | Reduces headshot damage |
| Defuse Kit | 400 | CT only, halves defuse time |
| HE Grenade | 300 | Max 1 per round |
| Smoke Grenade | 300 | Max 1 per round |
| Flashbang | 200 | Max 1 per round |

**Reference:** [Design_Gameplay.md](docs/Design_Gameplay.md#3-fase-pembelian--sistem-ekonomi) • [Design_Weapons.md](docs/Design_Weapons.md#1-statistik-lengkap-10-senjata-v21)

---

## 🏃 Movement System

### Base Movement Speeds

| State | Speed (m/s) | Multiplier | Accuracy Penalty |
| :--- | :--- | :--- | :--- |
| **Walk** | 5.0 | 1.0× | Low (counter-strafe viable) |
| **Sprint (Shift)** | 7.5 | 1.5× | High (cannot shoot accurately) |
| **Crouch (Ctrl)** | 2.5 | 0.5× | Lowest (improved accuracy) |
| **Diagonal (W+A)** | 6.0 | 1.2× | Same as walk |

### Jump & Gravity
- **Jump Velocity:** 5 m/s (≈1.1m height)
- **Gravity:** 9.81 m/s²
- **Air Strafe:** Limited directional control (no momentum chaining)

### Crouch Mechanics
- **Hitbox Reduction:** 50% (head height: 1.65m → 0.75m)
- **Camera Lerp:** Smooth transition (0.8m → 0.4m eye height)
- **Improved Accuracy:** Reduced weapon spread

### Sprint Mechanics
- **Cannot Shoot:** Accuracy locked while sprinting
- **Silent Walk Alternative:** Shift-walk for stealth (reduced audio range)

**Note:** Momentum-based mechanics (slide-hop, air strafe chain, moon jump) have been **removed** for competitive integrity and CS:GO alignment.

**Reference:** [Design_Player.md](docs/Design_Player.md#4-movement-physics-bible) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-6-movement-tech-bible-lengkap)

---

## 🔫 Weapon Mechanics

### Fire Modes
- **Semi-Auto:** Single shot per click (Deagle, Glock-18)
- **Full-Auto:** Continuous fire while holding (AK-47, M4A1-S, MP5)
- **Bolt-Action:** Manual cycle between shots (AWP)

### Recoil Patterns (Spray Control)

#### AK-47 Pattern ("7" Shape)
```
Peluru 1-5:   ↑↑↑↑↑          (Vertical rise)
Peluru 6-15:  ←←←←←←←←←←    (Hook left)
Peluru 16-30: →→→→→→→→→→→→  (Hook right)
```
**Control:** Pull mouse down, then right, then left to compensate.

#### M4A1-S Pattern
- Mostly vertical with minimal horizontal deviation
- Easier to control than AK-47

### Accuracy & Spread

| Condition | Accuracy % | Spread Radius |
| :--- | :--- | :--- |
| Stationary + Hipfire | 95% | 0.02 |
| Walking + Hipfire | 75% | 0.06 |
| Sprinting / Sliding | 20% | 0.25 |
| Jumping (Airborne) | 5% | 0.45 |
| ADS (Right Click) | 100% | 0.0 |
| AWP Scope | 100% | 2× Zoom |

### ADS (Aim Down Sights)
- **Transition In:** 120ms (lerp FOV 75 → 60)
- **Transition Out:** 80ms
- **AWP Scope:** 250ms in, 150ms out
- **Cannot shoot during transition**

### Reload Mechanics
- **Lockout:** Cannot shoot, sprint, or throw grenades during reload
- **Cancel Window:** Can cancel up to 40% duration without ammo loss
- **Auto-Reload:** Triggers when mag empty + attempt to shoot

### Reload Times

| Weapon | Reload Time (s) |
| :--- | :--- |
| AK-47 | 2.4 |
| M4A1-S | 3.1 |
| AWP | 3.7 |
| Deagle | 2.2 |
| MP5 | 2.1 |

### Weapon Switch Times

| Weapon | Deploy (s) | Undeploy (s) |
| :--- | :--- | :--- |
| AK-47 / M4A1-S | 0.6 | 0.4 |
| AWP | 1.0 | 0.5 |
| Deagle | 0.4 | 0.3 |
| Pistols | 0.35 | 0.25 |
| MP5 | 0.5 | 0.35 |
| Knife | 0.3 | 0.2 |

**Reference:** [Design_Weapons.md](docs/Design_Weapons.md) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-4-combat--kill-feed)

---

## ☠️ Combat & Damage

### Hitbox System

| Zone | Multiplier | Collider Dimensions (m) | Y Offset |
| :--- | :--- | :--- | :--- |
| **Head** | 2.0× | 0.30 × 0.25 × 0.30 | 1.65 |
| **Torso** | 1.0× | 0.55 × 0.70 × 0.35 | 1.15 |
| **Limbs** | 0.7× | 0.15 × 0.70 × 0.15 | 0.50 |

**Crouch:** Entire collider compressed 50% vertically.

### Damage Calculation
```
Final Damage = Base Damage × Hitbox Multiplier × Wallbang Modifier
```

### Example Calculations

| Scenario | Calculation | Result |
| :--- | :--- | :--- |
| AK-47 Head (no helmet) | 35 × 2.0 | 70 (2-hit kill) |
| AK-47 Head (with helmet) | Rule-based | 1-hit kill |
| M4A1-S Head (with helmet) | 46 × 2.0 | 92 (2-hit kill) |
| AWP Torso | 115 × 1.0 | 115 (1-hit kill) |
| Deagle Limb | 53 × 0.7 | 37.1 |

### Time to Kill (TTK)

| Weapon | Body Shots | Headshots | TTK (Body) |
| :--- | :--- | :--- | :--- |
| AK-47 | 3 | 1 | 0.2s |
| M4A1-S | 4 | 2 | 0.27s |
| AWP | 1 | 1 | Instant |
| Deagle | 2 | 1 | 0.3s |
| MP5 | 5 | 2 | 0.38s |

### Wall Penetration (Wallbang)

| Material | Penetrable? | Damage Reduction | Max Surfaces |
| :--- | :--- | :--- | :--- |
| Wooden Crate | ✅ Yes | -50% | 2 |
| Open Container Door | ✅ Yes | -50% | 2 |
| Iron Barrel | ❌ No | Blocked | 0 |
| Solid Wall | ❌ No | Blocked | 0 |

**Note:** MP5 cannot wallbang (trade-off for high kill reward).

### Death & Respawn
- **Death:** HP ≤ 0 → spectator mode until next round
- **Respawn:** 3 seconds after death (full state reset)
- **Spawn Protection:** 1.5s invulnerability (lost if shooting or leaving 5m radius)

**Reference:** [Design_Combat_Kill.md](docs/Design_Combat_Kill.md) • [Design_Weapons.md](docs/Design_Weapons.md#1-statistik-lengkap-10-senjata-v21)

---

## 💣 Bomb Defusal Mode

### Objective
- **Terrorists:** Plant C4 at Site A or B, defend until explosion
- **Counter-Terrorists:** Prevent plant, defuse active bomb, or eliminate all T

### Bomb Mechanics

| Action | Duration | Requirements |
| :--- | :--- | :--- |
| **Plant** | 3 seconds | In plant zone, cannot move |
| **Explosion Timer** | 40 seconds | After successful plant |
| **Defuse (no kit)** | 10 seconds | In plant zone, cannot move |
| **Defuse (with kit)** | 5 seconds | Requires Defuse Kit ($400) |
| **Cancel** | Instant | Moving cancels progress |

### Plant Zones
- **Site A:** Radius 8m at [-5, 0, -15]
- **Site B:** Radius 8m at [5, 0, +15]

### Win Condition Matrix

| Condition | Winner |
| :--- | :--- |
| Bomb explodes | Terrorists |
| All CT eliminated | Terrorists |
| All T eliminated (bomb not planted) | Counter-Terrorists |
| Bomb defused | Counter-Terrorists |
| Timer expires (no plant) | Counter-Terrorists |
| Timer expires (bomb active, no explosion) | Counter-Terrorists |

**Reference:** [Design_Gameplay.md](docs/Design_Gameplay.md#5-informasi-bom-c4) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-5-bomb-guide)

---

## 🍍 Grenades & Utility

### Grenade Types

| Type | Damage | Radius | Duration | Price |
| :--- | :--- | :--- | :--- | :--- |
| **HE Grenade** | 80 max → 10 min | 4m lethal | Instant | $300 |
| **Smoke** | 0 | 3m LOS block | 15s | $300 |
| **Flashbang** | 0 (blind 1-3s) | 15m cone 60° | Instant | $200 |

### HE Grenade
- **Explosion Delay:** 2 seconds after throw
- **Self-Damage:** 50% to thrower
- **Falloff:** Linear from 80 (center) to 10 (4m edge)
- **Wallbang:** Explosion blocked by thick walls

### Smoke Grenade
- **Delay:** Activates on impact
- **Duration:** 15 seconds (2s fade out)
- **Effect:** Blocks line of sight (LOS) completely
- **Does Not Block:** Physical movement through smoke

### Flashbang
- **Detonation:** 1.5s after throw or second bounce
- **Blindness Duration:**
  - Facing ≤ 45°: 3 seconds
  - Facing 45-70°: 1.5 seconds
  - Facing > 70°: 0.5 seconds
- **Tinnitus:** High-pitched ringing proportional to blindness

### Throw Physics

| Parameter | Value |
| :--- | :--- |
| Base Throw Speed | 18 m/s |
| Max Charged Throw | 22 m/s (hold LMB) |
| Restitution (Concrete) | 0.4 |
| Restitution (Wood) | 0.5 |
| Restitution (Iron) | 0.3 |
| Trajectory Preview | Dashed line 1.5s (5s cooldown) |

**Reference:** [Design_Gameplay.md](docs/Design_Gameplay.md#4-utilitas--granat-taktis) • [Design_Weapons.md](docs/Design_Weapons.md#7-granat-environment-interaction-matrix-baru)

---

## 🗺️ Map Design

### Map: "Container Yard" (Dust2-inspired)

**Dimensions:** 60m × 40m

### Layout Overview
```
                    NORTH (Site A - Tight Corridor)
        ┌─────────────────────────────────────────────┐
        │  [📦 Wood Crates]  [🛢️ Iron Barrels]      │
        │       T-Cover         Mid-A Shield          │
        │                                            │
        │              [🟥 BOMB SITE A 🟥]            │
        │               (Plant Zone A)                │
┌───────┴──────┐    ┌─────────────────┐   ┌──────────┴──────┐
│   T-SPAWN    │────│   MID LANE      │───│    CT-SPAWN     │
│ (Buy Zone T) │    │ (Conflict Zone) │   │  (Buy Zone CT)  │
└───────┬──────┘    └─────────────────┘   └──────────┬──────┘
        │                                            │
        │  [🚪 L-Shape Tunnel]  [📦 Box Stack]      │
        │    Ambush Hiding       B-Cover             │
        │                                            │
        │              [🟦 BOMB SITE B 🟦]            │
        │           (Plant + Ramp High Ground)        │
        └─────────────────────────────────────────────┘
                    SOUTH (Site B - Open Area)
```

### Official Zones

| Zone | Coordinates | Radius | Purpose |
| :--- | :--- | :--- | :--- |
| **T-Spawn (Buy Zone T)** | [-25, 0, 0] | 6×6m | T purchase area |
| **CT-Spawn (Buy Zone CT)** | [+25, 0, 0] | 6×6m | CT purchase area |
| **Plant Zone A** | [-5, 0, -15] | 8m radius | Bomb site A |
| **Plant Zone B** | [+5, 0, +15] | 8m radius | Bomb site B |

### Callouts

| Callout | Location | Strategic Use |
| :--- | :--- | :--- |
| **Tunnel** | L-shape between Site A ↔ Mid | Ambush, A rotation |
| **Mid Box** | Wooden crate in center Mid | AWP cover vs T/CT |
| **Barrels** | 2 iron barrels at Mid entrance (T-side) | Anti-AWP shield |
| **Ramp Top** | Top of Site B ramp (high ground) | Sniper overwatch B |
| **B Stack** | Container stack at Site B | Primary B plant position |
| **A Corner** | Tight corridor corner at Site A | Ambush in corridor |
| **Red Base** | Red containers at T-Spawn | T rotation staging |
| **Blue Base** | Blue containers at CT-Spawn | CT rotation staging |
| **Kitchen** | Narrow alley north of Mid | Flank route to A |
| **CT Doors** | Exit doors from CT-Spawn south side | B push route |

### Rotation Times (Walk 5 m/s / Slide-Hop ~9 m/s)

| Route | Distance | Walk Time | Slide-Hop Time |
| :--- | :--- | :--- | :--- |
| T-Spawn → Site A | ~30m | 6.0s | 3.3s |
| T-Spawn → Mid | ~25m | 5.0s | 2.8s |
| Site A → Mid | ~15m | 3.0s | 1.7s |
| Mid → Site B | ~25m | 5.0s | 2.8s |
| Site A → Site B (via mid) | ~55m | 11.0s | 6.1s |
| CT-Spawn → Site A | ~30m | 6.0s | 3.3s |
| CT-Spawn → Site B | ~20m | 4.0s | 2.2s |

### Cover Heights

| Cover | Height | Type | Bullet Resistance |
| :--- | :--- | :--- | :--- |
| Wooden Crate | 1.2m | Chest-high | Wallbang -50% |
| Iron Barrel | 1.5m | Full cover | Bulletproof |
| Container | 2.4m | Full cover | Bulletproof |
| Ramp | 0.1m (30° slope) | Walkable | N/A |

### Spawn Protection
- **Radius:** 5m from spawn point
- **Duration:** 1.5s invulnerability
- **Conditions:** Lost if shooting or leaving radius

**Reference:** [Impl_Map_ContainerYard_v3.md](docs/Impl_Map_ContainerYard_v3.md) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-8-map-strategy-dust2-like-sandbox)

---

## 🎧 Audio System

### Audio Architecture
- **3D Spatial (Web Audio API):** Gunshots, footsteps, reloads (mono sources)
- **2D UI (Howler.js):** Hitmarker, kill confirm, announcer (stereo)
- **Listener:** Synced to camera position (not body)

### 3D Sound Categories

| Sound | Effective Range | Ref / Max Dist | Notes |
| :--- | :--- | :--- | :--- |
| Gunshot | Very Far | 5m / 80m | Less precise direction at distance |
| Footstep (Sprint) | Medium | 22m | Louder and clearer |
| Footstep (Walk) | Short | 15m | Normal volume |
| Footstep (Crouch) | Very Short | 6m | Stealth reward |
| Reload | Very Short | 8m | Vulnerability indicator |
| Weapon Switch | Very Short | 8m | Tactical info |
| Jump/Landing | Short | 10m | Landing louder from height |
| Slide | Short | 12m | Friction sound |

### Material-Based Footsteps
- **Detection:** Via collider tags (`concrete`, `wood`, `iron`)
- **Variants:** Concrete (heavy), Wood (creak), Iron (metallic)

### 2D/UI Sounds
- **Hitmarker:** Quick tick (bodyshot) — instant
- **Headshot:** High-pitched "dink"
- **Kill Confirm:** Only after server validation
- **Low HP Warning:** Heartbeat below 20 HP
- **Announcer:** "Match Starts", "Bomb Planted", etc.
- **Flashbang Tinnitus:** Ringing 1-3s proportional to blindness

### Audio Specifications
- **Format:** OGG (fallback MP3)
- **Sample Rate:** 44.1 kHz
- **Channels:** Mono (3D), Stereo (UI)
- **Bit Depth:** 16-bit
- **Preload:** Decode via `decodeAudioData` on loading screen

### Audio Occlusion
- **Raycast:** Listener → source
- **Thick Wall:** Low-pass filter 800Hz + volume -12dB
- **Thin Wall (Wood):** Low-pass filter 2500Hz + volume -6dB
- **Open:** No filter

### Performance Management
- **Priority Pool:** 12 concurrent 3D sources
- **Priority Order:** Kill Confirm > Headshot > Hitmarker > Gunshot > Footstep/Reload
- **Object Pool:** Reuse AudioBuffer nodes per type

### Mixing Rules (Ducking)
- **Voice Over Ducking:** Announcer speaking → other sounds -10dB
- **Loudness Hierarchy:** Kill Confirm > Headshot > Hitmarker > Distant Footstep

**Reference:** [Design_Audio.md](docs/Design_Audio.md)

---

## 🌐 Networking & Anti-Cheat

### Server Authority Architecture
```
CLIENT (Browser)                      SERVER (Colyseus Node.js)
─────────────────                      ──────────────────────────
Input (WASD)  ──── WebSocket ────►     Receive input
↓                                      Validate anti-cheat
[Client Prediction]                    Calculate server position
(move instantly)                       ↓
                                       Broadcast state to all clients
◄──── Snapshot ──────────────────────  Send corrected position
↓
[Reconciliation]
(Lerp <0.5m, Snap >0.5m)
```

### Lag Compensation (Server-Side Rewinding)
1. Server stores **History Buffer** of all player positions (500ms, snapshot per 33ms tick)
2. On shoot event: read client timestamp
3. Rewind target position to that timestamp
4. Raycast on historical position
5. Valid hit → apply damage

**Limits:** Max rewind 500ms; older timestamps rejected (cheat/bad connection)

### Tick Rate & Protocol
- **Tick Rate:** 30 ticks/second (33ms per update)
- **Protocol:** WebSocket (TCP) via Colyseus
- **Trade-off:** TCP head-of-line blocking vs UDP complexity

### Client Prediction & Reconciliation
- **Input Sequence:** Each input has `seq++`; client stores unconfirmed inputs
- **Server Confirmation:** Sends `lastProcessedSeq` per snapshot
- **Correction:** 
  - < 0.5m discrepancy: Lerp over 3-5 frames
  - > 0.5m discrepancy: Snap (large desync)

### Anti-Cheat Validation (Server-Side)

| Cheat Type | Detection | Response |
| :--- | :--- | :--- |
| **Speedhack** | Velocity > 12 m/s or delta < 50ms | Reject update |
| **Fire-Rate Hack** | Interval < `(1000/fireRate) × 0.85` | Ignore packet |
| **Ammo Hack** | Ammo > magazine capacity | Auto-kick |
| **Dead Player Shooting** | HP ≤ 0 attempting to shoot | Ignore + shadow ban |
| **Wallhack** | Interest management + LOS check | Bloom filter default |

### Reconnection Flow
1. **Disconnect detected:** WebSocket close or 5s timeout
2. **Server:** Save player snapshot (position, money, weapon, score, round)
3. **Client:** Auto-reconnect every 2s (max 60s window)
4. **Success:** Restore full state, last valid position (1.5s spawn protection if unsafe)
5. **Failure (>60s or different session):** Treated as new player (reset state)

### Network Quality Monitor

| Metric | Measurement | Warning Threshold |
| :--- | :--- | :--- |
| **Ping (RTT)** | Timestamp echo every 1s (`ping` → `pong`) | > 120ms |
| **Packet Loss** | Unacknowledged `lastProcessedSeq` gaps | > 5% |
| **Jitter** | Ping deviation over last 10 samples | > 30ms |

**UI:** Ping display (green <80 / yellow 80-150 / red >150) + **Lag Warning Banner** when threshold exceeded for 3 consecutive seconds.

### Bandwidth Budget

| Message | Size | Frequency |
| :--- | :--- | :--- |
| Input (client → server) | ~40 bytes | 30/s |
| Snapshot (server → client) | ~30 bytes/player | 30/s |
| Shoot Event | ~50 bytes | On shoot |
| Kill/Audio Event | ~60 bytes | Occasional |
| Interest Filter Active | -50% packets | Always |

**Estimate:** ~10 KB/s/player upload; ~10-20 KB/s/download (depends on visible players). 10 players ≈ 100-200 KB/s total — safe for home connections.

**Reference:** [Design_Networking_Advanced.md](docs/Design_Networking_Advanced.md) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-14-anti-cheat-matrix-v20)

---

## 🎨 UI & HUD

### Design Principles: Zero Image Dependency
- **No external images:** All icons/effects created with CSS3
- **CSS Geometry:** `border-radius`, `clip-path`, `box-shadow`, `::before/::after`
- **CSS Animations:** `@keyframes` only
- **Fonts:** Google Fonts (Outfit + Roboto Mono) — 1 CDN request

### CSS Design Tokens
```css
:root {
  --team-red: #ef4444;
  --team-blue: #3b82f6;
  --cs-gold: #f59e0b;
  --cs-gold-glow: rgba(245,158,11,0.8);
  --bg-glass: rgba(15, 23, 42, 0.75);
  --border-glass: rgba(255, 255, 255, 0.12);
  --slate-950: #020617;
  --emerald-400: #34d399;
  --ping-ok: #22c55e;      /* ping < 80ms */
  --ping-mid: #f59e0b;     /* ping 80-150ms */
  --ping-bad: #ef4444;     /* ping > 150ms */
}
```

### Typography
- **Headers/Buttons:** `'Outfit', sans-serif` 700-900
- **HUD Numbers:** `'Roboto Mono', monospace` 500-700

### Z-Index Layering

| Layer | Z-Index | Elements |
| :--- | :--- | :--- |
| 3D Canvas | 0 | Clear |
| Base HUD | 10 | Crosshair, HP, ammo, timer |
| Floating HUD | 20 | Kill feed, minimap, FPS/ping |
| Overlay | 30 | Vignette, flashbang white, scope |
| Menu | 40 | Buy menu, leaderboard, settings |
| Screen | 50 | Main menu, death screen, round end |
| Modal | 60 | Vote kick, forfeit, reconnect |
| Loading | 100 | Loading screen, lag banner |

### Key UI Elements

#### A. Dot Crosshair
- 6×6px white circle with `box-shadow: 0 0 0 1.5px rgba(0,0,0,0.9)`
- Centered via `translate(-50%, -50%)`
- Hidden during buy menu / pointer unlock
- Replaced by scope overlay when using AWP

#### B. Skull Kill Confirm
- 48×40px gold skull with glow effect
- Animation: `skull-pop 0.6s cubic-bezier(...)` scale 0.4→1.15→fade
- Text: `+ $300 KILL CONFIRMED` in gold

#### C. Buy Menu (Glassmorphism)
- Overlay: `rgba(15,23,42,0.85)` + `backdrop-filter blur(12px)`
- Cards: `rgba(30,41,59,0.7)`, 1px border, 12px radius
- Hover: Gold border + translateY(-2px)
- Header: Shows balance + buy phase countdown + ready status

#### D. HUD Cards
- **HP Bar:** Bottom-left, 256px glass card, `Roboto Mono` emerald numbers, gradient bar (red→green)
- **Ammo:** Bottom-right, large gold numbers + `/ ∞`
- **Kill Feed:** Top-right, slide-in animation, auto-fade 5s (max 4 entries)
- **Timer:** Top-center, `[🔴 RED 12] [03:45] [BLUE 10 🔵]`, turns red when <30s

#### E. AWP Scope Overlay
- `radial-gradient(circle, transparent 32%, black 33%)` with 1px crosshair lines

#### F. Damage Vignette
- `box-shadow: inset 0 0 80px 30px rgba(239,68,68,0.6)`
- Animation: `pulse-damage 0.3s ease-out forwards`

#### G. FPS Counter
- Top-left, `Roboto Mono 10px`, gray color (red if <60 FPS)
- Updates 1×/second, `pointer-events: none`

#### H. Ping Display
- Top-right (next to FPS), 3-bar CSS icon
- Color-coded: green/yellow/red based on thresholds

#### I. Minimap
- 2D canvas (bottom-right, 20% viewport, max 320px)
- Player arrow (CSS triangle via clip-path)
- Bomb icon (emoji ⦿ gold circle)
- Site labels A/B

#### J. Lag Warning Banner
- Top-center, `rgba(239,68,68,0.9)`, text "Network Lag Detected"
- Appears for 3 seconds with pulse animation

#### K. Spectator HUD
- Replaces crosshair with target name + HP bar
- K/D displayed top-right
- Ammo hidden
- Mode indicator: `FREE CAM` / `FOLLOW: Player_X` / `OBJECTIVE` / `THIRD-PERSON`

#### L. Ready/Skip UI
- Buy phase: Player chips `[READY ✓]` below timer
- Progress bar: "5/10 ready" + READY button (F2)

### Transition Timing

| Transition | Duration | Easing |
| :--- | :--- | :--- |
| Main menu → gameplay | 400ms | ease-out |
| Mode select → loading | 200ms | ease-in |
| Death screen appear | 300ms | ease-out |
| Buy menu open/close | 220ms | ease-out |
| Leaderboard (TAB) | 100ms (instant) | linear |
| Kill feed slide-in | 300ms | ease-out |
| Skull pop | 600ms | back-out |
| Damage vignette | 300ms | ease-out forwards |
| Scope enter (AWP) | 250ms | ease-in-out |
| Round end banner | 500ms | back-out |

### Responsive & Accessibility

| Item | Specification |
| :--- | :--- |
| Breakpoints | 100% ≥1440px; 85% at 1280px; collapse minimap <1280px |
| Contrast | All text ≥ 4.5:1 (except gold-on-glass headers 3:1) |
| Min Font | 12px (HUD numbers), 14px (UI text) |
| Firefox | `-webkit-backdrop-filter` prefix required |
| Safari | Fallback solid bg if backdrop-filter unsupported |
| Color Blind | "Shape outline" mode (enemy=circle, ally=square) |

**Reference:** [Design_CSS_UI_System.md](docs/Design_CSS_UI_System.md) • [Design_UI_Flow_Geometry.md](docs/Design_UI_Flow_Geometry.md)

---

## 👁️ Spectator System

### Spectator Modes

| Mode | Trigger | Controls | HUD |
| :--- | :--- | :--- | :--- |
| **Death Cam** | Player dies | Auto (1s delay) | Grayscale + timer |
| **Free Cam** | Press F | WASD + Scroll zoom + Shift speed | No crosshair |
| **Player Follow** | Press 1-9 | View target name + K/D | Target HP bar |
| **Objective Cam** | Press O | Auto-follow bomb/defuser | Bomb timer |
| **Third-Person** | Press V | Toggle over-shoulder view | Same as follow |

### Spectate Rules
- **Dead players:** Can spectate immediately (no respawn wait)
- **Next Player:** Press G to cycle through player list
- **Anti-Wallhack:** Spectators can only follow own team + limited free cam (no wall penetration)
- **Round End:** All dead → forced spectator until next round

### Server Broadcast
- Server sends spectated player position + special events (kill, bomb plant, defuse) to spectator clients
- Interest management still applies (no enemy info outside LOS)

**Reference:** [Design_Combat_Kill.md](docs/Design_Combat_Kill.md#7-spectator-system-baru--lengkap) • [Gameplay_Mechanics_Bible.md](docs/Gameplay_Mechanics_Bible.md#chapter-9-spectator-system-detail)

---

## ⚙️ Settings & Accessibility

### Video Settings
- **Quality Presets:** Low / Medium / High / Ultra
- **Resolution Scale:** 75% / 100% / 125%
- **Effects Toggle:** Reduce blur, vignette, glow (low-end GPU mode)

### Audio Settings
- **Volume Sliders:** Master, SFX, Voice/Announcer, UI
- **Low HP Heartbeat:** Toggle on/off
- **3D Sound Count:** Toggle "Reduce 3D sounds" (pool 12 → 6 sources)

### Controls
- **Sensitivity:** Slider 0.1 - 5.0 (X/Y axis separate)
- **Keybinds:** Customizable for all actions
- **Invert Mouse:** Toggle Y-axis inversion
- **Slide Control:** 0-10 setting (FPS fairness normalization)

### Gameplay Settings
- **Crosshair Style:** Dot / Circle / Plus / Custom
- **Auto-Reload:** Toggle on/off
- **Quick Reload:** Enable cancel window (40% duration)

### Accessibility Features
- **Color Blind Mode:** Shape-based team distinction (circle vs square outlines)
- **Subtitle:** Text captions for announcer voice lines
- **Min Font Size:** Enforced 12px minimum
- **High Contrast Mode:** Enhanced UI element visibility

---

## 📊 Performance Budget

| Resource | Budget | Fallback |
| :--- | :--- | :--- |
| **FPS Target** | 60 FPS (min 30) | UI dwarf mode at <30 |
| **Draw Calls** | ≤ 450 | Progressive LOD/grid degradation |
| **Draw Distance** | 100m | Fog occlusion beyond |
| **Network** | ≤ 80 Kbps/client | 400 B/tick @30 tick |
| **Maps** | 1-2 per initial release | - |
| **Memory** | ≤ 1.5 GB | Texture 2K, NPOT compression |

### Fallback Gallery (FPS < 30)
- Resolution scale: 0.75×
- Shadows: OFF
- Sun shafts: ON (cheap)
- Antialiasing: MSAA OFF
- Post-processing: Minimal

---

## 📝 Implementation Checklist Summary

**Total Features:** 74 tasks across 5 categories

| Category | Total | MVP | Post-MVP | Status |
| :--- | :--- | :--- | :--- | :--- |
| UI & HUD | 17 | 10 | 7 | 17 ✅ (100%) |
| Character & Movement | 15 | 10 | 5 | 15 ✅ (100%) |
| Weapons & Utility | 14 | 8 | 6 | 13 ✅ / 1 🔲 (93%) |
| Multiplayer & Network | 15 | 10 | 5 | 11 ✅ / 1 🟨 / 3 🔲 (73%) |
| Map, Environment & Training | 13 | 10 | 3 | 12 ✅ / 1 🔲 (92%) |
| **Total** | **74** | **48** | **26** | **68 ✅ / 1 🟨 / 5 🔲 (92%)** |

**Legend:** ✅ Complete | 🟨 Partial | 🔲 Not Started

**Reference:** [Master_Implementation_Checklist.md](docs/Master_Implementation_Checklist.md)

---

## 📚 Document Index

| Document | Content | Priority |
| :--- | :--- | :---: |
| `README.md` | Quick start, tech stack, structure | 1 |
| `Game_Design_Document.md` | This document (master overview) | 2 |
| `docs/Gameplay_Mechanics_Bible.md` | Complete gameplay loop + timing + edge cases | 3 |
| `docs/Master_Implementation_Checklist.md` | Feature list + dependencies + testing | 4 |
| `docs/Design_Gameplay.md` | Modes, economy, training range, roadmap | 5 |
| `docs/Design_Player.md` | Character + movement physics | 6 |
| `docs/Design_Weapons.md` | Weapons + grenades | 7 |
| `docs/Design_Combat_Kill.md` | Damage, death, spectator system | 8 |
| `docs/Impl_Map_ContainerYard_v3.md` | Map CS perbaikan bentuk + visual + koordinat | 9 |
| `docs/Design_Networking_Advanced.md` | Networking + anti-cheat | 10 |
| `docs/Design_Audio.md` | 3D/2D audio system | 11 |
| `docs/Design_CSS_UI_System.md` | Zero-asset CSS HUD specification | 12 |
| `docs/Design_UI_Flow_Geometry.md` | User flow + 3D geometry specs | 13 |
| `docs/Impl_Zombie_Survival.md` | Zombie Survival proses perbaikan | Active |
| `docs/Zombie_Survival_Code_Review.md` | Defect inventory P0–P3 | Active |

---

## 🎯 Design Philosophy Statement

This game prioritizes **competitive integrity** over arcade flair. Every mechanic is designed to:

1. **Reward skill** (aim, positioning, utility usage)
2. **Punish mistakes** (poor positioning, wasted utility, bad economy)
3. **Enable teamwork** (trade kills, coordinated executes, communication)
4. **Maintain fairness** (server authority, anti-cheat, consistent physics)

We draw inspiration from CS:GO's tactical depth and Valorant's ability-driven combat, but adapt both for the web platform with performance-first design.

**Core Mantra:** *"Easy to learn, impossible to master."*

---

*Last reviewed: 2026-08-13*  
*Next review: After Phase 5 (Bomb Defusal) implementation complete*