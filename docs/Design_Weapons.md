# 🔫 Desain Senjata, Recoil Pattern & Sistem Peluru (v2.1)

Senjata menggunakan sistem **Hitscan** (sinar lurus instan) untuk respons 0-latency ala CS:GO. Semua validasi hit terjadi di server Colyseus. Model 3D menggunakan gaya **Krunker.io blocky/voxel** — semua geometry dari box/cylinder sederhana.

> **Referensi:** [Design_Combat_Kill.md](Design_Combat_Kill.md) (validasi) • [Design_Gameplay.md](Design_Gameplay.md) (harga) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (alasan angka)

---

## 1. Statistik Lengkap 10 Senjata (v2.1)

### Primary Rifles & SMG

| Senjata | Tim | Harga | Dam. Torso | Dam. Head | Fire Rate | Mag | Reload | Recoil | Wallbang |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **AK-47** | T | $2,700 | 35 | 100 (1-hit, tembus helm) | 10/dtk | 30 + ∞ | 2.4s | Pola "7" Tinggi | ✅ -50% |
| **M4A1-S** | CT | $3,100 | 31 | 92 (vs helm 2-hit) | 11/dtk | 25 + ∞ | 3.1s | Vertikal Stabil | ✅ -50% |
| **AWP** | Kedua | $4,750 | 115 (1-hit) | 115 (1-hit) | Bolt 1.2s | 5 + ∞ | 3.7s | Tidak ada | ✅ -50% |
| **MP5** | Kedua | $1,500 | 24 | 72 | 10.5/dtk | 30 + ∞ | 2.1s | Rendah | ❌ Tidak |

### Pistols

| Senjata | Tim | Harga | Dam. Torso | Dam. Head | Fire Rate | Mag | Reload | Recoil | Wallbang |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Desert Eagle** | Kedua | $700 | 53 | 100 (1-hit) | Semi 0.3s | 7 + ∞ | 2.2s | Hentakan keras | ✅ -50% |
| **Glock-18** | Kedua | $200 | 22 | 78 | Semi 8/dtk | 20 + ∞ | 1.8s | Rendah | ✅ -50% |
| **Tec-9** | T | $500 | 18 | 65 | Full-auto 12/dtk | 18 + ∞ | 1.6s | Sedang | ✅ -50% |
| **Auto Pistol** | CT | $500 | 20 | 70 | Full-auto 9/dtk | 15 + ∞ | 1.5s | Rendah | ✅ -50% |

### Melee

| Senjata | Tim | Harga | Dam. | Fire Rate | Catatan |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Knife** | Kedua | $0 | 50 | 2/dtk | Speed buff +10% saat dipegang |
| **Combat Knife** | Kedua | $0 | 55 | 2.5/dtk | Blade lebih besar, tanto-style |

### Catatan Penting
- ⚠️ **Kolom Wallbang di atas adalah spesifikasi rencana** — sistem wallbang/penetrasi **belum diimplementasikan** di kode (semua permukaan solid). Status: [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) #39.
- **AK-47 vs Helm:** headshot selalu 1-hit kill meski musuh memakai Helm ($1,000).
- **M4A1-S vs Helm:** headshot 92 dari 100 HP (butuh 2 hit).
- **AWP:** 1-hit kill torso & kepala tanpa pengecualian.
- **Deagle:** 1-hit kill hanya headshot (100).
- **Glock-18:** Pistol default termurah, semi-auto, cocok untuk eco round.
- **Tec-9:** Machine pistol T-side, fire rate tinggi tapi damage rendah.
- **Auto Pistol:** Full-auto CT-side, balanced antara Glock dan Deagle.
- **Combat Knife:** Melee upgrade, damage lebih tinggi dari Knife default.
- **MP5:** satu-satunya SMG tanpa wallbang (trade-off: murah + reward kill $600).

### TTK Comparison (Waktu Habiskan 100 HP)

