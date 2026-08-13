# 🗺️ Desain Denah, Penghalang, Zona & Callout Map "Container Yard" (v2.0)

Dokumen ini mendefinisikan denah tata letak 2D/3D, lokasi cover & hiding spots, koordinat zona resmi, **callout list resmi**, **rotation time**, **sniper sightlines**, **smoke/flash spots**, dan **spawn protection zones**.

> **Referensi:** [Impl_Guide_Map.md](Impl_Guide_Map.md) (implementasi) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (strategi)

---

## 1. Denah Layout 2D Terperinci (ASCII Map & Cover Spots)

```
        ╔═════════════════════════════════════════════════════════════════════════════╗
        ║                      ZONA UTARA (SITE A - LORONG RAPAT)                     ║
        ║                                                                             ║
        ║      [📦 Boks Kayu]            [🛢️ Tong Besi]          [🟥 BOMB SITE A 🟥]  ║
        ║    (T-Cover Hiding)          (Mid-A Shield)           (Plant Zone A)      ║
        ║                                                                             ║
┌───────┴──────┐      ┌──────────────────────────────────────────┐      ┌─────────────┴──────┐
│   T-SPAWN    │──────│            MID LANE (TENGAH)             │──────│      CT-SPAWN      │
│ (Buy Zone T) │      │   [🟨 Kontainer Kuning / AWP Cover 🟨]   │      │   (Buy Zone CT)    │
└───────┬──────┘      └──────────────────────────────────────────┘      └─────────────┬──────┘
        ║                                                                             ║
        ║      [🚪 Tunnel L-Shape]       [📦 Tumpukan Boks]      [🟦 BOMB SITE B 🟦]  ║
        ║    (Ambush Hiding)           (B-Cover Hiding)         (Plant + Ramp High)  ║
        ║                                                                             ║
        ║                     ZONA SELATAN (SITE B - AREA TERBUKA)                    ║
        ╚═════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. Callout List Resmi (BARU)

| Callout | Lokasi | Penggunaan |
| :--- | :--- | :--- |
| **Tunnel** | L-shape container antara Site A ↔ Mid | Ambush, rotasi A |
| **Mid Box** | Boks kayu di tengah Mid Lane | Cover AWP vs T/CT |
| **Barrels** | 2 tong besi pintu masuk Mid (dari T) | Shield ant-AWP |
| **Ramp Top** | Atas ramp Site B (high ground) | Sniper/overwatch B |
| **B Stack** | Tumpukan kontainer Site B | Plant B utama |
| **A Corner** | Sudut lorong rapat Site A | Ambush lorong |
| **Red Base** | Kontainer merah T-Spawn | Rotation T |
| **Blue Base** | Kontainer biru CT-Spawn | Rotation CT |
| **Kitchen** | Lorong sempit utara Mid | Flank ke A |
| **CT Doors** | Pintu keluar CT-Spawn sisi selatan | Push B |

---

## 3. Penghalang Taktis & Tempat Bersembunyi

### A. Boks Kayu Tumpuk (Chest-High, 1.2m)
- Head-shot angle cover. Bisa ditembus (wallbang -50%).
- Lokasi: lorong T→A, T→B, dekat ramp B.

### B. Tong Besi (Solid, 1.5m)
- 100% kedap peluru. Lokasi: pintu masuk Mid dari T-Side (2 tong), Site A (1-2).

### C. Kontainer L-Shape (Ambush Tunnel)
- Dead zone untuk menyergap. Lokasi: lorong Site A ↔ Mid.

### D. Tumpukan Kontainer Berundak + Ramp (High Ground)
- Naik ramp (30° miring) ke atap kontainer tingkat 2 — Site B.
- 1-2 boks kayu di atas atap sebagai cover tambahan.

### Cover Height Table (BARU)

| Cover | Tinggi | Jenis | HP (peluru AK) |
| :--- | :--- | :--- | :--- |
| Boks Kayu | 1.2m | Wallbangable -50% | ∞ (tidak hancur) |
| Tong Besi | 1.5m | Bulletproof | ∞ |
| Kontainer | 2.4m | Bulletproof | ∞ |
| Ramp | 0.1m (miring 30°) | Walkable | - |

> **Note:** Cover **tidak bisa hancur** di MVP (arcade pacing; drainage terrain tidak didukung).

---

## 4. Koordinat Zona Resmi (Official Zones)

```
                              Z = -20m (Tembok Utara)
         ┌──────────────────────────────┬──────────────────────────────┐
         │  ZONA T-SPAWN (BUY ZONE T)   │  SITE A PLANT ZONE (RED)     │
         │  Radius: 6m × 6m             │  Radius: 8m × 8m             │
         │  [X: -25m, Z: 0m]            │  [X: -5m, Z: -15m]           │
