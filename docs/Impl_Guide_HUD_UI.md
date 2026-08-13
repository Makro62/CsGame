# 📖 Panduan Implementasi: HUD & UI System (v2.0)

Panduan langkah-demi-langkah implementasi seluruh UI/HUD **React + Vanilla CSS**, zero-asset, termasuk elemen baru: minimap, FPS/ping, lag banner, settings, spectator HUD, ready/vote kick UI.

> **Referensi:** [Design_CSS_UI_System.md](Design_CSS_UI_System.md) • [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md)

---

## Urutan Implementasi (Prioritas)

```
1. Main Menu Screen
2. Dot Crosshair
3. HUD Dasar (HP + Ammo)
4. Timer & Skor Tim
5. Kill Feed
6. Skull Kill Confirm
7. Damage Vignette
8. Buy Menu
9. AWP Scope Overlay
10. Leaderboard (TAB)
11. Death Screen
12. Radio Command UI
13. FPS Counter (BARU)
14. Ping Display (BARU)
15. Minimap (BARU)
16. Lag Warning Banner (BARU)
17. Settings Menu (BARU)
18. Ready/Skip UI (BARU)
19. Vote Kick UI (BARU)
20. Spectator HUD (BARU)
```

---

## 1. Main Menu Screen

**File:** `client/src/screens/MainMenu.tsx`
- Input nickname (default acak `Player_XXX`), 2 tombol (Single / Mabar).
- State: `nickname` + `gameMode` di `useGameStore`.

## 2. Dot Crosshair

**File:** `client/src/components/hud/Crosshair.tsx`
- `.dot-crosshair` 6×6px; tampil saat `pointerLocked && !isBuyMenuOpen && !isADSScope`.

## 3. HUD Dasar (HP + Ammo)

**File:** `client/src/components/hud/HudOverlay.tsx`
- HP bar width `hp%` transisi 0.3s; warna teks emerald → yellow → red (hp < 20).
- Ammo `currentAmmo / ∞` dari `useWeaponStore`.

## 4. Timer & Skor Tim

**File:** `client/src/components/hud/ScoreTimer.tsx`
- Countdown 115s → 0; format MM:SS; merah jika < 30s; skor per tim dari `useNetworkStore`.

## 5. Kill Feed

**File:** `client/src/components/hud/KillFeed.tsx`
- Maks 4 entri, auto-remove 5s (`setTimeout`), animasi `slide-in`.

## 6. Skull Kill Confirm

**File:** `client/src/components/hud/KillConfirm.tsx`
- Event server `kill_confirmed` → show 600ms → reset.

## 7. Damage Vignette

**File:** `client/src/components/hud/DamageVignette.tsx`
- Event server `PlayerDamaged` → 300ms pulse.

## 8. Buy Menu Glassmorphism

**File:** `client/src/screens/BuyMenu.tsx`
- Syarat: `playerInBuyZone && buyPhaseActive`; toggle 'B'.
- Header: saldo + sisa buy phase; grid 3 kolom; tombol BELI → `buyItem(itemId)` → server validasi uang.

## 9. AWP Scope Overlay

**File:** `client/src/components/hud/SniperScope.tsx`
- Radial-gradient; hanya saat AWP + ADS.

## 10. Leaderboard (TAB)

**File:** `client/src/screens/Leaderboard.tsx`
- Tabel per tim: Nickname | K | D | Ping; skor tim besar di header.
- Tambahan (v2): tombol **Vote Kick** di baris pemain (kanan), disabled untuk diri sendiri.

## 11. Death Screen

**File:** `client/src/screens/DeathScreen.tsx`
- Grayscale + countdown 3s → respawn; tombol "SPECTATE SEKARANG" (lanjut ke spectator view).

## 12. Radio Command UI

**File:** `client/src/components/hud/RadioCommand.tsx`
- Z → mini menu; Z+1/2/3 → `room.send("radio", { code })`; pesan tampil 3s, team-only.

---

## 13. FPS Counter (BARU)

**File:** `client/src/components/hud/StatsMonitor.tsx` (gabung FPS + Ping)

