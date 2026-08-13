# ☠️ Desain Combat, Kematian, Kill & Spectator System (v2.0)

Sistem pertempuran dikelola 100% oleh **Server Otoritatif**. Dokumen ini mencakup sistem damage, validasi anti-cheat, death/respawn, **Spectator System lengkap**, dan semua **edge cases**.

> **Referensi:** [Design_Player.md](Design_Player.md) (hitbox) • [Design_Weapons.md](Design_Weapons.md) (damage) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (detail lengkap)

---

## 1. Sistem Health & Hitbox (Damage)

- **Base HP:** 100 per spawn.
- Deteksi hit server memakai geometri sederhana (Box/Capsule), bukan mesh visual.

### Hitbox Multiplier

| Zona | Multiplier | Dimensi Collider |
| :--- | :--- | :--- |
| Head | 2.0x | 0.30 × 0.25 × 0.30 @ y=1.65m |
| Torso | 1.0x | 0.55 × 0.70 × 0.35 @ y=1.15m |
| Limbs | 0.7x | 0.15 × 0.70 × 0.15 @ y=0.5m |

### Formula

```
Final Damage = Base Damage × Hitbox Multiplier × Wallbang Modifier (0.5 bila tembus)
```

### Contoh Perhitungan

| Kasus | Perhitungan | Hasil |
| :--- | :--- | :--- |
| AK-47 → Head (tanpa helm) | 35 × 2.0 | 70 (2 hit kill) |
| AK-47 → Head (dengan helm) | Rule-based | 1-hit kill |
| M4A1 → Head (dengan helm) | 46 × 2.0 | 92 (2 hit kill) |
| Deagle → Limbs | 53 × 0.7 | 37.1 |
| AK-47 wallbang → Torso | 35 × 0.5 | 17.5 ⚠️ (wallbang belum diimplementasikan) |
| M4A1 wallbang → Head | 46 × 2.0 × 0.5 | 46 ⚠️ (wallbang belum diimplementasikan) |

---

## 2. Feedback Client vs Konfirmasi Server

| Komponen | Otoritas | Keterangan |
| :--- | :--- | :--- |
| Muzzle flash & recoil | Client | Instan (game feel) |
| Suara tembakan lokal | Client | Instan |
| Hitmarker awal (prediksi) | Client | Instan, bisa dibatalkan server |
| Tracer & impact | Client | Instan |
| **Damage vignette** | **Server** | Anti-fake |
| **Kill confirm sound** | **Server** | Hanya setelah validasi |
| **Kill feed** | **Server** | Hanya event resmi |

### Timing Feedback

| Feedback | Target Latency |
| :--- | :--- |
| Muzzle flash | 0 ms (frame yang sama) |
| Hitmarker prediksi | 0 ms |
| Kill confirm | ≤ RTT + 1 tick (33ms) |

---

## 3. Validasi Server & Anti-Cheat

Server **wajib** mengecek sebelum mengakui hit:

1. **Status** — Penembak tidak mati / tidak reloading.
2. **Lag Compensation** — Rewind posisi target ke timestamp tembakan (buffer 500ms).
3. **Fire Rate & Ammo** — Interval ≥ `(1000/fireRate) × 0.85`; ammo > 0.
4. **Line of Sight** — Raycast tidak menembus dinding tebal (kecuali wallbang valid).
5. **Anti-Spam** — Rate-limit maks 20 paket tembakan/detik per pemain.
6. **Range** — Target dalam jangkauan senjata (rifle ≤ 200m).

---

## 4. Mekanisme Kematian (Death State)

- Server set `isDead = true` → input dikunci, collider jadi non-blocking.
- **Timeline:**
  1. `t=0` — Avatar terpental (impulse: normal 1.0 / headshot 1.4 / AWP 1.8).
  2. `t=0.5s` — Death cam mulai (spectator).
  3. `t=3s` — Respawn (atau spectate manual).
- **Senjata:** visual-only death (tanpa weapon drop fisik) di MVP.

