# 📚 Dokumentasi CS Web FPS — Index

> Semua dokumen di folder ini saling terhubung. Mulai dari sini untuk orientasi.
> **Status diverifikasi langsung terhadap kode** (2026-08). Fitur yang disebut "selesai" di docs lama tapi tidak ada di kode ditandai di [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md).

## Peta Dokumen

### 1. 🔑 Entry Point (Baca Dulu)
| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Cara menjalankan project (dev server) |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level game design & game loop |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | **Single source of truth** semua angka & aturan gameplay (+ balance rationale) |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Angka kunci (senjata, ekonomi, bomb) yang dikunci di `@cs-game/shared` |
| [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) | Checklist 74 task dengan status per fitur |
| [Krunker_Style_Roadmap.md](Krunker_Style_Roadmap.md) | Roadmap gaya Krunker.io + tracker fitur selesai/belum |
| [GAMEPLAY_SYSTEM.md](GAMEPLAY_SYSTEM.md) | Arsitektur Training Range, AI bot, progress/rating |

### 2. 🎨 Feature Design (`Design_*.md`)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Design_Player.md](Design_Player.md) | `client/src/game/player/` |
| [Design_Weapons.md](Design_Weapons.md) | `client/src/game/weapons/` + `shared/index.ts` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Gameplay.md](Design_Gameplay.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Map_Layout.md](Design_Map_Layout.md) | `client/src/game/map/ContainerYard.tsx` (v2.2 3-lane) |
| [Design_Audio.md](Design_Audio.md) | `client/src/components/AudioManager.tsx` |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | `server/src/rooms/GameRoom.ts` + `client/src/stores/useNetworkStore.ts` |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | `client/src/screens/` + `client/src/components/` |
| [Design_CSS_UI_System.md](Design_CSS_UI_System.md) | `client/src/ui/components/` (GlassPanel system) |

### 3. 🛠️ Implementation Guides (`Impl_Guide_*.md`)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Impl_Guide_Movement.md](Impl_Guide_Movement.md) | `client/src/game/player/PlayerController.tsx` |
| [Impl_Guide_Weapons.md](Impl_Guide_Weapons.md) | `client/src/game/weapons/ShootingSystem.tsx` + `RecoilController.ts` |
| [Impl_Guide_Map.md](Impl_Guide_Map.md) | `client/src/game/map/ContainerYard.tsx` |
| [Impl_Guide_Server.md](Impl_Guide_Server.md) | `server/src/rooms/GameRoom.ts` |
| [Impl_Guide_New_UI_System.md](Impl_Guide_New_UI_System.md) | `client/src/ui/components/hud/` (HUDLayout, GlassPanel) |

### 4. ⚖️ Referensi & Panduan
| Dokumen | Isi |
| :--- | :--- |
| [Guide_Weapon_Buy_Controls.md](Guide_Weapon_Buy_Controls.md) | Panduan buy menu & kontrol |

## Kebenaran Kode (Apa yang Benar-Benar Ada)

| Fitur | Kode | Catatan |
| :--- | :--- | :--- |
| Movement tech lengkap | `PlayerController.tsx` | Slide-hop, air strafe, moon-jump, wall jump |
| 10 senjata | `shared/index.ts` → `WEAPONS` | AK47, M4A1, AWP, MP5, Deagle, Glock, Tec9, Auto Pistol, Knife, Combat Knife |
| Bomb defusal + ekonomi | `GameRoom.ts` | 5v5, 15 ronde, overtime, forfeit `/ff` |
| Mode ffa/tdm/koth/gun_game | `GameRoom.ts` → `set_game_mode` | **Server-only, tanpa UI client** |
| Anti-cheat dasar | `server/src/rooms/AntiCheatSystem.ts` | Speed/fire-rate/ammo/input-flood validation |
| Interest management | `server/src/rooms/InterestManager.ts` | Filter sync 60m + LOS |
| Lag compensation | `WeaponManager.ts` | Server rewind maks 200ms |
| Chat, Settings, Ping, Minimap | `client/src/components/` | Aktif & ter-mount |
| Vote kick + Forfeit | `GameRoom.ts` + HUD | ✅ Berfungsi |
| Map v2.2 3-lane | `ContainerYard.tsx` + `MAP_OBSTACLES` | Mid/Site A/Site B redesain |

## Cara Memperbarui Docs

1. Ubah kode → update angka di `Gameplay_Mechanics_Bible.md` (sumber kebenaran).
2. Update status fitur di `Master_Implementation_Checklist.md`.
3. Jangan pernah menandai fitur ✅ sebelum terverifikasi di kode.
