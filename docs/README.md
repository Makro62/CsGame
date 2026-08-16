# 📚 Dokumentasi CS Web FPS & Zombie Survival — Index

> Semua dokumen di folder ini saling terhubung dan terverifikasi 100% terhadap kode aktual di workspace.  
> **Status diverifikasi terhadap kode** (v3.1 — 16 Agustus 2026).

---

## Peta Dokumen

### 1. 🔑 Entry Point & Game Mechanics
| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Panduan instalasi dan menjalankan project (dev server & build) |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level game design, game modes, dan arsitektur sistem |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | **Single source of truth** semua angka & aturan gameplay (5v5 & Zombie) |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Spesifikasi parameter kunci (senjata, ekonomi, bomb, stats) |
| [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) | Checklist lengkap seluruh 83 fitur dengan status verifikasi 100% ✅ |
| [GAMEPLAY_SYSTEM.md](GAMEPLAY_SYSTEM.md) | Arsitektur Training Range, AI bot, aiming & movement rating |

---

### 2. 🎨 Feature Design (Arsitektur & Spesifikasi)
| Dokumen | Kode Terkait |
| :--- | :--- |
| [Design_Player.md](Design_Player.md) | `client/src/game/player/` |
| [Design_Weapons.md](Design_Weapons.md) | `client/src/game/weapons/` + `shared/index.ts` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Gameplay.md](Design_Gameplay.md) | `server/src/rooms/GameRoom.ts` + `ZombieSurvivalRoom.ts` |
| [Design_Audio.md](Design_Audio.md) | `client/src/components/AudioManager.tsx` + `zombieSounds.ts` |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | `GameRoom.ts` + `useNetworkStore.ts` + `ZombieSurvivalRoom.ts` |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | `client/src/screens/` + `components/` |
| [Design_CSS_UI_System.md](Design_CSS_UI_System.md) | `client/src/ui/components/` |
| [Guide_Weapon_Buy_Controls.md](Guide_Weapon_Buy_Controls.md) | Buy menu, perk shop, & kontrol survivor |

---

## 🎮 Status Fitur & Kebenaran Kode

| Fitur / Mode | Kode Implementasi | Status |
| :--- | :--- | :---: |
| **Movement Tech Lengkap** | `PlayerController.tsx` | ✅ Selesai (Slide-hop, air strafe, moon-jump, wall jump) |
| **10 Senjata & Sistem Utilitas** | `shared/index.ts` → `WEAPONS` | ✅ Selesai (AK47, M4A1, AWP, MP5, Deagle, Glock, Tec9, Auto Pistol, Knife, Combat Knife) |
| **Competitive 5v5 Bomb Defusal** | `GameRoom.ts` + `EconomySystem.ts` | ✅ Selesai (15 ronde, buy phase, plant/defuse, overtime 7-7, forfeit `/ff`) |
| **Training Range & Gun Game** | `TrainingRange.tsx` + FFA FFA-HUD | ✅ Selesai (Aim trainer, recoil wall, target dummies) |
| **Map Container Yard v3** | `ContainerYard.tsx` + `MAP_OBSTACLES` | ✅ Selesai (3-lane layout, stepped ramp, material presets, minimap sync) |
| **Zombie Survival Mode v3.1** | `ZombieSurvivalRoom.ts` + client | ✅ Selesai (1-4 co-op & solo, Wave 1-∞, Boss, Pack-a-Punch, Mystery Box, Outpost Z-7 radar mini-map, pre-game setup) |
| **Anti-Cheat & Networking** | `AntiCheatSystem.ts` + Colyseus | ✅ Selesai (Speed/fire-rate/ammo/flood anti-cheat, lag compensation 200ms) |
