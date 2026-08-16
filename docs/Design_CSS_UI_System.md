# 🎨 Spesifikasi Desain UI & HUD (v2.2 - GlassPanel System)

Standar UI/HUD **CSS murni** tanpa file gambar eksternal. Semua ikon/efek/overlay dibuat dari properti CSS3.

> **Referensi:** [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) (alur layar) • [Impl_Guide_New_UI_System.md](Impl_Guide_New_UI_System.md) (component library aktif) • [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md) (daftar HUD lengkap)

---

## 1. Prinsip Utama: Zero Image Dependency

| Prinsip | Keterangan |
| :--- | :--- |
| Zero HTTP request untuk ikon | Tidak ada `.png/.svg/.webp` untuk HUD |
| CSS Geometry | `border-radius`, `clip-path`, `box-shadow`, `::before/::after` |
| Animasi CSS | `@keyframes` murni |
| Component library | `GlassPanel`, `AnimatedNumber`, design tokens (lihat Impl_Guide_New_UI_System) |
| Font | Google Fonts 1 CDN request (Outfit + Roboto Mono) |

---

## 2. CSS Design Tokens & Typography

### 2.1 Design Tokens (konsisten dengan Impl_Guide_New_UI_System.md)

```css
:root {
  /* Background & text */
  --color-bg-primary: #0a0a0f;
  --color-bg-secondary: #12121a;
  --color-text-primary: #ffffff;
  --color-text-muted: rgba(255, 255, 255, 0.4);

  /* Team colors */
  --color-terrorist: #ff4444;
  --color-counter: #4488ff;

  /* Status */
  --ping-ok: #22c55e;      /* ping < 80ms */
  --ping-mid: #f59e0b;     /* ping 80-150ms */
  --ping-bad: #ef4444;     /* ping > 150ms */

  /* Legacy aliases (kompatibilitas komponen lama) */
  --team-red: #ef4444;
  --team-blue: #3b82f6;
  --cs-gold: #f59e0b;
  --cs-gold-glow: rgba(245,158,11,0.8);
  --bg-glass: rgba(15, 23, 42, 0.75);
  --border-glass: rgba(255, 255, 255, 0.12);
  --slate-950: #020617;
  --emerald-400: #34d399;
}
```

**Typography:** Header/Button: `'Outfit', sans-serif` 700-900. HUD numbers: `'Roboto Mono', monospace` 500-700.

---

## 3. Spesifikasi Lengkap Elemen UI

### A. Dot Crosshair
- Circle 6×6px putih, `box-shadow: 0 0 0 1.5px rgba(0,0,0,0.9)`, center 50/50 via translate(-50%,-50%).
- Hidden saat buy menu / pointer unlock. Ganti scope saat AWP ADS.

### B. Skull Kill Confirm
- 48×40px emas `--cs-gold`, `box-shadow: 0 0 25px var(--cs-gold-glow)`.
- `border-radius: 24px 24px 12px 12px`; mata `::before` 2 lingkaran `box-shadow: 20px 0 0 #0f172a`; gigi `::after`.
- Animasi `skull-pop 0.6s cubic-bezier(0.175,0.885,0.32,1.275)` scale 0.4→1.15→fade.
- Teks `+ $300 KILL CONFIRMED` emas.

### C. Buy Menu Glassmorphism
- Overlay `rgba(15,23,42,0.85)` + `backdrop-filter blur(12px)`.
- Kartu: `rgba(30,41,59,0.7)`, border 1px `--border-glass`, radius 12px; hover: border emas + translateY(-2px).
- **BARU:** Header berisi saldo + countdown buy phase + status ready.

### D. Slate HUD Cards
- HP: glass 256px kiri bawah; angka `Roboto Mono` `--emerald-400`; bar 8px `linear-gradient(90deg,#ef4444,#22c55e)`, transisi width 0.3s.
- Ammo: kanan bawah, angka besar 2.25rem emas + `/ ∞`.
- Kill feed: kanan atas, `border-right: 4px solid var(--team-red)` + `slide-in 0.3s`; hilang 5s.
- Timer tengah atas: `[🔴 RED 12] [03:45] [BLUE 10 🔵]`; merah jika < 30s.