| Penembak | Torso | Kepala (helm) | Catatan |
| :--- | :--- | :--- | :--- |
| AK-47 | 3 peluru (0.2s) | 1 | Melawan 100 HP |
| M4A1-S | 4 peluru (0.27s) | 2 (0.18s) | Lebih akurat, TTK lebih lambat |
| AWP | 1 | 1 | Risiko: reload 3.7s |
| Deagle | 2 (0.3s) | 1 | Momentum economy |
| Glock-18 | 5 peluru (0.5s) | 2 (0.25s) | Eco round default |
| Tec-9 | 6 peluru (0.42s) | 2 (0.17s) | Spam fire, rendah akurasi |
| Auto Pistol | 5 peluru (0.44s) | 2 (0.22s) | Balanced auto pistol |
| MP5 | 5 (0.38s) | 2 | TTK tercepat vs rusak: murah |

---

## 2. Mekanik Recoil: Pola Spray CS:GO

Tembakan *full-auto* **tidak acak murni** — setiap senjata punya pola deterministik yang bisa dipelajari.

### Pola Recoil AK-47 (Kurva "7")

```
  Peluru 1-5:   ↑↑↑↑↑          (Vertikal lurus ke atas)
  Peluru 6-15:  ↑←←←←←←←←←   (Bergeser ke kiri)
  Peluru 16-30: ↑→→→→→→→→→→→→→ (Bergeser ke kanan)
```

**Spray Control:**
- Peluru 1-5: tarik mouse **ke bawah**.
- Peluru 6-15: tarik **bawah + kanan**.
- Peluru 16-30: tarik **bawah + kiri**.

### Pola Recoil M4A1-S
Hentakan hampir lurus ke atas tanpa deviasi horizontal besar — cocok untuk spray jarak menengah.

### Recovery
- Saat tidak menembak: recoil offset kembali ke 0 via `lerp(current, 0, 0.15)` per frame.

---

## 3. Sistem Bidikan (ADS - Aim Down Sights)

| Kondisi | Akurasi | Spread Radius |
| :--- | :--- | :--- |
| Diam + Hipfire | ~95% | 0.02 |
| Berjalan + Hipfire | ~75% | 0.06 |
| Sprint / Slide | ~20% | 0.25 |
| Melompat (Udara) | ~5% | 0.45 |
| **ADS (Klik Kanan)** | 100% | 0.0 |
| **AWP Scope** | 100% | Zoom 2x |

**ADS Transition Timing (BARU):**
- Masuk ADS: 120ms (lerp FOV 75 → 60).
- Keluar ADS: 80ms.
- AWP Scope: 250ms masuk, 150ms keluar.
- Tidak bisa shoot selama transisi ADS.

---

## 4. Penetrasi Peluru & Wallbang

Peluru dari **semua senjata kecuali MP5** dapat menembus material tipis:

| Material | Tembus? | Pengurangan | Penetrasi Maks |
| :--- | :--- | :--- | :--- |
| Pintu Kontainer Terbuka | ✅ Ya | -50% | 2 permukaan |
| Boks Kayu (Crates) | ✅ Ya | -50% | 2 permukaan |
| Tong Besi (Iron Barrel) | ❌ Tidak | Memantul / Diblokir | 0 |
| Tembok Kontainer Solid | ❌ Tidak | Diblokir | 0 |
| Tembok Pembatas Arena | ❌ Tidak | Diblokir | 0 |

**Ketebalan maks yang bisa ditembus:** 0.5m kayu (damage -50%), di atas itu diblokir.

---

## 5. Efek Visual & Audio Per Tembakan