```tsx
// update 1x/detik:
const [fps, setFps] = useState(0)
useEffect(() => {
  let frames = 0; let last = performance.now()
  const loop = () => {
    frames++
    const now = performance.now()
    if (now - last >= 1000) {
      setFps(Math.round((frames * 1000) / (now - last)))
      frames = 0; last = now
    }
    raf = requestAnimationFrame(loop)
  }
  const raf = requestAnimationFrame(loop)
  return () => cancelAnimationFrame(raf)
}, [])
```

- `pointer-events: none`; merah jika < 60.

---

## 14. Ping Display (BARU)

```tsx
// dari useNetworkStore.ping (diupdate server/ws ping tiap 1s)
<div className={`ping-indicator ping-${pingLevel}`}> {ping}ms </div>
// pingLevel: ok (<80) | mid (80-150) | bad (>150)
```

---

## 15. Minimap (BARU)

**File:** `client/src/components/hud/Minimap.tsx`
- `<canvas>` 2D 128×128 (scale ke 20% viewport). Toggle **M**.
- Data: `players[]` (x/z → normalize ke map 60×40), bom site, zones.
- Render tiap 100ms (`setInterval`) atau per snapshot server (30/s).
- CSS triangle untuk panah pemain (rotasi = yaw).

**Implementasi ringkas:**

```ts
const scale = (v: number, min: number, max: number) => (v - min) / (max - min)
// world X: -30..30 → 0..w ; world Z: -20..20 → 0..h
ctx.clearRect(...)
players.forEach(p => {
  ctx.save()
  ctx.translate(scale(p.x, -30, 30) * w, scale(p.z, -20, 20) * h)
  ctx.rotate(p.yaw)
  ctx.fillStyle = p.team === 'T' ? '#ef4444' : '#3b82f6'
  ctx.beginPath(); ctx.moveTo(0,-4); ctx.lineTo(3,3); ctx.lineTo(-3,3); ctx.closePath()
  ctx.fill(); ctx.restore()
})
if (state.bombPlanted) drawBombIcon(site)
```

---

## 16. Lag Warning Banner (BARU)

```tsx
// muncul jika networkQuality.bad selama 3s berturut:
{showLagBanner && <div className="lag-banner animate-pulse">Network Lag Detected</div>}
```

State: `useNetworkStore.networkQuality` — diupdate dari ping/loss/jitter monitor.

---

## 17. Settings Menu (BARU)

**File:** `client/src/screens/SettingsMenu.tsx`
- Tab Video (preset: Low/Mid/High + "Reduce effects"), Audio (4 slider), Controls (sens 0.1-5.0, keybind display), Gameplay (slide control 0-10, crosshair style, auto-open buy).
- Zoom sticky: keyboard `Esc` keluar settings → pointer unlock.

---

## 18. Ready/Skip UI (BARU)

- Chip per pemain di bawah timer buy phase: `[✓ READY]`.
- Progress: "8/10 ready".
- Tombol READY (F2): `room.send("ready")` → server skip fase saat 8/10.

---

## 19. Vote Kick UI (BARU)

- Prompt modal: "Kick Player_X? [Y]ES / [N]O" (5s countdown).
- `room.send("voteKick", { targetId, vote })`.
- Pesan hasil: "Player kicked" / "Vote failed".

---

## 20. Spectator HUD (BARU)

**File:** `client/src/components/hud/SpectatorHUD.tsx`
- Saat `isSpectating`:
  - Hidden: crosshair, ammo, HP sendiri.
  - Tampil: nama target + HP bar + K/D + mode indicator.
- Mode: death cam → free cam → follow 1-9 → objective O → third-person V.

---

## QA Checklist HUD/UI

- [ ] Zero image request (audit network panel).
- [ ] FPS counter ±2 akurat, update 1x/s.
- [ ] Ping warna benar di semua range.
- [ ] Minimap align dengan map 3D.
- [ ] Lag banner muncul saat simulasi loss > 5%.
- [ ] Spectate HUD tidak bocor info (ammo disembunyikan).
- [ ] Vote kick & ready bekerja end-to-end ke server.
- [ ] Settings berlaku live tanpa reload.
