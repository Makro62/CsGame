# 🏆 Desain Gameplay Taktis ala CS:GO (v2.0 — Complete Spec + Roadmap)

Dokumen ini mencakup alur pertandingan lengkap, sistem ekonomi Buy Menu, utilitas granat taktis, kondisi kemenangan, mekanisme ronde standar CS:GO, **Mode Single (Training Range)**, **aturan match quality** (ready/skip, forfeit, vote kick, reconnect, overtime), serta **roadmap mode tambahan**.

> **Referensi silang:** [Design_Weapons.md](Design_Weapons.md) (harga senjata) • [Impl_Map_ContainerYard_v3.md](Impl_Map_ContainerYard_v3.md) (koordinat site / map) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (detail lengkap)

---

## 1. Mode Permainan

| Mode | Format | Server | Nyawa / Ronde | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Single (Training Range)** | 1 Pemain | Lokal (Offline) | Tak Terbatas | 🟢 MVP |
| **Mabar (Bomb Defusal)** | 5 vs 5 (Max 10) | Colyseus Online | 1 Nyawa | 🟢 MVP |
| **FFA Deathmatch** | 8-12 Pemain | Colyseus Online | Respawn 2s | 🔵 Roadmap |
| **Gun Game** | 8 Pemain | Colyseus Online | Respawn 2s | 🔵 Roadmap |
| **TDM** | 5v5 | Colyseus Online | Respawn 2s | 🔵 Roadmap |

---

## 2. Mode Bomb Defusal (5v5 CS:GO Style)

### Pembagian Tim & Tujuan
- **Terrorists (T):** Tanam Bomb C4 di **Site A** atau **Site B**, atau eliminasi seluruh CT sebelum timer habis.
- **Counter-Terrorists (CT):** Cegah bom tertanam, defuse C4 aktif, atau eliminasi seluruh T.

### Alur Satu Ronde
```
  [Buy Phase 15s]  →  [Ronde Aktif 1m 55s]  →  [Resolusi 4s]
      ↓                        ↓                     ↓
  Beli senjata            Tempur, tanam          Tim pemenang
  (bisa skip via ready)   atau defuse bom        dapat uang bonus
```

### Sistem Ronde & Kondisi Kemenangan
- Pertandingan **15 Ronde** (first to 8 wins).
- **T Menang:** Bom meledak ATAU semua CT tereliminasi.
- **CT Menang:** Bom di-defuse ATAU semua T tereliminasi ATAU timer ronde habis.
- **Half-Time:** Ronde ke-8, tim bertukar sisi (T ↔ CT).

### Overtime (BARU)
- Skor **7-7** setelah ronde 14 → **Overtime** maksimum 2 ronde tambahan, **first-to-9 menang**.
- Jika tetap 8-8 setelah ronde 16 → **Sudden Death**: 1 ronde terakhir — CT menang jika bom tidak meledak, T menang jika bom meledak/eliminasi. Buy phase di-skip, semua dapat full loadout + kit.

### Ready/Skip Buy Phase (BARU)
- Semua 10 pemain menekan **Ready** → sisa waktu buy phase di-skip → **+10 detik** ke waktu ronde aktif.
- Server memproses mayoritas: **8/10 pemain ready** sudah cukup untuk skip (anti-troll).

### Timeout / Pause
- **Tidak ada pause manual** di MVP (arcade pacing). Bila server crash → match state dipertahankan via snapshot dan resume otomatis.

---

## 3. Fase Pembelian & Sistem Ekonomi

### Mekanisme Buy Phase
- Berlangsung **15 detik** awal ronde; pemain menekan **'B'** di **Buy Zone** tim.
- Opsional: auto-open buy menu di detik pertama buy phase (setting).

### Tabel Ekonomi Standar