X = -30m ├──────────────────────────────┼──────────────────────────────┤ X = +30m
(Barat)  │  MID LANE CONFLICT ZONE      │  SITE B PLANT ZONE (BLUE)    │ (Timur)
         │  [X: 0m, Z: 0m]              │  Radius: 8m × 8m             │
         │                              │  [X: +5m, Z: +15m]           │
         ├──────────────────────────────┴──────────────────────────────┤
         │  ZONA CT-SPAWN (BUY ZONE CT)                                │
         │  Radius: 6m × 6m [X: +25m, Z: 0m]                           │
         └─────────────────────────────────────────────────────────────┘
                              Z = +20m (Tembok Selatan)
```

1. **Buy Zone T:** 6×6m di [-25, 0, 0].
2. **Buy Zone CT:** 6×6m di [25, 0, 0].
3. **Plant Zone A:** radius 8m di [-5, 0, -15].
4. **Plant Zone B:** radius 8m di [5, 0, 15].

### Spawn Protection Zones (BARU)
- Radius aman: **5m** dari titik spawn masing-masing tim.
- Durasi invulnerability: **1.5 detik** (hilang saat menembak / keluar radius).
- Safe spawn selection server: > 15m dari pembunuh terakhir + tidak dalam LOS musuh hidup.

### Rotation Times (BARU — kecepatan walk 5 m/s / slide-hop ~9 m/s)

| Rute | Jarak | Walk | Slide-Hop |
| :--- | :--- | :--- | :--- |
| T-Spawn → Site A | ~30m | 6.0s | 3.3s |
| T-Spawn → Mid | ~25m | 5.0s | 2.8s |
| Site A → Mid | ~15m | 3.0s | 1.7s |
| Mid → Site B | ~25m | 5.0s | 2.8s |
| Site A → Site B (via mid) | ~55m | 11.0s | 6.1s |
| CT-Spawn → Site A | ~30m | 6.0s | 3.3s |
| CT-Spawn → Site B | ~20m | 4.0s | 2.2s |

---

## 5. Sniper Sightlines (BARU)

| Posisi | Melihat | Keterangan |
| :--- | :--- | :--- |
| Mid Box (kuning) | T-Spawn exit, CT Doors | AWP line terpanjang |
| A Corner | Tunnel, lorong A | Holding A solo |
| Ramp Top (B) | B Stack, CT Doors | Posisi high ground B |
| Blue Base | Mid kanan, B approach | Hold CT |

### Smoke/Flash Spots (BARU)

| Spot | Tujuan |
| :--- | :--- |
| Mid smoke (kuning) | Tutup AWP line saat rotasi |
| CT Doors flash | Blind defender CT saat push B/A |
| Tunnel smoke | Bagi push A jadi 2 fase |
| Ramp Top smoke | Blokir overwatch saat plant B |
| B Stack flash | Clear plant zone B |
| A Corner smoke | Isolate plant A |

---

## 6. QA Checklist Map

- [ ] 5 zona + koordinat sesuai tabel.
- [ ] Cover heights benar (1.2m kayu, 1.5m tong, 2.4m kontainer).
- [ ] Buy zone 6×6 aktif hanya di Buy Phase.
- [ ] Plant zone A/B radius 8m terdeteksi.
- [ ] Spawn protection 5m + 1.5s bekerja.
- [ ] Callout labels render di debug, off di produksi.
- [ ] Rotation time sesuai kecepatan (walk vs slide-hop).
