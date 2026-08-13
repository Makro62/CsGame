# Phase 5: Bomb Defusal Mode & Sistem Ekonomi (v2.0)

Mode utama: Tanam/Jinakkan bom + sistem ekonomi, ala CS:GO. Termasuk overtime & sudden death (BARU v2.0).

> **Referensi:** [Design_Gameplay.md](Design_Gameplay.md) • [Impl_Guide_Server.md](Impl_Guide_Server.md) • [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md#chapter-5-bomb-guide)

## Prerequisites

- Phase 2.5 (Colyseus sync) selesai.
- Phase 4 (multiplayer server) selesai.

## 1. Flow Ronde & State Machine Server

- Buy Phase 15s (skip 8/10 ready) → Active 1m55s → Round End 4s → reset.
- First-to-8, maks 15 ronde; Half-time swap di ronde 8.
- **v2.0 BARU:** OT di 7-7 (first-to-9, maks 2 ronde); **sudden death** di 8-8 (1 ronde, full loadout, tanpa buy).

## 2. Sistem Bom C4

- Plant 3s (tidak boleh gerak); timer 40s setelah tanam; defuse 10s / 5s (kit).
- Cancel: bergerak → progress plant/defuse hilang.
- Audio: beep 1s → plant → stabil 4s → beep tempo 1.5s, panik <10s ([Design_Audio.md](Design_Audio.md)).

## 3. Ekonomi & Buy Menu (v2.0)

| Aksi | Reward |
| :--- | :--- |
| Kill rifle / AWP / SMG | $300 / $100 / $600 |
| Win ronde | +$3,250 |
| Loss ronde (Loss 1 / Loss 2+) | +$1,400 / +$1,900 |
| Plant / defuse bonus | $300 / $300 |
| Cap | $16,000 |

**Rekomendasi: [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md#chapter-3-economy-deep-dive).**

## Rollback Procedure

- Economy bug → cek hanya satu sumber update (server-side), jangan client-side store.
- OT trigger salah → verifikasi kondisi `7-7` vs `roundEnd` timing.

## Verification Steps

- [ ] Buy Phase → Active Phase dengan ready-skip 8/10.
- [ ] Tombol B hanya membuka Buy Menu di Buy Zone + Buy Phase.
- [ ] Plant → 40s → meledak = T menang; defuse 5/10s = CT menang.
- [ ] Uang bertambah presisi (kill/win/loss/streak/plant/defuse).
- [ ] OT muncul saat 7-7; sudden death di 8-8.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Buy menu terbuka di tengah map | Validasi zona: jarak ke Buy Zone coordinates |
| Timer C4 tidak sync | Timer dihitung server-side; client hanya render |
| Loss streak bonus tidak naik | Simpan counter streak per tim di GameState |