| Efek | Deskripsi | Layer |
| :--- | :--- | :--- |
| Muzzle Flash | Kilatan putih 1 frame di ujung senjata | Client (Instan) |
| Bullet Tracer | Garis laser tipis (60ms, pool 20) | Client (Instan) |
| Impact Spark | Percikan di permukaan besi/kontainer | Client (Instan) |
| Bullet Hole Decal | Lubang hitam 0.08m, hilang 10s, maks 50 | Client (Instan) |
| Hitmarker Dot | Dot putih berkedip di crosshair | Client (Prediksi) |
| Kill Confirm | Ikon tengkorak CSS + suara dink | Server (Konfirmasi) |
| Suara Tembakan | 3D Positional Audio Mono | Client (Instan) |
| Flashbang White Screen | Layar putih + tinnitus | Server (Event) |

---

## 6. Manajemen Amunisi & Reload

- **Reserve Ammo:** ∞ (tanpa pickup di map).
- **Reload (R):** AK-47 2.4s • M4A1-S 3.1s • AWP 3.7s • Deagle 2.2s • MP5 2.1s.
- **Auto-Reload:** otomatis saat mag kosong + coba menembak.
- **Lockout:** tidak bisa tembak, sprint penuh, atau lempar granat selama reload.
- **Reload Cancel Window (BARU):** reload bisa dibatalkan (kembali ke senjata aktif) hingga 40% durasi pertama tanpa kehilangan amunisi mag (45% + = gagal cancel, harus selesaikan reload).

### Weapon Switch Timing (v2.1)

| Dari → Ke | Deploy (ke senjata) | Undeploy (jauhkan) |
| :--- | :--- | :--- |
| AK-47 / M4A1-S | 0.6s | 0.4s |
| AWP | 1.0s | 0.5s |
| Deagle | 0.4s | 0.3s |
| Glock-18 / Auto Pistol | 0.35s | 0.25s |
| Tec-9 | 0.4s | 0.3s |
| MP5 | 0.5s | 0.35s |
| Knife | 0.3s | 0.2s |
| Combat Knife | 0.25s | 0.2s |

**Aturan:** tidak bisa menembak selama deploy; switch dibatalkan jika menekan tembak.

---

## 7. Granat-Environment Interaction Matrix (BARU)

| Granat \ Material | Beton | Kayu | Besi | Dinding Solid |
| :--- | :--- | :--- | :--- | :--- |
| HE | Meledak di permukaan | Meledak di permukaan | Meledak (spark) | Meledak di permukaan |
| Smoke | Memantul (0.4) | Memantul (0.5) | Memantul (0.3) | Berhenti |
| Flashbang | Memantul (0.5) | Memantul (0.6) | Memantul (0.4) | Berhenti |
| **In water (future)** | - | - | - | - |

**Cakupan blokir:**
- Smoke memblokir raycast penembakan & outline — bukan gerakan fisik.
- HE ledakan diblokir dinding tebal (tidak wallbang).

---

## 8. Balance Rationale Ringkas (Detail: Balance Rationale)

| Keputusan | Alasan |
| :--- | :--- |
| AK 35 vs M4 31 | AK lebih kuat tapi lebih mahal dakwah: recoil susah ≥ TTK sama dari jauh |
| M4 akurasi lebih tinggi | Kompensasi damage lebih rendah |
| AWP $4,750 | Preventif: 1-hit kill harus mahal + punish kill reward $100 |
| MP5 tanpa wallbang | Trade-off kebalikan: murah + $600 reward kill |
| Deagle $700 | Economy weapon hero (1-hit head, risiko tinggi) |

---

## 9. QA Checklist Weapons

- [ ] Semua senjata sesuai statistik tabel (damage dihitung server).
- [ ] TTK match: AK 3 peluru torso, M4 4 peluru, AWP 1, Deagle 2.
- [ ] Pola recoil "7" deterministik (bisa dipelajari).
- [ ] Wallbang: maks 2 permukaan; iron barrel memblokir.
- [ ] Switch timing mencegah shoot saat deploy.
- [ ] Reload lockout benar; cancel window 40% bekerja.
- [ ] ADS transisi 120ms/80ms, AWP 250ms/150ms.
