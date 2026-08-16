# Gameplay Mechanics Bible (v2.0)

> **Referensi:** [Design_Player.md](Design_Player.md) • [Design_Gameplay.md](Design_Gameplay.md) • [Design_Weapons.md](Design_Weapons.md) • [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) (map aktif) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md)

Dokumen ini adalah **satu-satunya sumber kebenaran** (single source of truth) untuk semua mekanika gameplay. Setiap angka di sini mengikat — client dan server HARUS membaca konstanta yang sama (`@cs-game/shared`), bukan hardcode duplikat.

---

## Chapter 1: Game Loop Inti

```text
[Spawn] → [Buy Phase 15s] → [Round Active 115s]
                ↓                    ↓
          (matikan spawn)    [Plant 3s / Defuse 10-5s / Eliminasi]
                ↓                    ↓
          [Round End] ──── [Score +1] ──── [Winner Check: 8?]
                ↓
          [Half-Time (rd 8): swap + alokasi ulang]
                ↓
          [OT 7-7: first-to-9 → Sudden Death 8-8]
```

- **Target:** 15 ronde, first-to-8; Half-time di ronde 8 (swap tim).
- **Tempo:** total match ± 23 menit (banking time ±15%).

## Chapter 2: Round Structure Detail

| Fase | Durasi | Aturan Kunci |
| :--- | :--- | :--- |
| Spawn | 5s | Frozen, force buy hanya pistol, tidak bisa keluar buy zone |
| Buy Phase | 15s | Beli senjata/kit/nade (lihat ekonomi); ready-skip 8/10 → aktif |
| Active | 115s | Timeout 115s; bom 40s setelah plant |
| Post-Round | 3-5s | Free cam, kill feed, scoreboard, win card |

**Edge cases:** Sudden death = 1 ronde full loadout + kit tanpa buy phase; round tie → round count dibatalkan (server replay).

## Chapter 3: Economy Deep Dive

| Aturan | Nilai |
| :--- | :--- |
| Uang awal | $800 |
| Win round | $3,250 (semua pemain tim pemenang) |
| Loss round (Loss 1) | $1,400 |
| Loss round (Loss 2+) | $1,900 |
| Kill reward | Rifle $300, AWP $100, SMG $600 |
| Plant / Defuse reward | $300 / $300 (bonus pribadi) |
| Max money | $16,000 (cap) |
| Save round | Peluru + nade dibawa, senjata JANGAN |

**Rekomendasi beli (metagame):** Round 1: armor + Deagle; Round 2 (win): full AK; Round 3 (loss streak): MP5 eco; Semi-buy: pistols + nade.

## Chapter 4: Combat & Kill Feed