### E. AWP Scope Overlay
- `radial-gradient(circle at center, transparent 32%, black 33%)`; garis 1px hitam v&h.

### F. Damage Vignette
- `box-shadow: inset 0 0 80px 30px rgba(239,68,68,0.6)`; `pulse-damage 0.3s ease-out forwards`.

### G. Main Menu
- Overlay `blur(16px)`; dark glass card; tombol gradient oranye-emas `animate-pulse` + `active:scale-95`; judul gradient `--cs-gold → --team-red` via `background-clip: text`.

### H. FPS Counter (BARU)
- Kiri atas, `Roboto Mono 10px`, warna abu `#94a3b8` (merah jika < 60).
- Update 1x/detik, `pointer-events: none`, tidak render saat menu.

### I. Ping Display (BARU)
- Kanan atas (di samping FPS), icon 3 bar CSS (kiri-kanan via box-shadow).
- Warna: `--ping-ok` / `--ping-mid` / `--ping-bad`.

### J. Minimap (BARU)
- Container 2D canvas (bukan CSS murni — diizinkan karena data dinamis).
- Posisi kanan bawah, ukuran 20% viewport (maks 320px), radius 8px, border `--border-glass`, opacity 0.85.
- Panah pemain (CSS triangle via clip-path), ikon bom (emoji ⦿ circle emas), site labels A/B.

### K. Lag Warning Banner (BARU)
- Tengah atas, `rgba(239,68,68,0.9)`, teks "Network Lag Detected" — muncul 3 detik, `animate-pulse`.

### L. Spectator HUD (BARU)
- Ganti crosshair → nama target + HP bar bawah + K/D di kanan atas; ammo disembunyikan.
- Mode indicator kecil: `FREE CAM` / `FOLLOW: Player_X` / `OBJECTIVE` / `THIRD-PERSON`.

### M. Settings Menu (BARU)
- Glass panel, tab: Video (quality presets), Audio, Controls (sens slider 0.1-5.0, keybind list), Gameplay (slide control 0-10, crosshair style).

### N. Ready/Skip UI (BARU)
- Buy phase: chip per player `[READY ✓]` di bawah timer; progress "5/10 ready" + tombol READY (F2).

---

## 4. Responsive & Accessibility (BARU)

| Item | Spek |
| :--- | :--- |
| Breakpoints | HUD scale 100% ≥1440px; 85% di 1280px; collapse minimap di <1280px |
| Contrast | Semua teks ≥ 4.5:1 (kecuali teks emas pada glass 3:1 untuk header hanya) |
| Font min | 12px (HUD angka), 14px (teks UI) |
| Firefox | `-webkit-backdrop-filter` prefix wajib |
| Safari | Fallback solid bg jika backdrop-filter tidak didukung |
| Color blind | Mode "shape outline" (musuh lingkaran, teman persegi) |

---

## 5. Checklist Kompatibilitas Browser

- [ ] Chrome/Edge: full support.
- [ ] Firefox: prefix `-webkit-` untuk backdrop-filter.
- [ ] Safari: fallback solid bg.
- [ ] Mobile: kontrol virtual overlay (future roadmap, bukan MVP).
- [ ] Low-end GPU: opsi "Reduce effects" (matikan blur, vignette, glow).

---

## 6. QA Checklist CSS UI

- [ ] Semua elemen HUD zero image (audit devtools network: 0 request gambar).
- [ ] FPS & ping update akurat tanpa re-render berlebihan.
- [ ] Minimap props align dengan map 3D.
- [ ] Lag banner muncul saat simulasi loss.
- [ ] Scope AWP menutup crosshair & minimap benar.
- [ ] Kontras teks ≥ 4.5:1 pada semua state.
