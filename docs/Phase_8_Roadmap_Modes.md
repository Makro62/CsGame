# Phase 8: Roadmap Mode Tambahan (Post-MVP) (v2.0)

Fitur yang tidak wajib untuk MVP, dijadwalkan pasca-rilis. Angka di sini sudah dikunci di [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md#chapter-11-mode-roadmap).

> **Referensi:** [Design_Gameplay.md](Design_Gameplay.md) (Roadmap) • [Gameplay_Balance_Rationale.md](Gameplay_Balance_Rationale.md) • [Krunker_Style_Roadmap.md](Krunker_Style_Roadmap.md) (tracker status umum)

## Status Implementasi (diverifikasi 2026-08)

| Mode | Status | Detail |
| :--- | :--- | :--- |
| FFA Deathmatch | 🟨 Server-only | Mode string `"ffa"` diterima `set_game_mode` di `GameRoom.ts`; **belum ada UI pemilihan mode / flow spawn di client** |
| Gun Game | 🔲 Belum | Tidak ada kode sama sekali |
| TDM | 🟨 Server-only | Mode string `"tdm"` diterima `set_game_mode`; **belum ada UI client** |
| KOTH | 🟨 Server-only | Mode string `"koth"` diterima `set_game_mode`; **belum ada UI client** |

**Next step:** Tambah UI mode selection di `client/src/screens/MainMenu.tsx` + kirim `set_game_mode` sebelum `join`.

## Prerequisites

- MVP (Phase 0-7) selesai & stabil.
- Kompabilitas schema: semua mode pakai GameState yang sama (tambah field mode).

## 1. Free For All (FFA) Deathmatch

- Tanpa tim, 8-12 pemain.
- **Tujuan: 20 kill (min. selisih skor 5)** — mencegah spawn-kill farm.
- Respawn 2s, random spawn, senjata bebas, tanpa ekonomi.

## 2. Gun Game (Arms Race)

- Progresi: Deagle → MP5 → AK-47 → M4A1-S → Deagle → AWP → Knife (20 level).
- Kill = naik level; mati ditikam = turun level; **knife kill pertama = menang**.

## 3. Team Deathmatch (TDM)

- 5v5, respawn cepat, tanpa ronde.
- Target: 75 kills tim (atau waktu habis).
- Spawn protection 1.5s (invulnerability).

## 4. Movement & Combat Lanjutan (Opsional)

- Curve slide presisi + melee combat (slash kiri / stab kanan).
- Grenade trajectory preview (garis putus-putus selama tahan R).

## Rollback Procedure

- Mode baru merusak schema → version field + migration (v1 → v2) di shared.
- Jika matchmaking tidak seimbang → bot backfill (bukan priority FFA).

## Verification Steps

- [ ] FFA 20 kill dengan gap 5 → match end dini sesuai aturan.
- [ ] Gun game naik/turun level benar (termasuk knife down-level).
- [ ] TDM 75 kills; respawn + protection bekerja.
- [ ] Schema tetap backward-compatible (client lama bisa join).

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Mode tercampur backend | Simpan `mode` di room metadata; validasi handler per mode |
| Knife kill tidak register | Server-side melee range check + cooldown 0.5s |
| Spawn-kill di FFA | Random spawn + protection 1.5 + poin minimal gap |
