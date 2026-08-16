# 📚 Dokumentasi CS Web FPS — Index

> Semua dokumen di folder ini saling terhubung. Mulai dari sini untuk orientasi.  
> **Status diverifikasi terhadap kode** (2026-08). Dokumen panduan implementasi fitur CS yang sudah selesai dihapus — angka & aturan tetap di Bible / Analysis.

## Peta Dokumen

### 1. 🔑 Entry Point (Baca Dulu)
| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Cara menjalankan project (dev server) |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level game design & game loop |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | **Single source of truth** semua angka & aturan gameplay |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Angka kunci (senjata, ekonomi, bomb) di `@cs-game/shared` |
| [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) | Checklist fitur + status |
| [Krunker_Style_Roadmap.md](Krunker_Style_Roadmap.md) | Roadmap gaya Krunker.io |
| [GAMEPLAY_SYSTEM.md](GAMEPLAY_SYSTEM.md) | Arsitektur Training Range, AI bot, progress/rating |

### 2. 🛠️ Proses Implementasi Aktif (kerjakan dari sini)
| Dokumen | Isi |
| :--- | :--- |
| [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) | **Perbaikan bentuk + visual** map CS Container Yard (Fase A→C) |
| [Impl_Zombie_Survival.md](Impl_Zombie_Survival.md) | **Perbaikan Zombie Survival** ke playable (Gelombang 1→6) |
| [Zombie_Survival_Code_Review.md](Zombie_Survival_Code_Review.md) | Inventory defect P0–P3 (sumber ID untuk Impl Zombie) |

### 3. 🎨 Feature Design (referensi desain CS yang sudah di kode)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Design_Player.md](Design_Player.md) | `client/src/game/player/` |
| [Design_Weapons.md](Design_Weapons.md) | `client/src/game/weapons/` + `shared/index.ts` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Gameplay.md](Design_Gameplay.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Audio.md](Design_Audio.md) | `client/src/components/AudioManager.tsx` |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | `GameRoom.ts` + `useNetworkStore.ts` |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | `client/src/screens/` + `components/` |
| [Design_CSS_UI_System.md](Design_CSS_UI_System.md) | `client/src/ui/components/` |

### 4. ⚖️ Panduan Pemain
| Dokumen | Isi |
| :--- | :--- |
| [Guide_Weapon_Buy_Controls.md](Guide_Weapon_Buy_Controls.md) | Buy menu & kontrol |

## Kebenaran Kode (Apa yang Benar-Benar Ada)

| Fitur | Kode | Catatan |
| :--- | :--- | :--- |
| Movement tech lengkap | `PlayerController.tsx` | Slide-hop, air strafe, moon-jump, wall jump |
| 10 senjata | `shared/index.ts` → `WEAPONS` | AK47, M4A1, AWP, MP5, Deagle, Glock, Tec9, Auto Pistol, Knife, Combat Knife |
| Bomb defusal + ekonomi | `GameRoom.ts` | 5v5, 15 ronde, overtime, forfeit `/ff` |
| Mode ffa/tdm/koth/gun_game | `GameRoom.ts` → `set_game_mode` | Gun Game UI ada; ffa/tdm/koth server-only tanpa UI penuh |
| Anti-cheat dasar | `AntiCheatSystem.ts` | Speed/fire-rate/ammo/input-flood |
| Map Container Yard v2.2 | `ContainerYard.tsx` + `MAP_OBSTACLES` | Perbaikan v3 → [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) |
| Zombie Survival | `ZombieSurvivalRoom.ts` + client | Fondasi ~60%; perbaikan → [Impl_Zombie_Survival.md](Impl_Zombie_Survival.md) |

## Cara Memperbarui Docs

1. Ubah kode → update angka di `Gameplay_Mechanics_Bible.md` (sumber kebenaran).
2. Update status fitur di `Master_Implementation_Checklist.md` (jangan ✅ sebelum terverifikasi di kode + wiring).
3. Kerja aktif map/zombie: centang langkah di `Impl_*.md`; defect zombie di `Zombie_Survival_Code_Review.md`.
