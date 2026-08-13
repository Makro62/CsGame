# Gameplay Balance Rationale (v2.0)

> **Referensi:** [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) • [Design_Weapons.md](Design_Weapons.md) • [Design_Player.md](Design_Player.md)

Rasional di balik SETIAP angka balance: kenapa senjata sekarat ini, kenapa ekonominya begini, kenapa movement tech ada. Tujuan akhir: **fair fight + skill expression + tidak ada dominant strategy**.

---

## Chapter 1: Weapon TTK Math

### TTK per senjata (headshot/torso)

| Senjata | DPS torso | TTK @100HP (torso) | TTK (head) |
| :--- | :--- | :--- | :--- |
| AK-47 | 350 | 0.29s | 0.10s (HS) |
| M4A1-S | 341 | 0.29s | 0.11s |
| AWP | 96/detik (per-shot dmg 115) | 0.01s (1-shot) | 0.01s (1-shot) |
| Deagle | 176 | 0.57s | 0.30s |
| MP5 | 252 | 0.40s | 0.14s (HS ×3) |

**Kesimpulan desain:** TTK rendah (0.1-0.4s) sesuai genre arena FPS; AWP 1-shot = penalty biaya tinggi + slow rate. HS multiplier: AK 2.86x, M4 2.97x — HS lebih kuat di AK (lebih challenge), M4 lebih konsisten.

**Kenapa MP5 dmg 24/head 72?** TTK torso 0.40s vs AK 0.29s — sebanding dengan biaya ($1,500 vs $2,700, rasio 1.8x) → eco pickup fair di round 2-3.

## Chapter 2: Economy Balance

- **Income T1:** $3,250 win vs $1,400 loss (Loss 1) → loss team bisa "save & semi-buy" tiap 2 round (bukan spiral).
- **Loss streak (Loss 2+ = $1,900):** cukup untuk semi-buy penuh, tapi tidak full buy → comeback butuh eksekusi, bukan hadiah ekonomi.
- **Pistol round (start $800):** force armor+Deagle ($700) atau 8 pistol $0 — trade-off skill vs utility.
- **Kill reward difference (rifle $300 vs SMG $600):** reward aggressive eco; nerf AWP reward → mengurangi camping power-farm.

**Eko timeline:** Round 1 (800) → Round 2 (2,150 setelah win) → Round 3 (3,500) → full AK + armor.

## Chapter 3: Movement Balance

- **Moon-jump ×1.4** = skill high-expression, tapi terminal velocity 12 m/s dicek → tidak infinite.
- **Curve slide 10°/tick** → biarkan jitter taktik, tapi loss <10% (≤30°) → counter-strategi peek reward.
- **Strafe multiplier 1.2 (diagonal)** → encourage active movement; hall-hold dead.
- **Slide control 0-10** → player custom feel; default 6 = middle ground, server validated.

**Dampak pada arena:** T-gameplay "bait & decay" (flash sebelum peak), bukan sprint-and-shoot beruntung.

## Chapter 4: Map Balance

- **60×40m** → rotasi baik, akses area seimbang (T 25-30s vs CT 20s pinches).
- **Asimetri A/B (A lebih besar 20%):** A lebih mudah plant (60% pick), B lebih menantang (40%) → skor plant ratio A 60 / B 40 tujuan.
- **Buy zones 6×6** di spawn masing-masing — mencegah rushing sebelum buy selesai.

## Chapter 5: Uniform vs Class System (Keputusan Desain)

| Aspek | Uniform (pilihan) | Class (ditolak) |
| :--- | :--- | :--- |
| Skill expression | Murni mekanik (movement+crosshair) | Split oleh kelas |
| Balance complexity | 1 senjata pool seragam | Multi-kelas = sulit seimbang |
| Learning curve | Rendah | Tinggi (5 kelas × timing) |
| Esport-readiness | Tinggi (Krunker-likeness) | Sedang |

**Keputusan:** **tetap uniform** — konsisten dengan Gen-1 & Krunker-like; class = roadmap option di v3.

---

## QA Checklist Balance

- [ ] Semua TTK di atas ≤ 0.5s (torso) untuk tiap senjata.
- [ ] Simulasi 500 round: winrate tim balanced 49-51% (bukan matchmaking bias).
- [ ] Economy stress: 10x loss streak → tetap bisa buy full di round 11.
- [ ] A/B plant ratio 60/40 terukur di telemetry.
- [ ] Movement tech tidak bisa infinite-loop (cap 12 m/s).
