# Dokumentasi CS Web FPS & Zombie Survival — Index (Offline v4.0 — 2026-08-23)

> **FULL OFFLINE 2026-08-23** — `Training | 5v5 Offline | Zombie Shooter v1 | L4D Campaign` semua jalan tanpa server. Verifikasi: `npm run typecheck --workspace=client` 0 error, `npm run build --workspace=client` OK (300k). Angka runtime di `shared` + `client/src/stores/use*Store.ts` + `ZombieEngine`/`L4DDirector`.

---

## Entry Point

| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Instalasi, jalankan project, ringkasan fitur |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level design & arsitektur |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | Aturan & angka gameplay (sinkronkan ke `shared/` bila drift) |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Referensi parameter kunci & rationale |
| [IMPROVEMENTS_AND_FIXES_AUDIT.md](IMPROVEMENTS_AND_FIXES_AUDIT.md) | Backlog P1–P3 (performa, polish, AI, mobile) |
| [GAMEPLAY_SYSTEM.md](GAMEPLAY_SYSTEM.md) | Training range, bot AI, rating |

---

## Feature Design (Offline 2026-08-23)

| Dokumen | Kode terkait (offline) |
| :--- | :--- |
| [Zombie_Shooter_System_v1.md](Zombie_Shooter_System_v1.md) | `ZombieEngine` `SpatialGrid` `HitDetection` `Instanced` `Barricade` — **Single Source** |
| [Design_Player.md](Design_Player.md) | `PlayerController` (FPS) + `ZombieArcadeController` + `useAimStore` |
| [Design_Weapons.md](Design_Weapons.md) | `ShootingSystem` offline (`isZombieArcade` l4d) + `WeaponModel` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | Legacy hitbox — sekarang offline `ZombieEngine.handleMelee`/`handleShoot`, `L4D` infected hp |
| [Design_Gameplay.md](Design_Gameplay.md) | `5v5 Offline` `Zombie Shooter` `L4D Campaign` START→FINISH |
| [Design_Audio.md](Design_Audio.md) | `AudioManager` offline |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | **LEGACY STUB** — tidak dipakai offline |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | `/training /offline5v5 /zombie /l4d` |
| [ZOMBIE_MODE.md](ZOMBIE_MODE.md) | Zombie Survival offline v1.0 (Outpost Z-7) |
| [L4D Campaign](L4D_Campaign) | `useL4DStore` `L4DDirector` `L4DCampaignMap` `L4DMode` SafeRoom START→Rescue FINISH 4ch |

---

## Mode & Status Kode (All Offline 2026-08-23)

| Mode | Status | START → FINISH |
| :--- | :--- | :--- |
| Training Range (aim + recoil) | ✅ Offline | Spawn `TRAINING_ARENA` → Target wall |
| 5v5 Offline (1+9 bots fixed 1/60) | ✅ Offline (gelap fixed 2026-08-23) | T-Spawn `-25` → CT `-25` → Bomb A/B `15,-15 / 12,15` |
| Zombie Shooter v1.0 (SpatialGrid 5 + Instanced) | ✅ Offline | SafeRoom `0,-30` → Corridor `8×70` → Rescue `0,30` |
| Left 4 Dead Campaign (Director 4ch, 42 cap) | ✅ Offline | SafeRoom `0,-36` → `cp1 -18 → cp2 8,0 → cp3 18` → Rescue `0,36*scale` |
| Legacy Online 5v5 (Colyseus) | ❌ Dihapus — stub `useNetworkStore` no-op |
| FFA / TDM / Gun Game | 🟨 roadmap |

---

## Catatan Pembersihan Docs

Dihapus karena sudah selesai diimplementasikan ke codebase:

- `CsGame_Offline_Zombie_Detailed_Analysis.md` → 39 poin perbaikan Offline 5v5 & Zombie Survival telah diimplementasikan
- `Master_Implementation_Checklist.md` → seluruh checklist v3.1 telah selesai dan terverifikasi di kode
- `GAMEPLAY_AND_IMPROVEMENTS_ROADMAP.md` → baseline status & rencana peningkatan awal telah diterapkan
- `Audit_QA_Independen.md` → temuan P0/P1 diterapkan di kode
- `Krunker_Style_Roadmap.md` → kontradiktif dengan kode aktual
- `Guide_Weapon_Buy_Controls.md` → panduan slot senjata sudah usang

Dokumen `Design_*` dan Bible **tetap** sebagai acuan desain sistem, mekanika, dan arsitektur fitur mendatang.
