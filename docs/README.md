# Dokumentasi CS Web FPS & Zombie Survival — Index

> Status diverifikasi terhadap kode (16 Agustus 2026).  
> Angka gameplay yang mengikat ada di `shared/index.ts`; dokumen di sini adalah spek & backlog, bukan sumber kebenaran runtime.

---

## Entry Point

| Dokumen | Isi |
| :--- | :--- |
| [../README.md](../README.md) | Instalasi, jalankan project, ringkasan fitur |
| [../Game_Design_Document.md](../Game_Design_Document.md) | High-level design & arsitektur |
| [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) | Aturan & angka gameplay (sinkronkan ke `shared/` bila drift) |
| [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) | Referensi parameter kunci & rationale |
| [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) | Checklist fitur terverifikasi |
| [IMPROVEMENTS_AND_FIXES_AUDIT.md](IMPROVEMENTS_AND_FIXES_AUDIT.md) | Backlog P1–P3 (performa, polish, AI, mobile) |
| [GAMEPLAY_SYSTEM.md](GAMEPLAY_SYSTEM.md) | Training range, bot AI, rating |

---

## Feature Design

| Dokumen | Kode terkait |
| :--- | :--- |
| [Design_Player.md](Design_Player.md) | `client/src/game/player/` |
| [Design_Weapons.md](Design_Weapons.md) | `client/src/game/weapons/` + `shared/index.ts` |
| [Design_Combat_Kill.md](Design_Combat_Kill.md) | `server/src/rooms/GameRoom.ts` |
| [Design_Gameplay.md](Design_Gameplay.md) | `GameRoom.ts` + `ZombieSurvivalRoom.ts` |
| [Design_Audio.md](Design_Audio.md) | `AudioManager.tsx` + `zombieSounds.ts` |
| [Design_Networking_Advanced.md](Design_Networking_Advanced.md) | Networking + anti-cheat |
| [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) | Screens + map geometry |
| [Design_CSS_UI_System.md](Design_CSS_UI_System.md) | HUD CSS |
| [ZOMBIE_MODE.md](ZOMBIE_MODE.md) | Zombie Survival (Outpost Z-7, AI, PaP, Elemental, Wonder Weapon) |

---

## Mode & Status Kode

| Mode | Status |
| :--- | :---: |
| Competitive 5v5 Bomb Defusal | ✅ |
| Training Range (aim + recoil) | ✅ |
| Zombie Survival (shop, PaP, wave, revive, extraction) | ✅ |
| Anti-cheat 5v5 + Zombie (real-dt, speed, fire-rate, flood) | ✅ |
| FFA / TDM / Gun Game UI | 🟨 partial / roadmap |

---

## Catatan Pembersihan Docs

Dihapus karena sudah diimplementasi atau usang:

- `Audit_QA_Independen.md` → temuan P0/P1 diterapkan di kode
- `Krunker_Style_Roadmap.md` → kontradiktif dengan kode aktual
- `Guide_Weapon_Buy_Controls.md` → panduan slot senjata sudah usang

Dokumen `Design_*` dan Bible **tetap** karena masih berisi spek yang belum 100% (ragdoll, audio occlusion, FFA UI, dll.). Sinkronkan angka lag-comp ke **200ms** saat mengeditnya.