| Event | Bonus Uang ($) | Keterangan |
| :--- | :--- | :--- |
| Pistol Round (Ronde 1) | $800 | Modal awal semua pemain |
| Menang Ronde | +$3,250 | Seluruh tim pemenang |
| Kalah Ronde (Loss 1) | +$1,400 | Streak kekalahan 1 |
| Kalah Ronde (Loss 2+) | +$1,900 | Streak kekalahan 2+ |
| Kill Rifle (AK/M4A1) | +$300 | - |
| Kill AWP | +$100 | Penalti sniper |
| Kill SMG (MP5) | +$600 | Reward agresif |
| Defuse Berhasil | +$300 | Bonus individu CT |
| Tanam Bom | +$300 | Seluruh tim T |
| **Max Money Cap** | **$16,000** | Overflow dibuang |

### Katalog Pembelian

| Kategori | Item | Harga |
| :--- | :--- | :--- |
| **Senjata T** | AK-47 | $2,700 |
| **Senjata CT** | M4A1-S | $3,100 |
| **Sniper** | AWP | $4,750 |
| **SMG** | MP5 | $1,500 |
| **Pistol** | Desert Eagle | $700 |
| **Gear** | Kevlar Vest | $650 |
| **Gear** | Helmet + Kevlar | $1,000 |
| **Gear** | Defuse Kit (CT only) | $400 |
| **Utilitas** | HE Grenade | $300 |
| **Utilitas** | Smoke Grenade | $300 |
| **Utilitas** | Flashbang | $200 |

### Strategi Ekonomi (Decision Tree Ringkas)

```
Uang awal ronde?
├─ ≥ $4,750 + tim menang sebelumnya → FULL BUY (sniper/rifle + armor + nade)
├─ $3,000-$4,700 → BELI SENJATA + UTILITAS (tanpa armor / armor murah)
├─ $2,000-$2,999 → FORCE BUY (Deagle + 2 granat) atau SAVE ke ronde berikutnya
└─ < $2,000 → ECO (save, pistol default, tujuan: rusak ekonomi/efek musuh)
```

**Aturan tambahan:** Hindari membeli AWP saat tim ECO.

---

## 4. Utilitas / Granat Taktis

Maksimal **3 granat** per pemain per ronde (kombinasi bebas).

### 4.1 HE Grenade
- Meledak **2 detik** setelah dilempar.
- Damage: **80 maks di titik pusat**, turun linier ke **10 pada radius 4m**.
- Self-damage: ya (50% untuk pelempar sendiri).
- Tidak wallbang (ledakan diblokir dinding tebal).

### 4.2 Smoke Grenade
- Awan asap radius **3m**, durasi **15 detik** (fade out 2 detik terakhir).
- **Blokir total LOS** untuk raycast tembakan & outline glow.
- Tidak memblokir gerakan fisik (pemain bisa masuk).

### 4.3 Flashbang
- Meledak di udara setelah **1.5 detik** / pantulan kedua.
- Blindness 1-3 detik + tinnitus.
- Formula sudut: `facing ≤ 45° → 3s`, `45°-70° → 1.5s`, `> 70° → 0.5s`.

### 4.4 Fisika Lemparan

| Parameter | Nilai |
| :--- | :--- |
| Throw speed | 18 m/s (tahan LMB = power, maks 22 m/s) |
| Restitution | Beton 0.4 • Kayu 0.5 • Besi 0.3 |
| Trajectory preview | Garis putus-putus 1.5s (cooldown anti-spam 5s) |

---

## 5. Informasi Bom C4

| Parameter | Nilai |
| :--- | :--- |
| Timer Bom | 40 detik setelah tertanam |
| Timer Defuse (no kit / kit) | 10 detik / 5 detik |
| Tanam | 3 detik (tak bisa bergerak) |
| Indikator | Titik merah berkedip di HUD + minimap (site A/B) |
| Explosion Radius | 6m fatal (>100 dmg) • 10m 50 dmg |

### Skenario Kemenangan (Win Condition Matrix)

| Kondisi | Pemenang |
| :--- | :--- |
| Bom meledak | T |
| Semua CT mati | T |
| Semua T mati (bom belum tanam) | CT |
| Bom di-defuse | CT |
| Timer ronde habis (bom belum tanam) | CT |
| Timer ronde habis (bom aktif, tidak meledak) | CT |

---

## 6. Mode Single (Training Range) — BARU

### 6.1 Dummy Target

