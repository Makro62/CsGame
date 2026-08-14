# CsGame — Gameplay System Documentation
**Version:** 3.0 | **Date:** 2026-08-14

## 1. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      TRAINING & AI SYSTEM                   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐    ┌──────────────────────────────────┐   │
│  │   CLIENT     │    │           SERVER                  │   │
│  │  (Training)  │    │  ┌──────────┐  ┌──────────┐    │   │
│  │              │    │  │ Training │  │ BotAgent │    │   │
│  │  Bot.tsx     │◄──►│  │ Room     │  │ AI       │    │   │
│  │  AimTrainer  │    │  └──────────┘  └──────────┘    │   │
│  │  WeaponModel │    │                                  │   │
│  └──────────────┘    │  ┌──────────────────────────┐   │   │
│                      │  │   GameRoom + BotAgent     │   │   │
│                      │  │   (Online Backfill)       │   │   │
│                      │  └──────────────────────────┘   │   │
│                      └──────────────────────────────────┘   │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              PROGRESS & RATING                        │   │
│  │  ┌──────────────┐  ┌──────────────┐                  │   │
│  │  │ ProgressStore │  │ SkillRating  │                  │   │
│  │  │ (Stats/DB)    │  │ (ELO-like)   │                  │   │
│  │  └──────────────┘  └──────────────┘                  │   │
│  └──────────────────────────────────────────────────────┘   │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Training Range (Offline Mode)

### 2.1 Modes

| Mode | Description | Metrics |
|------|-------------|---------|
| **Static Aim** | Stationary bots at random positions | Accuracy %, HS Rate |
| **Moving Aim** | Bots patrol and chase player | Tracking Accuracy |
| **Reaction** | Bots spawn/despawn randomly | Reaction Time |
| **Recoil** | Spray pattern on wall | Grouping Size, Consistency |
| **Movement** | Obstacle course with checkpoints | Completion Time |
| **1v1 Bot** | Single bot with combat AI | Peek Efficiency |

### 2.2 Bot Spawning
- **Default:** 3 bots, Difficulty 2 (Medium)
- **Max:** 5 bots simultaneously
- **Respawn:** 2-3 seconds after death
- **Spawn Range:** X: [-15, 15], Z: [-30, -10]
- **Cover Objects:** 3 static obstacles for tactical play

### 2.3 Bot Appearance
- Humanoid box-mesh (head, torso, arms, legs)
- Color varies by difficulty:
  - Easy/Medium: `#be123c` (red)
  - Hard+: `#991b1b` (dark red)
- Difficulty indicator sphere above head:
  - Green (1-2), Yellow (3), Orange (4), Red (5)
- HP bar when damaged
- Weapon visible on right arm

### 2.4 Client-Side Bot AI

```
States: idle → patrol → chase → strafe → dead
```

| State | Behavior |
|-------|----------|
| **idle** | Stand still, pick new patrol target after 2-5s |
| **patrol** | Move toward random waypoints in spawn area |
| **chase** | Move toward player when in aggro range |
| **strafe** | Perpendicular movement, changes direction randomly |
| **dead** | Hidden, respawns after timeout |

### 2.5 Difficulty Matrix

| Diff | Label | Speed | Accuracy | Reaction | HS Rate | Aggro Range |
|------|-------|-------|----------|----------|---------|-------------|
| 1 | Easy | 0.4x | 30% | 800ms | 5% | 15m |
| 2 | Medium | 0.6x | 50% | 500ms | 15% | 20m |
| 3 | Hard | 0.8x | 70% | 300ms | 30% | 25m |
| 4 | Expert | 0.95x | 85% | 150ms | 50% | 30m |
| 5 | Legend | 1.0x | 95% | 80ms | 70% | 35m |

---

## 3. Bot AI (Server-Side)

### 3.1 State Machine

```
                    ┌─────────┐
          ┌────────►│  idle   │◄────────┐
          │         └────┬────┘         │
          │              │ timeout      │ lost target
          │              ▼              │
          │         ┌─────────┐         │
          │    ┌───►│ patrol  │─────────┤
          │    │    └────┬────┘
          │    │         │ see enemy
          │    │         ▼
          │    │    ┌─────────┐     low HP      ┌─────────┐
          │    │    │ engage  │────────────────►│ retreat │
          │    │    └────┬────┘                  └────┬────┘
          │    │         │ close range                 │
          │    │         ▼                             │
          │    │    ┌─────────┐                  ┌────┘
          │    └────│ chase   │                  │
          │         └─────────┘                  │
          │                                      │
          └──────────────────────────────────────┘
                         low ammo
                    ┌─────────┐
                    │ reload  │
                    └─────────┘
```

