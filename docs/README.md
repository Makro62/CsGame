# 📚 Dokumentasi CS Web FPS — Index

> Semua dokumen di folder ini saling terhubung. Mulai dari sini untuk orientasi.
> **Status diverifikasi langsung terhadap kode** (2026-08). Fitur yang disebut "selesai" di docs lama tapi tidak ada di kode ditandai di [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md).

## Peta Dokumen

### 1. 🔑 Entry Point (Baca Dulu)
| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Cara menjalankan project (dev server) |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level game design & game loop |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | **Single source of truth** semua angka & aturan gameplay |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Angka kunci (senjata, ekonomi, bomb) yang dikunci di `@cs-game/shared` |
| [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) | Checklist 74 task dengan status per fitur |
| [Document_Implementation_Checklist.md](Document_Implementation_Checklist.md) | Status implementasi per dokumen |
| [Krunker_Style_Roadmap.md](Krunker_Style_Roadmap.md) | Roadmap gaya Krunker.io + tracker fitur selesai/belum |

### 2. 🎨 Feature Design (`Design_*.md`)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Design_Player.md](Design_Player.md) | `client/src/game/player/` |
| [Design_Weapons.md](Design_Weapons.md) | `client/src/game/weapons/` + `shared/index.ts` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Gameplay.md](Design_Gameplay.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Map_Layout.md](Design_Map_Layout.md) | `client/src/game/map/ContainerYard.tsx` |
| [Design_Audio.md](Design_Audio.md) | `client/src/components/AudioManager.tsx` |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | `server/src/rooms/GameRoom.ts` + `client/src/stores/useNetworkStore.ts` |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | `client/src/screens/` + `client/src/components/` |
| [Design_CSS_UI_System.md](Design_CSS_UI_System.md) | `client/src/components/` (pure CSS) |

### 3. 🛠️ Implementation Guides (`Impl_Guide_*.md`)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Impl_Guide_Movement.md](Impl_Guide_Movement.md) | `client/src/game/player/PlayerController.tsx` |
| [Impl_Guide_Weapons.md](Impl_Guide_Weapons.md) | `client/src/game/weapons/ShootingSystem.tsx` + `RecoilController.ts` |
| [Impl_Guide_Map.md](Impl_Guide_Map.md) | `client/src/game/map/ContainerYard.tsx` |
| [Impl_Guide_HUD_UI.md](Impl_Guide_HUD_UI.md) | `client/src/components/HUD.tsx` |
| [Impl_Guide_Server.md](Impl_Guide_Server.md) | `server/src/rooms/GameRoom.ts` |

### 4. 🚀 Phase Roadmaps (`Phase_*.md`)
| Fase | Isi |
| :--- | :--- |
| [Phase_0_Monorepo_Setup.md](Phase_0_Monorepo_Setup.md) | Setup monorepo + shared schema |
| [Phase_1_Setup_Environment.md](Phase_1_Setup_Environment.md) | React + Vite + R3F |
| [Phase_2_Player_Controller.md](Phase_2_Player_Controller.md) | Character controller & movement tech |
| [Phase_2.5_Colyseus_Sync.md](Phase_2.5_Colyseus_Sync.md) | Sync multiplayer + prediction |
| [Phase_3_Weapon_Mechanics.md](Phase_3_Weapon_Mechanics.md) | Senjata, raycast, recoil |
| [Phase_4_Multiplayer_Setup.md](Phase_4_Multiplayer_Setup.md) | Health sync, damage, kill feed |
| [Phase_4.5_Training_Range.md](Phase_4.5_Training_Range.md) | Training range single player |
| [Phase_5_Bomb_Defusal.md](Phase_5_Bomb_Defusal.md) | Mode 5v5 Bomb Defusal + ekonomi |
| [Phase_5.5_Map_Integration.md](Phase_5.5_Map_Integration.md) | Integrasi map 3D |
| [Phase_6_Audio_3D.md](Phase_6_Audio_3D.md) | Audio (procedural; HRTF = roadmap) |
| [Phase_7_Polish_HUD.md](Phase_7_Polish_HUD.md) | Polish HUD, minimap, network monitor |
| [Phase_8_Roadmap_Modes.md](Phase_8_Roadmap_Modes.md) | Mode FFA/TDM/KOTH/Gun Game |

### 5. ⚖️ Referensi & Panduan
| Dokumen | Isi |
| :--- | :--- |
| [Gameplay_Balance_Rationale.md](Gameplay_Balance_Rationale.md) | Alasan di balik angka balance |
| [Guide_Weapon_Buy_Controls.md](Guide_Weapon_Buy_Controls.md) | Panduan buy menu & kontrol |

## Kebenaran Kode (Apa yang Benar-Benar Ada)

| Fitur | Kode | Catatan |
| :--- | :--- | :--- |
| Movement tech lengkap | `PlayerController.tsx` | Slide-hop, air strafe, moon-jump |
| 10 senjata | `shared/index.ts` → `WEAPONS` | AK47, M4A1, AWP, MP5, Deagle, Glock, Tec9, Auto Pistol, Knife, Combat Knife |
| Bomb defusal + ekonomi | `GameRoom.ts` | 5v5, 15 ronde, overtime |
| Mode ffa/tdm/koth | `GameRoom.ts` → `set_game_mode` | **Server-only, tanpa UI client** |
| Chat, Settings, Ping, Minimap | `client/src/components/` | Aktif & ter-mount |
| Vote kick UI | `client/src/components/VoteKick.tsx` + handler di `GameRoom.ts` | ✅ Berfungsi (tombol KICK di Leaderboard) |
| Grenade throw | `client/src/game/weapons/GrenadeSystem.tsx` | ⚠️ Client-only (tanpa validasi server) |

## Fitur yang HANYA Ada di Docs (Bukan Implementasi)

Wallbang/penetration • HRTF audio • Lag compensation/rewind • Anti-cheat • Interest management • Spectator broadcast • Reconnect 60s • Nade trajectory preview • Callout labels • Class system (dibatalkan) • Gun Game • UI mode selection

> Lihat status detail per fitur di [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) dan roadmap di [Krunker_Style_Roadmap.md](Krunker_Style_Roadmap.md).

## Cara Memperbarui Docs

1. Ubah kode → update angka di `Gameplay_Mechanics_Bible.md` (sumber kebenaran).
2. Update status fitur di `Master_Implementation_Checklist.md`.
3. Update status dokumen di `Document_Implementation_Checklist.md`.
4. Jangan pernah menandai fitur ✅ sebelum terverifikasi di kode.