| Parameter | Nilai |
| :--- | :--- |
| HP | 100 (reset otomatis) |
| Respawn setelah mati | 2 detik |
| Jarak default | 10-25m (bisa diatur) |
| Behavior | idle / polar (mengelilingi arena) / random strafe |
| Visual | Kotak merah (T) / biru (CT), outline glow |

### 6.2 Aim Trainer
- Target spawn acak di arena, timer mode 60s.
- Counter: total hits, headshots, akurasi %.
- Skor akhir: `hits × 50 + headshots × 150`.

### 6.3 Movement Course
- Track slide-hop dari T-Spawn → CT-Spawn → kembali (8 checkpoint).
- Best time tersimpan lokal (localStorage), peringkat S/A/B/C.

### 6.4 Recoil Practice
- Target statis di 25m + overlay pola spray ("7" AK-47).
- Score: % peluru dalam lingkaran 50cm.

### 6.5 Settings Mode Single
- Infinite ammo, god mode, spawn/swap weapon apapun, set jarak dummy, toggle outline.

---

## 7. Match Quality Rules — BARU

| Fitur | Aturan |
| :--- | :--- |
| **Vote Kick** | `/kick <player>` / tombol UI; butuh **50%+** pemain online (pengecualian: pemain yang di-vote); hanya saat round aktif; anti-abuse: 1 vote/pemain/2 menit |
| **Forfeit** | `/ff`; tim 5 pemain butuh **4/5** persetujuan; hanya setelah ronde 3; match berakhir; pemenang +$3,250 |
| **Reconnect** | Disconnect ≤ 60s → join ulang ke session sama; state dipertahankan (posisi valid terakhir + money + weapon + skor) via snapshot server |
| **Ready/Skip** | Lihat section 2 (buy phase skip) |
| **Spectate saat mati** | Pemain mati bisa spectate (lihat [Design_Combat_Kill.md](Design_Combat_Kill.md)) |
| **Anti-AFK** | 30 detik tanpa input selama round aktif → auto-kick dengan pesan; AFK vote otomatis |

---

## 8. Roadmap Mode Tambahan — BARU

### 8.1 FFA Deathmatch (Prioritas 1)
- 8-12 pemain, first-to-**50 kills** menang.
- Respawn 2s, spawn aman (anti-spawncamp via LOS check).
- Semua senjata tersedia (free buy, tidak ada ekonomi).
- Scoreboard per-kill dengan streak bonus visual.

### 8.2 Gun Game (Prioritas 2)
- 8 pemain. Ladder 7 senjata: `Deagle → MP5 → AK-47 → M4A1-S → Deagle relaunch → AWP → Knife`.
- Kill → naik tingkat. Death → turun tingkat (tidak di bawah senjata pertama).
- Pertama mencapai **Knife kill** = menang.

### 8.3 TDM (Prioritas 3)
- 5v5, first-to-**100 kills** tim menang.
- Respawn 2s + spawn protection 1s.
- Kill = 1 poin tim; team kill = -1.

---

## 9. HUD & Zoning Map (Ringkasan)
- **T-Spawn (Red Zone):** Sisi Barat — Kontainer Merah.
- **Site A (Red + Kuning, Lorong Rapat):** Sisi Utara.
- **Mid Lane (Kuning / Hijau):** Tengah — jalur rotasi AWP & slide-hop.
- **Site B (Biru + Ramp High Ground):** Sisi Selatan.
- **CT-Spawn (Blue Zone):** Sisi Timur — Kontainer Biru.
- Minimap menampilkan zona berwarna + ikon bom + panah pemain.

---

## 10. QA Checklist Gameplay

- [ ] Buy phase 15s berjalan, ready skip +10s bekerja.
- [ ] Overtime trigger saat 7-7, sudden death saat 8-8.
- [ ] Win condition matrix semua kasus benar.
- [ ] Economy cap $16,000 berlaku.
- [ ] Grenade: HE self-damage 50%, smoke block LOS 15s, flash sudut → durasi benar.
- [ ] Training range: dummy respawn 2s, aim trainer skor benar.
- [ ] Vote kick 50%+, forfeit 4/5, reconnect 60s window bekerja.