- **Kill conditions:** HP ≤ 0 (tembak), fall damage > 30, nade, bom.
- **Kill reliability:** setiap hit divisualkan sebagai "X" merah; headshot → "HS".
- **Headshot multiplier** per senjata (tabel di [Design_Weapons.md](Design_Weapons.md#senjata-utama)).
- **Hitbox:** head 2.0x @y1.65, torso 1.0x @y1.15, limbs 0.7x @y0.5 (overlap prioritas kepala).

**Fall damage:** 1.5m aman, >3m → 12% HP per meter (rounded), >8m auto-death.

## Chapter 5: Bomb Guide

| Aksi | Durasi | Syarat |
| :--- | :--- | :--- |
| Plant | 3s | Berdiri di plantar zone (A/B), bukan saat crouch |
| Timer | 40s | Setelah plant; jika 0 → CT kalah |
| Defuse | 10s | Normal; 5s dengan Defuse Kit ($400) |
| Cancel | Bebas | Gerak → reload timer plant/defuse (progress hilang) |

- **Plant zone:** A [-5,0,-15] r8m, B [5,0,15] r8m.
- **Posisi plant exit:** setelah 2.5s (late cancel) masih valid? → Ambiguous, resolved oleh server session trace (tidak perlu POV).

**Audio bom:** beep 1s → plant 3s → stable 4s → beeps 1.5s) → beep panik di <10s.

---

## Chapter 6: Movement Tech Bible (LENGKAP)

Angka-angkanya diambil dari [Design_Player.md](Design_Player.md#4-movement-physics-bible):

| Tech | Formula / Aturan | Input |
| :--- | :--- | :--- |
| Walk / Sprint / Crouch | 5 / 7.5 / 2.5 m/s | WASD, Shift, Ctrl |
| Diagonal strafe | ×1.2 (jika 2 arah aktif) | W+A dll |
| Slide | v≥4 + crouch → 0.6s, kb ≥ 1.3 | Crouch saat sprint |
| Slide-hop | Jump saat slide → vel ×1.3 | jump + crouch chain |
| Air strafe | maks 30° per jump, airControl 0.75 | arah kamera di udara |
| Curve slide | 10°/tick loss <10% (≤30°) | kamera rotate saat slide |
| Moon-jump | jump dalam 150ms setelah release crouch → velY ×1.4 | scroll/crouch tap |
| Short-hop | ADS di udara → velY clamp 0.6× | ADS mid-air |
| Input buffer | ±100ms window | scroll wheel = jump |
| Slide control | 0-10, default 6 | setting |

**Kecepatan terminal:** cap 12 m/s (untuk mencegah micro-warp spam).

## Chapter 7: Granat Matrix

| Jenis | Damage | Radius | Durasi | Biaya |
| :--- | :--- | :--- | :--- | :--- |
| HE | 35 → 100 (falloff) | 10m r8m lethal | Instant | $300 |
| Smoke | 0 | Blokir LOS 10m | 15s | $300 |
| Flash | 1.5-3.5s (facing) | 15m, cone 60° | — | $200 |

**Lokasi spawn nade awal:** Hanya 1 dari tiap jenis; campuran $300+$300+$200=$800 (sekali buy).

**Trajectory preview:** garis putus-putus 1.5s, cooldown 5s, bind R.

## Chapter 8: Map Strategy (Dust2-like "SANDBOX")

Referensi [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) — 60×40m (koordinat dari `shared/index.ts`):

- **T-side routes:** long A (30s), mid (25s), short A (20s), B tunnels (28s), catwalk (26s).
- **CT-side pinches:** mid doors, A box site, B site smoke.
- **Plant A/B timing:** rata-rata plant 5-25s → Fokus peeking window ratio: A 60%, B 40%.

**Callout wajib ada di HUD saat hardpoint:** A Long, Mid Doors, B Tunnels, Cat, A Box, B Site.

## Chapter 9: Spectator System Detail

| Mode | Fitur |
| :--- | :--- |
| Free cam | Fly bebas, no-clip, batas map |
| Follow | Lerp posisi target tampak stabil + info player |
| Objective | Auto-follow plant/defuse area + MVP |
| 3rd person | Showcase senjata, FOV 75 |

- Player mati: forced spectate tim sendiri (anti-wallhack).
- Match end / OT: free cam semua tim.

## Chapter 10: Training Range & Match Quality

- **Training Range:** bots statis (dummy HP 100, respawn 2s), objektif kartu skor (akurasi, KD).
- **Bots (online backfill):** difficulty 1-5 (Medium: movement 0.6x, HS 30%; Hard: movement 0.8x, HS 50%).
- **Match Quality:** hal-hal yang dilarang: team-kill, idle >30s, spawn camping; auto-kick pemain idle.

---

## Chapter 11: Mode Roadmap (v2.0 BARU)

| Mode | Target | Rules kunci | Status |
| :--- | :--- | :--- | :--- |
| Defusal (inti) | 8 wins | Bom + ekonomi + OT | MVP |
| FFA | 20 kills (min 5 score gap) | Deathmatch, respawn 2s | Post-launch |
| Gun Game | 20 levels | Progresi senjata otomatis | Post-launch |
| TDM | 75 kills tim | Respawn, no economy | Post-launch |

**Rule bersama:** bukan per-user-UI; ranking & leaderboard server-side.

## Chapter 12: Performance Budget

| Resource | Budget |
| :--- | :--- |
| FPS target | 60 FPS (min 30 FPS fallback UI dwarf) |
| Draw calls | ≤ 450 (degradasi progresif LOD/grid) |
| Draw distance | 100m |
| Network | ≤ 80 Kbps/client → 400 B/tick @30 tick |
| Maps | 1-2 per rilis awal |
| Memory | ≤ 1.5 GB (textures 2K, NPOT) |

**Fallback gallery:** jika FPS < 30 → resolusi 0.75, shadow off, sun on, antialias MSAA off.

## Chapter 13: Error Handling & Edge Cases

| Skema | Penanganan |
| :--- | :--- |
| Disconnect mid-round | Snapshot 7s → restore saat reconnect |
| Join full room | Auto-queue (menunggu slot) |
| Phantom hit | Server otorisasi: validasi origin dalam 50ms window |
| Late join | Join mid-round dilarang; harus spy role (free cam) |
| Server crash | Reconnect 60s window; client "Connection lost" message + return menu |

## Chapter 14: Anti-Cheat Matrix (v2.0)

| Cheat detected | Server dilakukan |
| :--- | :--- |
| Speedhack (>12 m/s atau delta < 50ms) | Reject velocity update |
| Fire-rate hack (> 10.5/s rifle) | Hentikan input, beri warning |
| Ammo hack (ammo > mag) | Auto-kick |
| Dead player (HP ≤0 menembak) | Ignore + shadow ban |
| Wallhack (LOS violation) | Interest management bloom (default) |

## Chapter 15: Testing & QA

- **Per ronde kriteria:** round state machine unit test; verifikasi ekonomi equality; hitbox regression benchmarks.
- **Bot backfill:** untuk QA risk-based (bukan matchmaking priority).
- **Build gates:** lint, typecheck, `npm run build` di pipeline CI; QA spreadsheet NG-MIS di-update tiap rilis.

---

## QA Checklist Bible (konsistensi)

- [ ] Semua angka chapter 3/4/5/6/7 SAMA antara Design_* dan shared/PYSICS.
- [ ] Basic smoke test per chapter: movement, combat, bomb, economy, nade.
- [ ] Edge cases di chapter 13 didokumentasikan sebagai not-a-bug (spec).
- [ ] Docs terhubung ke build gates untuk audit.
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