### 3.2 Behavior Types

| Behavior | Strategy |
|----------|----------|
| **peeker** | Strafe in/out of cover, unpredictable |
| **rusher** | Sprint directly at enemy |
| **camper** | Hold angle, wait for enemy |
| **support** | Stay at medium range, assist |
| **awper** | Long-range, back away if enemy close |

### 3.3 Online Backfill

When a human player leaves GameRoom:
1. Check if human count < 4
2. Spawn bots to fill (difficulty 2 default)
3. Bots use same AI as training mode
4. Bots are removed when humans rejoin

---

## 4. Progress Tracking

### 4.1 Data Model

```typescript
interface PlayerRecord {
  id: string
  nickname: string
  skillRating: number       // ELO-like rating (1000 default)
  rankTier: RankTier        // unranked → bronze → ... → master
  totalMatches: number
  wins: number
  losses: number
  kills: number
  deaths: number
  headshots: number
  kdr: number
  winRate: number
  weapons: WeaponStats[]
}

interface WeaponStats {
  weapon: string
  kills: number
  shotsFired: number
  shotsHit: number
  headshots: number
  totalDamage: number
}
```

### 4.2 Rank Tiers

| Tier | Rating Range | Color |
|------|-------------|-------|
| Unranked | 0-999 | Gray |
| Bronze | 1000-1299 | Bronze |
| Silver | 1300-1599 | Silver |
| Gold | 1600-1899 | Gold |
| Platinum | 1900-2199 | Cyan |
| Diamond | 2200-2499 | Light Blue |
| Master | 2500+ | Orange |

### 4.3 Skill Rating (ELO)

```
New Rating = Old Rating + K × (Actual - Expected) + Performance Bonus
```

- **K-factor:** 64 for new players (<10 matches), 32 otherwise
- **Performance Bonus:** +5 for MVP, +3 for KDR ≥2, +2 for fast win
- **Bounds:** 0 (floor) to 3000 (ceiling)

---

## 5. Matchmaking

### 5.1 Solo Queue
- Skill-based matching (±200 SR tolerance)
- Match mode preference
- Queue timeout: 60s → broaden search

### 5.2 Party System
- Create party → get 6-char invite code
- Join by code → auto-join party
- Max 5 per party
- Party leader starts match

### 5.3 Private Lobby
- Password-protected rooms
- Bot fill option (1-5 bots)
- Configurable difficulty
- Team auto-balancing

---

## 6. File Structure

```
client/src/game/training/
├── Bot.tsx              # 3D bot with AI states
├── AimTrainer.tsx       # Bot spawning + UI
├── Target.tsx           # Static target (legacy)
├── RecoilPractice.tsx   # Spray pattern practice
└── TrainingRange.tsx    # Main training scene

server/src/rooms/
├── GameRoom.ts          # Main multiplayer room
└── TrainingRoom.ts      # Training room (solo)

server/src/ai/
└── BotAgent.ts          # Server-side bot AI

server/src/services/
└── ProgressStore.ts     # Player stats persistence

server/src/rating/
└── SkillRating.ts       # ELO rating system

shared/
└── index.ts             # PlayerState with isBot, botDifficulty
```

---

## 7. Controls

### Training Mode
| Key | Action |
|-----|--------|
| WASD | Move |
| Mouse | Aim |
| Left Click | Shoot |
| Right Click | ADS |
| R | Reload |
| Space | Jump |
| Shift | Sprint |
| C | Crouch/Slide |
| 1-3 | Switch weapon |
| B | Buy menu |
| Tab | Scoreboard |
| Esc | Menu |

### Difficulty Selection
- Click numbered buttons (1-5) in training UI
- Bot count: +/- buttons (1-5 bots)

---

## 8. Performance

| Aspect | Strategy | Target |
|--------|----------|--------|
| Bot AI | Think at 10Hz server, 60Hz client | <5% CPU/bot |
| Bot Count | Max 5 per room | 5v5 backfill |
| Training | Object pooling for bots | No GC spikes |
| Database | In-memory (prod: SQLite WAL) | <10ms query |
| Leaderboard | Cache in memory, refresh 5min | Instant read |
