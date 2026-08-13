# CS Web FPS - Krunker.io Style Game Development Roadmap

> **Dokumen ini adalah roadmap & status tracker gaya Krunker.io.** Status di bawah diverifikasi langsung terhadap kode.
> **Baca juga:** [README.md](../README.md) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (angka kunci) • [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) (checklist terperinci) • [Phase_8_Roadmap_Modes.md](Phase_8_Roadmap_Modes.md) (mode game) • [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md)

## Overview
Dokumen ini melacak transformasi CS Web FPS menjadi browser FPS bergaya Krunker.io: movement cepat, multiple game modes, dan visual polish. **Catatan: class system (8 kelas) sengaja TIDAK diimplementasikan** — keputusan desain di [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) memilih sistem loadout/ekonomi CS:GO, bukan class Krunker.

## Current State (v2.0)
| Area | Status | Bukti Kode |
| :--- | :--- | :--- |
| **Movement** | ✅ Lengkap | Slide-hop, air strafing, moon-jump, short-hop → `client/src/game/player/PlayerController.tsx` |
| **Weapons** | ✅ 10 senjata | AK47, M4A1, AWP, MP5, Deagle, Glock, Tec-9, Auto Pistol, Knife, Combat Knife → `shared/index.ts` + `client/src/game/weapons/ShootingSystem.tsx` |
| **Map** | ✅ 1 map | Container Yard 60×40m → `client/src/game/map/ContainerYard.tsx` |
| **Multiplayer** | ✅ Colyseus | Bomb Defusal 5v5 + ekonomi + mode `ffa`/`tdm`/`koth` (server-side) → `server/src/rooms/GameRoom.ts` |
| **Training** | ✅ | Aim trainer + recoil practice → `client/src/game/training/` |
| **HUD** | ✅ 17 komponen | Crosshair, kill feed, minimap, leaderboard, dll → `client/src/components/` |
| **Audio** | ✅ Procedural | Web Audio synth (bukan file sound, bukan HRTF) → `client/src/components/AudioManager.tsx` |
| **Build** | ✅ | 0 TypeScript errors, client + server |

## Target Features (Krunker.io Style)

### ✅ Selesai
- [x] Fix WASD movement (ClickToPlay overlay pointer lock) — `client/src/components/ClickToPlayOverlay.tsx`
- [x] Muzzle flash + shell casings (visual polish) — `client/src/game/effects/VisualEffects.tsx`
- [x] Real ping measurement (event `ping`/`pong`) — `server/src/rooms/GameRoom.ts` + `FpsPingDisplay.tsx`
- [x] Settings menu (sensitivity, slide control, volume) — `client/src/screens/SettingsMenu.tsx` + `useSettingsStore.ts`
- [x] Chat system — `client/src/components/ChatSystem.tsx`
- [x] FFA / TDM / KOTH mode logic di server (`set_game_mode`) — **belum ada UI pemilihan mode di main menu**
- [x] Volume settings (master/sfx/music)
- [x] Vote kick (UI `VoteKick.tsx` + handler `vote_request`/`vote_kick` di server, tombol KICK di Leaderboard)
- [x] Solo player bisa langsung mulai match (threshold 1 pemain)

### 🔲 Belum (Roadmap Terbuka)
| Fitur | Catatan |
| :--- | :--- |
| Movement trail / afterimage | Belum ada |
| Player walk/jump/crouch animations | Belum ada (model statis) |
| Bullet tracers | Client punya impact spark, belum ada tracer beam |
| Death ragdoll | Belum ada |
| Screen shake | Belum ada |
| Sound files + spatial 3D audio | Audio masih procedural, tanpa HRTF |
| Footstep sounds | Belum ada |
| Grenade sync ke server | Throw masih client-only (`GrenadeSystem.tsx`), damage tidak divalidasi server |
| Reconnection logic | Belum ada |
| Interest management | Belum ada |
| Keybind customization | Belum ada |
| Enhanced scoreboard / XP / levels | Belum ada |
| 2-3 map baru + map voting | Belum ada |
| Map callouts | Belum ada |
| 5+ senjata baru | Belum ada |
| Wallbang / bullet penetration | **Tidak diimplementasikan** — docs lain yang menyebut "selesai" adalah keliru |
| Lag compensation / server rewind | Tidak diimplementasikan |
| Anti-cheat (7 checks) | Tidak diimplementasikan |
| Spectator broadcast | Tidak diimplementasikan (UI `SpectatorHUD.tsx` tanpa logic server) |
| Reconnect flow 60s | Tidak diimplementasikan |

---

## Keputusan Desain: Tidak Ada Class System

Roadmap awal merencanakan 8 class ala Krunker (Triggerman, Agent, Runner, Hunter, Detective, Trooper, Spray N Pray, Rocketeer) dengan HP/speed berbeda.
**Keputusan final: DITOLAK dan DIHAPUS** karena:
1. Bertentangan dengan sistem loadout + ekonomi CS:GO (`BuyMenu.tsx`, server `buy` handler)
2. Semua pemain diharapkan HP/speed seragam (100 HP, speed default) agar hitbox & TTK konsisten
3. Referensi class sudah dihapus total dari `shared/index.ts`, `GameRoom.ts`, dan client

Sistem yang dipilih sebagai pengganti class: **loadout buy phase per-round** (lihat [Design_Gameplay.md](Design_Gameplay.md) + [Impl_Guide_Server.md](Impl_Guide_Server.md)).

---

## Game Mode Design

| Mode | Status | Detail Implementasi |
| :--- | :--- | :--- |
| Bomb Defusal 5v5 | ✅ Lengkap | 15 ronde, buy phase, plant/defuse, overtime → [Phase_5_Bomb_Defusal.md](Phase_5_Bomb_Defusal.md) |
| FFA Deathmatch | 🟨 Server-only | `set_game_mode "ffa"`, kill score; **belum ada UI client** |
| Team Deathmatch | 🟨 Server-only | `set_game_mode "tdm"`; **belum ada UI client** |
| King of the Hill | 🟨 Server-only | `set_game_mode "koth"`; **belum ada UI client** |
| Gun Game | 🔲 Belum | Tidak ada di kode |

**Next step utama:** UI pemilihan mode di `MainMenu.tsx` + mekanik spawn/round untuk ffa/tdm/koth agar bisa dimainkan dari browser.

---

## Implementation Priorities

### High Priority (Next)
1. UI pemilihan mode game (FFA/TDM/KOTH) di main menu
2. Grenade sync + validasi damage server-side
3. Wallbang system (2-pass raycast) atau hapus klaim dari docs
4. Lag compensation / server rewind
5. Verifikasi state sync multiplayer di browser (HUD timer/buy phase)

### Medium Priority
1. Player animations (walk/jump/crouch)
2. Bullet tracers + death ragdoll
3. Footstep sounds + spatial audio upgrade
4. Keybind customization
5. Reconnection logic

### Low Priority (Nice to Have)
1. Custom crosshairs
2. Map voting + callouts
3. Player progression / XP
4. Spectator broadcast lengkap
5. Movement trail / afterimage
