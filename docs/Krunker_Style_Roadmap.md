# CS Web FPS - Krunker.io Style Game Development Roadmap

> **Status tracker for Krunker-style features.** Verified against codebase.
> **See also:** [README.md](../README.md) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) • [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md)

## Current State (v2.1)
| Area | Status | Evidence |
| :--- | :--- | :--- |
| **Movement** | ✅ Complete | Slide-hop, air strafing, moon-jump, short-hop → `PlayerController.tsx` |
| **Weapons** | ✅ 10 weapons | AK47, M4A1, AWP, MP5, Deagle, Glock, Tec-9, Auto Pistol, Knife, Combat Knife → `shared/index.ts` |
| **Maps** | ✅ 2 maps | Container Yard + Dust → `client/src/game/map/` |
| **Multiplayer** | ✅ Colyseus | Bomb Defusal 5v5 + KOTH + FFA/TDM (server-side) → `GameRoom.ts` |
| **Training** | ✅ | Aim trainer + recoil practice → `client/src/game/training/` |
| **HUD** | ✅ 17+ components | Crosshair, kill feed, minimap, leaderboard, KOTH UI, server browser, etc. |
| **Audio** | ✅ Procedural | Web Audio synth + footstep sounds → `AudioManager.tsx` + `FootstepPlayer.tsx` |
| **Kill Cam** | ✅ | 3s replay with red border → `useKillCamStore.ts` + `KillCam.tsx` |
| **Server Browser** | ✅ | Real-time room listing via Colyseus LobbyRoom → `ServerBrowser.tsx` |
| **Build** | ✅ | 0 TypeScript errors, client + server |

## Feature Status

### ✅ Completed
- [x] WASD movement + pointer lock
- [x] Muzzle flash + shell casings (pooled)
- [x] Bullet tracers (Zustand-based) → `TracerManager.tsx`
- [x] Real ping measurement (ping/pong)
- [x] Settings menu (sensitivity, slide control, volume)
- [x] Chat system with rate limiting
- [x] FFA / TDM / KOTH mode logic (server-side)
- [x] KOTH UI with capture progress → `KOTH.tsx`
- [x] Volume settings (master/sfx/music)
- [x] Vote kick with cooldown
- [x] Solo player can start match (threshold 1)
- [x] Kill cam replay → `useKillCamStore.ts`
- [x] Server browser with lobby → `ServerBrowser.tsx`
- [x] Crosshair customization → `Crosshair.tsx`
- [x] Weapon stats in buy menu → `BuyMenu.tsx`
- [x] Bomb carrier indicator → `Minimap.tsx`
- [x] Reload progress bar → `HUD.tsx`
- [x] Death recap → `DeathScreen.tsx`
- [x] Footstep sounds → `FootstepPlayer.tsx`
- [x] Map selector in main menu → `MainMenu.tsx`
- [x] Input sequence validation (server)
- [x] Input rate limiting (server)
- [x] Graceful shutdown handlers (server)
- [x] Spawn protection fix (server)

### 🔲 Not Implemented
| Feature | Notes |
| :--- | :--- |
| Player walk/jump/crouch animations | Remote players have crouch scale, no walk anim |
| Death ragdoll | Not implemented |
| Sound files + spatial 3D audio | Audio is procedural, no HRTF |
| Grenade sync to server | Throw is client-only, damage not validated server-side |
| Interest management | Not implemented |
| Keybind customization | Not implemented |
| Enhanced scoreboard / XP / levels | Not implemented |
| 3+ map votes | 2 maps exist, no voting system |
| 5+ new weapons | Not implemented |
| Wallbang / bullet penetration | Not implemented (spec exists in docs only) |

## Design Decision: No Class System

The original roadmap planned 8 classes (Triggerman, Agent, Runner, etc.) with different HP/speed.
**Final decision: REJECTED** because:
1. Conflicts with CS:GO-style loadout + economy system
2. All players have uniform HP/speed (100 HP) for consistent TTK
3. Class references removed from all code

Replacement: **per-round buy phase loadout** (see `Design_Gameplay.md`).

## Game Mode Status

| Mode | Status | Details |
| :--- | :--- | :--- |
| Bomb Defusal 5v5 | ✅ Complete | 15 rounds, buy phase, plant/defuse, overtime |
| King of the Hill | ✅ Complete | Capture zones, progress bar, first to 3 captures wins |
| FFA Deathmatch | 🟨 Server-only | `set_game_mode "ffa"`; no client UI |
| Team Deathmatch | 🟨 Server-only | `set_game_mode "tdm"`; no client UI |
| Gun Game | 🔲 Not started | Not in codebase |

## Implementation Priorities

### High Priority (Next)
1. Client UI for FFA/TDM mode selection
2. Grenade sync + server-side damage validation
3. Lag compensation / server rewind
4. Player walk/jump/crouch animations

### Medium Priority
1. Keybind customization
2. Footstep spatial audio upgrade
3. Map voting system
4. Reconnection flow

### Low Priority (Nice to Have)
1. Custom crosshairs
2. Player progression / XP
3. Spectator broadcast
4. Death ragdoll