---

## 5. Edge Cases (BARU)

| Kasus | Aturan |
| :--- | :--- |
| **Trade Kill** | 2 tembakan valid dalam 100ms → keduanya kill (server urutkan timestamp) |
| **Wallbang Chain** | Maks 2 permukaan tembus per peluru; damage -50% per permukaan |
| **Grenade Kill** | Dikreditkan ke pelempar; kill oleh ledakan bom → ke yang menanam |
| **Suicide** | Kill feed `[Nama] 💀 (Self)` — tidak ada reward uang |
| **Friendly Fire** | OFF di MVP (peluru tembus rekan tanpa damage; tetap ada tracers) |
| **Self-Damage HE** | Pelempar kena 50% damage (bisa bunuh diri) |
| **Spawn Kill** | Spawn protection 1.5s + spawn point dipilih via LOS check |
| **Kill saat lag spike** | Server pakai rewind buffer; jika timestamp > 500ms → ditolak |
| **Simultan defuse + bomb** | Timer bomb sinkron server; defuse selesai tepat saat bomb = 0 → CT menang |

---

## 6. Sistem UI: Kill Feed

- Sumber: event server `PlayerKilled` saja.
- Format: `[Killer] 🔫 [Victim]` + ikon 💀 jika headshot.
- Maks 4 entri; auto-hilang 5 detik (fade out).

---

## 7. Spectator System (BARU — Lengkap)

### 7.1 Mode Spectator

| Mode | Trigger | Kontrol | HUD |
| :--- | :--- | :--- | :--- |
| **Death Cam** | Player mati | Auto (1s) | Grayscale + timer |
| **Free Cam** | Tombol F | WASD + Scroll zoom + Shift speed | Tidak ada crosshair |
| **Player Follow** | Tombol 1-9 | Lihat nama + K/D target | HP bar target |
| **Objective Cam** | Tombol O | Auto-follow bom / defuser | Timer bom |
| **Third-Person** | Tombol V | Toggle di atas bahu target | Sama |

### 7.2 Aturan Spectate

- Pemain mati bisa langsung spectate (tidak harus menunggu respawn).
- Tombol **G** = lompat ke pemain berikutnya (urutan daftar).
- **Anti-wallhack:** spectator hanya bisa follow pemain dari timnya + free cam terbatas di map (tidak bisa tembus dinding).
- Spectator HUD: ganti crosshair → nama pemain yang dilihat + HP + K/D; ammo pemain sendiri disembunyikan.
- Saat round berakhir, semua mati → forced spectator sampai round berikutnya.

### 7.3 Broadcast Server

- Server mengirim posisi pemain yang di-spectate + event khusus (kill, bomb plant, defuse) ke spectator client.
- Tidak mengirim info musuh di luar LOS (interest management tetap berlaku).

---

## 8. Sistem Respawn & Spawn Protection

- **Timer:** 3 detik.
- **Full State Reset:** HP 100, ammo penuh, posisi spawn, hapus input buffer, bersihkan dead state.
- **Safe Spawn Logic:** 1) kandidat spawn > 15m dari pemain terakhir yang membunuh; 2) tidak dalam LOS musuh hidup; 3) bukan zone plant aktif bila bom aktif.
- **Protection:** Invulnerability 1.5s; hilang otomatis saat menembak atau keluar radius spawn 5m.

---

## 9. Checklist Validasi Kesiapan (QA Combat)

- [ ] Strafing target terasa fair (lag comp 500ms).
- [ ] Trade kill tidak duplikasi suara kill confirm.
- [ ] Wallbang chain maks 2 permukaan.
- [ ] Spectator: semua mode + perpindahan tombol bekerja.
- [ ] Spawn tidak pernah dekat musuh hidup.
- [ ] Kill feed bersih, auto-hilang 5 detik.
- [ ] Pemain mati tidak bisa memberi input.
- [ ] HE self-kill tercatat benar di kill feed.