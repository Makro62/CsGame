# Zombie Survival Mode — Complete Documentation

## Table of Contents

1. [Overview](#overview)
2. [Game Flow](#game-flow)
3. [Controls](#controls)
4. [Weapons](#weapons)
5. [Zombie Types](#zombie-types)
6. [Wave System](#wave-system)
7. [Shop & Economy](#shop--economy)
8. [Perks](#perks)
9. [Pack-a-Punch](#pack-a-punch)
10. [Mystery Box](#mystery-box)
11. [Map & Areas](#map--areas)
12. [Barricades](#barricades)
13. [Extraction](#extraction)
14. [Power-Ups](#power-ups)
15. [Difficulties](#difficulties)
16. [Scoring & Leaderboard](#scoring--leaderboard)
17. [Technical Architecture](#technical-architecture)

---

## Overview

Zombie Survival Mode is a cooperative PvE mode where 1+ players fight endless waves of zombies in the "Outpost Z-7" arena. Between waves, players buy weapons, perks, and upgrades to survive increasingly difficult rounds. The mode features a buy phase system, multiple zombie types, a Pack-a-Punch upgrade station, mystery box, barricades, and an extraction system.

**Core Loop:** Fight zombies → Earn points → Buy gear → Survive harder waves → Extract or die trying.

---

## Game Flow

### 1. Lobby

When entering zombie mode, the `ZombieLobbySetup` screen appears with 4 difficulty cards:

| Difficulty | Description |
|------------|-------------|
| **Casual** | 0.8x zombie HP/damage, 1.25x points, 5 solo revives |
| **Normal** | Standard experience, 3 solo revives |
| **Hardcore** | 1.15x HP, 1.2x speed, 1.3x damage, 1 solo revive |
| **Nightmare** | 1.35x HP, 1.3x speed, 1.5x damage, 0 solo revives |

Player clicks "DEPLOY TO OUTPOST Z-7" to connect to the server and start.

### 2. Spawn

- Player spawns at `(0, 0, -30)` inside the Safe House
- Equipped with Deagle (14/70 ammo) + Knife
- Starts with 500 points (normal difficulty)
- First wave has a 5-second delay before starting

### 3. Wave State Machine

```
waiting → buy_phase → spawning → active → wave_clear → buy_phase → ...
```

| State | Description |
|-------|-------------|
| **waiting** | Game not started or after game over |
| **buy_phase** | 15s timer (5s for first wave). Buy weapons, perks, ammo |
| **spawning** | Zombies spawn over 10s with calculated intervals |
| **active** | All zombies spawned. Fight until all dead |
| **wave_clear** | Rest period (20s, decreases with wave). Wave clear bonus awarded |

### 4. Game Over

Three ways the game ends:

1. **Team Wipe**: All players dead/downed simultaneously → Game Over screen
2. **Solo Death**: Downed timer (30s) expires with no revives left → Game Over
3. **Extraction Victory**: All alive players reach helipad within 30s → Victory screen

---

## Controls

| Key | Action |
|-----|--------|
| **WASD** | Move |
| **Left Click** | Shoot |
| **R** | Reload |
| **F** (tap) | Interact with nearby object |
| **F** (hold) | Revive downed teammate |
| **1 / Numpad1** | Switch to primary weapon |
| **2 / Numpad2** | Switch to secondary weapon |
| **3 / Numpad3** | Switch to knife |
| **Scroll Wheel** | Cycle weapons (1→2→3→1) |
| **Space** | Start next wave (during buy_phase) |
| **B** | Toggle Weapon Shop |
| **TAB / L** | Toggle Leaderboard |
| **ESC** | Toggle Settings/Pause |
| **M** | Toggle Minimap |

### Interaction Priority (F key)

When pressing F, the game checks in this order:

1. **Revive ally** — Hold F near downed teammate (within 3m)
2. **Mystery Box** — Within 4m of mystery box location
3. **Pack-a-Punch** — Within 4m of PaP location
4. **Repair barricade** — Within 4m of damaged barricade
5. **Unlock area** — Near a locked door with enough points
6. **Call extraction** — Within 14m of helipad (if available)

---

## Weapons

### Primary Weapons

| Weapon | Damage | Headshot | Fire Rate | Mag | Reload | Reserve | Price |
|--------|--------|----------|-----------|-----|--------|---------|-------|
| **AK-47** | 35 | 100 | 10 rps | 30 | 2.4s | 90 | 1,200 |
| **M4A1** | 31 | 92 | 11 rps | 25 | 3.1s | 75 | 1,400 |
| **AWP** | 115 | 115 | 0.83 rps | 5 | 3.7s | 30 | 2,500 |
| **MP5** | 24 | 72 | 10.5 rps | 30 | 2.1s | 120 | 800 |

### Secondary Weapons

| Weapon | Damage | Headshot | Fire Rate | Mag | Reload | Reserve | Price |
|--------|--------|----------|-----------|-----|--------|---------|-------|
| **Glock** | 22 | 78 | 8 rps | 20 | 1.8s | 120 | 200 |
| **Tec-9** | 18 | 65 | 12 rps | 18 | 1.6s | 90 | 500 |
| **Auto Pistol** | 20 | 70 | 9 rps | 15 | 1.5s | 90 | 500 |
| **Deagle** | 53 | 100 | 3.33 rps | 14 | 2.2s | 70 | 400 |

### Melee

| Weapon | Damage | Fire Rate | Price |
|--------|--------|-----------|-------|
| **Knife** | 50 | 2 rps | Free |
| **Combat Knife** | 55 | 2.5 rps | 500 |

### Ammo Refill

- **Price:** 500 points
- **Effect:** Refills magazine + 2x reserve ammo for current weapon
- **Cap:** Maximum reserve capped at magazine size × 5

---

## Zombie Types

| Type | HP | Speed | Damage | Color | Scale | Unlock Wave |
|------|-----|-------|--------|-------|-------|-------------|
| **Walker** | 100 | 2.5 | 15 | Dark green | 0.9x | 1 |
| **Runner** | 60 | 5.0 | 10 | Brown | 0.75x | 3 |
| **Tank** | 400 | 1.5 | 30 | Dark gray | 1.3x | 5 |
| **Spitter** | 80 | 2.0 | 5 | Yellow-green | 0.85x | 7 |
| **Boss** | 8,000 | 2.8 | 60 | Dark red | 2.2x | 10 (every 5 waves) |

### Scaling

Zombie stats scale with wave number:

- **HP:** `base_hp × (1 + (wave-1) × 0.15) × difficulty_hp_multiplier`
- **Speed:** `base_speed × (1 + (wave-1) × 0.03) × difficulty_speed_multiplier`

### Behavior

| Type | Behavior |
|------|----------|
| **Walker** | Standard zombie. Moves toward nearest player, attacks on contact |
| **Runner** | Fast but fragile. Rushes players quickly |
| **Tank** | Slow but tanky. High damage, high HP |
| **Spitter** | Ranged attacker. Spits at distance |
| **Boss** | 3 attack patterns: Leap (dash), Area Stomp (AoE), Heavy Melee |

### Boss Special Attacks

Boss zombies have 3 attack patterns based on cooldown:

1. **Leap** (range 3-10m): 2.5× speed dash toward player
2. **Area Stomp** (range < 2.5m): Damages all nearby players
3. **Heavy Melee** (range < 2m): Slower but high-damage hit

### Visual Differences

- **Boss**: 2.2× scale, chest plate, shoulder pads, 4 glowing eyes, ground aura ring, larger health bar with HP text
- **Walker**: Standard 0.9× scale, dark green
- **Runner**: Smaller 0.75× scale, brown, faster limb animation
- **Tank**: Larger 1.3× scale, dark gray, heavy build
- **Spitter**: 0.85× scale, yellow-green

---

## Wave System

### Wave Composition

| Wave | Total Zombies | Formula |
|------|---------------|---------|
| 1 | 6 | baseZombieCount |
| 2 | 10 | 6 + 1×4 |
| 3 | 14 | 6 + 2×4 |
| 5 | 22 | 6 + 4×4 |
| 10 | 42 | 6 + 9×4 |
| 20 | 82 | 6 + 19×4 |

**Formula:** `baseZombieCount (6) + (wave - 1) × zombiesPerWave (4)`

### Boss Waves (every 5 waves)

Boss waves modify the composition:

- Regular zombies: `count × 0.6` (40% reduction)
- Boss zombies: `2 + floor(wave / 5)`
- Example Wave 10: 25 regulars + 4 bosses = 29 total

### Spawn System

- **Active spawn points** scale with wave:
  - Waves 1-2: 1 spawn point
  - Waves 3-5: 2 spawn points
  - Waves 6-8: 3 spawn points
  - Waves 9+: 4 spawn points
- **Spawn duration**: 10 seconds (zombies drip-feed)
- **8 spawn locations** around arena edges

### Zombie Type Selection

| Wave | Available Types |
|------|-----------------|
| 1-2 | Walker only |
| 3-4 | Walker (60%), Runner (40%) |
| 5-6 | Walker (35%), Runner (40%), Tank (25%) |
| 7+ | Walker (30%), Runner (30%), Tank (25%), Spitter (15%) |

### Wave Clear Bonus

- **Base**: 500 + wave × 100 points per living player
- **Boss wave bonus**: Additional 1000 + wave × 200 points

### Inter-Wave Timer

- Starts at 20 seconds
- Decreases with wave number
- Minimum: 12 seconds

---

## Shop & Economy

### Weapon Shop (press B)

Two tabs: **Weapons** and **Perks**

#### Weapons Tab

| Item | Price | Category |
|------|-------|----------|
| Glock | 200 | Secondary |
| Deagle | 400 | Secondary |
| Tec-9 | 500 | Secondary |
| Auto Pistol | 500 | Secondary |
| MP5 | 800 | Primary |
| AK-47 | 1,200 | Primary |
| M4A1 | 1,400 | Primary |
| AWP | 2,500 | Primary |
| Combat Knife | 500 | Melee |
| Ammo Refill | 500 | Utility |
| Armor (100) | 750 | Utility |

#### Perks Tab

| Perk | Price |
|------|-------|
| Juggernog | 2,500 |
| Speed Cola | 3,000 |
| Double Tap | 2,000 |
| Quick Revive | 1,500 |

### Point Sources

| Event | Points |
|-------|--------|
| Walker kill | 50 |
| Runner kill | 75 |
| Tank kill | 150 |
| Spitter kill | 100 |
| Boss kill | 500 |
| Headshot bonus | +25 |
| Knife kill bonus | +100 |
| Assist damage | +10 |
| Revive ally | +250 |
| Barricade repair | +10 |
| Wave clear (base) | 500 |
| Wave clear (per wave) | +100 |
| Extraction bonus | +5,000 |

---

## Perks

| Perk | Price | Effect |
|------|-------|--------|
| **Juggernog** | 2,500 | +100 HP (200 total). On revive: 150 HP (vs 100 without) |
| **Speed Cola** | 3,000 | 50% faster reload speed |
| **Double Tap** | 2,000 | 1.33× fire rate (25% faster shooting) |
| **Quick Revive** | 1,500 | 1.5s revive time (vs 3.0s). Solo: +1 extra self-revive |

### Perk Details

**Juggernog**
- Increases max HP from 100 to 200
- On revive, restores to 150 HP instead of 100 HP
- Visual: Blue perk icon in HUD

**Speed Cola**
- Halves all reload times
- AWP reload drops from 3.7s to 1.85s
- Visual: Green perk icon in HUD

**Double Tap**
- Multiplies fire rate by 1.33
- AK-47 goes from 10 rps to 13.3 rps
- Bypasses fire-rate anti-cheat check
- Visual: Orange perk icon in HUD

**Quick Revive**
- Revive time reduced from 3.0s to 1.5s
- In solo mode: grants 1 extra self-revive life
- Visual: Cyan perk icon in HUD

---

## Pack-a-Punch

**Location:** Center of arena at `(0, 0)`
**Price:** 5,000 points

### Upgrade Effects

- **Damage**: 1.5× multiplier on all shots
- **Ammo**: 2× magazine size and reserve ammo
- **Dual Wield**: Pistol-class weapons become dual-wielded (1→2 weapons)

### Dual Wield Weapons

After Pack-a-Punch, these pistols become akimbo:

| Weapon | Dual Wield |
|--------|------------|
| Deagle | 2× Deagle (alternating fire) |
| Glock | 2× Glock (alternating fire) |
| Tec-9 | 2× Tec-9 (alternating fire) |
| Auto Pistol | 2× Auto Pistol (alternating fire) |

### Pack-a-Punch Variants

| Base Weapon | Upgraded Name | Effect | Color |
|-------------|--------------|--------|-------|
| AK-47 | AK-117 Inferno | Fire DOT | #ff4500 |
| M4A1 | M4A4 Hellfire | Explosive | #ff8c00 |
| AWP | AWP Thunderbolt | Chain Lightning | #00bfff |
| MP5 | MP5-K Venom | Poison DOT | #32cd32 |
| Deagle | Deagle Apocalypse | Pierce | #9932cc |
| Glock | Glock Radiance | Stun | #00ffcc |
| Tec-9 | Tec-9 Overload | Fire DOT | #ff6347 |
| Auto Pistol | Auto Pistol Venom | Poison DOT | #7cfc00 |

### Visual Effects

- Purple point light glow on the weapon model when PaP is active
- HUD shows weapon name with star icon (e.g., "AK-47 ⭐")

---

## Mystery Box

**Location:** `(0, 5)`
**Price:** 950 points (10 during Fire Sale)

### Weapon Weights

| Weapon | Weight | Chance |
|--------|--------|--------|
| MP5 | 25 | 25% |
| AK-47 | 20 | 20% |
| M4A1 | 20 | 20% |
| Glock | 20 | 20% |
| Deagle | 15 | 15% |
| Tec-9 | 10 | 10% |
| Auto Pistol | 10 | 10% |
| AWP | 5 | 5% |

### Spin Duration

- 4 seconds of weapon cycling animation
- Random weapon selected from weighted pool
- Fire Sale power-up reduces cost to 10 points

---

## Map & Areas

### Arena Layout

The arena is a 120×120 meter enclosed area with the following landmarks:

| Landmark | Position | Description |
|----------|----------|-------------|
| **Safe House** | (0, 0, -40) | Spawn area with walls and roof |
| **Helipad** | (0, 0, 50) | Extraction point. "H" marking on ground |
| **Mystery Box** | (0, 5) | Random weapon station |
| **Pack-a-Punch** | (0, 0) | Weapon upgrade station |

### Unlockable Areas

Areas must be unlocked in order (prerequisites required):

| Area | Price | Requires | Position | Radius |
|------|-------|----------|----------|--------|
| **Spawn** | Free | — | (0, -40) | 15m |
| **East Wing** | 750 | Spawn | (20, -20) | 12m |
| **West Wing** | 750 | Spawn | (-20, -20) | 12m |
| **Armory** | 1,000 | East Wing | (0, 0) | 10m |
| **Helipad Area** | 1,250 | West Wing | (0, 30) | 15m |
| **Tower** | 1,500 | Armory | (25, 25) | 8m |
| **Bunker** | 2,000 | Helipad Area | (-25, 25) | 10m |

### Navigation

- 20-node navmesh for A* pathfinding
- Nodes connected via neighbor lists
- Direct movement when distance < 4m
- Barricade detection: zombies attack barricades within 2.2m

---

## Barricades

**6 barricade locations** around the arena protect key areas.

### Mechanics

| Property | Value |
|----------|-------|
| Max boards per barricade | 6 |
| Hits per board | 2 |
| Repair cooldown | 0.5s per board |
| Points per repair | +10 |

### Behavior

- Zombies attack barricades when within 2.2m
- Each hit destroys 1 hit-point (2 hits per board)
- When all boards destroyed, zombies pass through
- Players repair by pressing F near damaged barricade
- Carpenter power-up repairs all barricades instantly

### Visual

- Wooden planks rendered at each barricade position
- Board count shown as "Boards: X/6" or "BROKEN (0/6)"
- Green/amber/red indicators based on remaining boards

---

## Extraction

### Availability

| Method | Condition | Cost |
|--------|-----------|------|
| **Auto-unlock** | Wave ≥ 10 | Free |
| **Manual** | Wave ≥ 5 | 5,000 points |

### Extraction Process

1. Player calls extraction at helipad (within 14m)
2. 30-second countdown timer starts
3. **Surge waves** spawn every 5 seconds (runners + tanks)
4. All alive players must reach helipad (within 12m radius)
5. If all players reach helipad within 30s → **Victory**
6. +5,000 bonus points per player on success

### Helipad Visual States

- **Red**: Locked (extraction not available)
- **Amber**: Available (can be called)
- **Green**: Active (extraction in progress)

---

## Power-Ups

Dropped by zombies on death with 15% chance.

| Power-Up | Duration | Effect |
|----------|----------|--------|
| **Max Ammo** | Instant | Full ammo for all players' current weapons |
| **Nuke** | Instant | Kill all zombies on map, +400 pts per player |
| **Insta Kill** | 30s | All damage becomes one-hit kill |
| **Double Points** | 30s | All point gains doubled |
| **Carpenter** | Instant | Repair all barricades to full, +200 pts per player |
| **Fire Sale** | 30s | Mystery Box costs 10 points |

### Visual

- Each type has unique shape, color, and glow ring
- Floats and rotates above spawn location
- Auto-pickup when player within 2m
- 30-second lifetime before despawn

---

## Difficulties

| Difficulty | Zombie HP | Zombie Speed | Zombie Damage | Point Multiplier | Solo Revives |
|------------|-----------|--------------|---------------|------------------|--------------|
| **Casual** | 0.8× | 1.0× | 0.8× | 1.25× | 5 |
| **Normal** | 1.0× | 1.0× | 1.0× | 1.0× | 3 |
| **Hardcore** | 1.15× | 1.2× | 1.3× | 1.0× | 1 |
| **Nightmare** | 1.35× | 1.3× | 1.5× | 1.1× | 0 |

### Difficulty Effects

- HP multiplier affects zombie max HP calculation
- Speed multiplier affects zombie movement speed
- Damage multiplier affects zombie melee damage
- Point multiplier affects all point gains
- Solo revives: number of self-revive chances when downed in solo play

---

## Scoring & Leaderboard

### Score Formula

```
Score = (wave × 1,000) + (kills × 10) + (headshots × 25) + extraction_bonus
```

### Extraction Bonus

- +5,000 points on successful extraction

### Leaderboard

- Stored in localStorage (client-side only)
- Top 10 scores displayed
- Shows: rank, nickname, score, wave, kills, date
- Persisted across sessions

---

## Technical Architecture

### Monorepo Structure

```
cs-game/
├── shared/          # Shared types, configs, schemas
│   └── index.ts     # ZOMBIE_TYPES, WAVE_CONFIG, WEAPONS, etc.
├── server/          # Colyseus game server
│   └── src/
│       ├── rooms/
│       │   ├── ZombieSurvivalRoom.ts  # Main game room
│       │   └── AntiCheatSystem.ts     # Anti-cheat validation
│       ├── systems/
│       │   └── WaveSystem.ts          # Wave state machine
│       └── ai/
│           ├── ZombieController.ts    # Zombie AI behavior
│           └── Pathfinder.ts          # A* pathfinding
└── client/          # React + Three.js client
    └── src/
        ├── screens/
        │   └── ZombieSurvivalMode.tsx    # Main zombie screen
        ├── stores/
        │   ├── useZombieNetworkStore.ts  # Network state
        │   └── useZombieStore.ts         # Game state
        ├── game/
        │   ├── zombie/
        │   │   ├── ZombieRenderer.tsx     # 3D zombie rendering
        │   │   └── PowerUpRenderer.tsx    # 3D power-up rendering
        │   ├── map/
        │   │   ├── ZombieArena.tsx        # 3D arena map
        │   │   └── InteractiveBarricades.tsx
        │   └── weapons/
        │       ├── WeaponModel.tsx        # First-person weapon models
        │       ├── weaponRig.ts           # Weapon positions/rotations
        │       ├── ShootingSystem.tsx     # Hitscan shooting
        │       └── ReloadSystem.tsx       # Reload logic
        ├── ui/components/
        │   ├── zombie/
        │   │   ├── WeaponShop.tsx
        │   │   ├── MysteryBox.tsx
        │   │   ├── PackAPunch.tsx
        │   │   ├── ZombieLobbySetup.tsx
        │   │   ├── ZombieGameOver.tsx
        │   │   ├── ZombieLeaderboard.tsx
        │   │   ├── ZombieSettings.tsx
        │   │   └── AreaUnlockUI.tsx
        │   └── hud/
        │       ├── WaveHUD.tsx
        │       ├── PointsDisplay.tsx
        │       ├── ExtractionHUD.tsx
        │       └── ZombiePlayerHUD.tsx
        └── components/
            ├── ZombieMinimap.tsx
            ├── ClickToPlayOverlay.tsx
            └── DownedOverlay.tsx
```

### Server-Client Communication

| Protocol | Purpose |
|----------|---------|
| **Colyseus Schema** | Real-time state sync (players, zombies, barricades) |
| **Room Messages** | Client→Server actions (shoot, buy, interact) |
| **Broadcast** | Server→Client events (wave start, power-up, game over) |

### Game Tick

Server runs at 30 ticks/second. Each tick:

1. Update zombie AI with player + barricade positions
2. Process barricade damage from zombie attacks
3. Check zombie melee hits on players
4. Update revive progression
5. Update downed bleedout timers
6. Check game over conditions
7. Update extraction timer + surge spawning
8. Update wave system
9. Sync zombie positions to state
10. Update power-up timers
11. Broadcast snapshot to all clients

### Anti-Cheat

| Check | Tolerance | Action |
|-------|-----------|--------|
| Speed | 1.35× max | Warning → Kick (3 violations) |
| Fire rate | 1.3× tolerance | Reject shot |
| Ammo | mag+10 max | Reject reload |
| Input flood | 60/sec max | Throttle |
| Teleport | >10m/tick | Reject position |
