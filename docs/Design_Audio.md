# 🎧 Desain Audio & Sound System (v2.0 - Competitive Standard)

## 1. Tujuan Audio System
- **Memberikan informasi spasial:** lokasi musuh dari suara (langkah, reload, tembakan).
- **Memberikan feedback aksi:** konfirmasi instan saat tembakan mengenai target.
- **Meningkatkan game feel:** imersif tanpa mengorbankan kejernihan kompetitif.

---

## 2. Arsitektur Audio (Hybrid)

- **3D Spatial (Web Audio API):** tembakan, langkah, reload. Listener tersinkronisasi murni dengan **kamera** (bukan badan karakter).
- **2D UI (Howler.js / Native):** hitmarker, kill confirm, announcer.
- **Audio Context Unlock:** wajib interaksi user pertama (layar "Click to Play"). Jangan mengandalkan autoplay.

---

## 3. Kategori Suara 3D (Wajib Mono)

| Sound | Jarak Efektif | Ref / Max | Keterangan |
| :--- | :--- | :--- | :--- |
| Gunshot | Sangat Jauh | 5m / 80m | Tembakan jauh kurang presisi arahnya |
| Footstep Sprint | Sedang | 22m | Lebih keras & jelas |
| Footstep Walk | Pendek | 15m | - |
| Footstep Crouch | Sangat Pendek | 6m | Reward stealth, volume kecil |
| Reload | Sangat Pendek | 8m | Info: pemain rentan |
| Weapon Switch | Sangat Pendek | 8m | Info taktis |
| Jump & Landing | Pendek | 10m | Landing lebih keras dari high place |
| Slide | Pendek | 12m | Suara gesekan saat slide-hop |

### Footstep Material Detection (BARU)
- Deteksi material lantai via **tag pada collider**: `concrete`, `wood`, `iron`.
- Suara berbeda per material (beton berat, kayu creak, besi metalik).

---

## 4. Kategori Suara 2D/UI

| Sound | Keterangan |
| :--- | :--- |
| Hitmarker | Tick singkat (bodyshot) — instan |
| Headshot | "Dink" logam nada tinggi |
| Kill Confirm | Hanya setelah validasi server |
| Low HP Warning | Detak jantung, HP < 20, berhenti saat sembuh/mati |
| Announcer | Narator "Match Starts" — jangan terlalu sering |
| Flashbang Tinnitus | Dengung 1-3s proporsional blindness |

---

## 5. Spesifikasi File Audio (BARU)

| Parameter | Nilai |
| :--- | :--- |
| Format | OGG (fallback MP3) |
| Sample Rate | 44.1 kHz |
| Channels | Mono (wajib 3D), Stereo (UI) |
| Bit Depth | 16-bit |
| Preload | Semua decode via `decodeAudioData` saat loading screen |

### Aturan Jarak dan Attenuation
- Gunshot: Ref 5m, Max 80m.
- Footstep Sprint: Max 22m. Walk: 15m. Crouch: 6m.
- Reload / Switch: Max 8m.

### Audio Occlusion
- Raycast listener → source.
- Dinding tebal → **Low-Pass 800Hz** + volume -12dB.
- Dinding tipis (kayu) → Low-Pass 2500Hz + volume -6dB.
- Terbuka → tanpa filter.

---

## 6. Aturan Network Audio

- **Footstep:** jangan kirim event per-langkah; client render lokal berdasarkan status gerak musuh (walk/sprint/crouch + posisi).
- **Tembakan, reload, kematian:** event network yang divalidasi server.

---

## 7. Manajemen Performa (Memory & Limits)

- **Priority Pool 12 source 3D** — jika penuh, drop suara terjauh/prioritas terendah.
- **Priority Matrix (BARU):** Kill Confirm > Headshot > Hitmarker > Gunshot > Footstep Reload.
- Object pool AudioBuffer per jenis; reuse node.

### Fallback Behavior (BARU)
- File gagal load/decode → log warning + **skip** (tidak block game).
- AudioContext gagal unlock → tampilkan tombol retry di settings.
- Occlusion raycast gagal (error) → default: tanpa filter (aman).

---

## 8. Aturan Mixing (Ducking)

- **Voice Over Ducking:** announcer bicara → efek lain -10dB.
- **Hierarki Loudness:** Kill Confirm > Headshot > Hitmarker > Footstep Jauh.

---

## 9. Settings dan Accessibility

- Master, SFX, Voice/Announcer, UI volume.
- Toggle Low HP Heartbeat.
- Subtitle untuk Announcer (teks).
- **BARU:** Toggle "Reduce 3D sound count" (mode performa: pool 12 → 6).

---

## 10. QA Checklist (Standar Kompetitif)

- [ ] Blind direction test: akurasi >80% dari footstep saja.
- [ ] Occlusion: musuh di balik tembok *muffled*, beda dengan terbuka.
- [ ] Stress: 10 pemain menembak serempak tanpa crackling.
- [ ] Kill confirm / hitmarker hanya dari feedback server.
- [ ] Context unlock layer muncul di klik pertama.
- [ ] Fallback: file rusak tidak menghentikan game.
