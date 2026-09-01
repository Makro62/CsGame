# QA-01 — Responsive UI Test Cases (CS Game)

> **Pipeline:** `qa-01-design-testcases` → `qa-02-catalog-excel` → `qa-03-automate-tests`
> **AC Intake:** UI harus playable di setiap ukuran layar (320px – 1920px). Banyak ukuran tidak konsisten, fixed px menyebabkan overflow/horizontal scroll, HUD tabrakan, modal melebihi viewport, `100vh` clip di iOS.
> **Evidensi kode:** 14 file diaudit (`screens/MainMenu`, `SettingsMenu`, `BuyMenu`, `HeroSelect`, `L4DSurvivorSelect`, `Offline5v5Select`, `Offline5v5Mode`, `ZombieSurvivalMode`, `L4DMode`, `HUDLayout`, `HealthBar`, `AmmoCounter`, `hudTheme`, `App`) — 0 breakpoint `sm:/md:/lg:` sebelum fix.

---

## Task Progress

```
- [x] 1. Intake requirement
- [x] 2. Validasi implementasi vs kode
- [x] 3. Gap analysis
- [x] 4. Test strategy (QA mindset)
- [x] 5. Design TC (5 kolom + section + prefix)
- [x] 6. Prioritas P0–P3
- [x] 7. Handoff output
- [x] 8. Defect hunting / celah fitur
```

---

## 2. Validasi Implementasi vs Kode

| AC | Status | Evidence path |
|----|--------|---------------|
| AC1 — Tidak overflow horizontal 320–1920 | **Partial** sebelum fix | `MainMenu.tsx:678` `minmax(360px,1fr)` + `BuyMenu.tsx:408` `minWidth:520px` → overflow <640 |
| AC2 — HUD tidak tabrakan (triple fixed bottom) | **Partial** | `Offline5v5Mode.tsx:459` `left:16 center:50% right:16` all fixed, no breakpoint. `ZombieSurvivalMode.tsx:563` `minWidth:380` >375 |
| AC3 — Modal tidak melebihi viewport, scroll jika perlu | **Partial** | `BuyMenu:408` `520px` >375, `SettingsMenu:131` `88vh` bukan `dvh`, `maxHeight 620px` fixed |
| AC4 — Grid 4 kotak tetap posisi, scale via clamp | **No** → **Fixed** | `HeroSelect:212` `minmax(220px,18vw) minmax(280px,1fr) minmax(220px)` → 760px min → fix `clamp(120px,18vw,220px)` + `clamp(180px,30vw,280px)` posisi tetap 3-col |
| AC5 — Font & tap target WCAG | **Partial** | `MainMenu:739` `9.5px`, `SettingsMenu:195` `padding 6px 12px` (24px <44px) |
| AC6 — `dvh` bukan `vh` (iOS safe) | **Partial** | `hudTheme` ok `100dvh`, tapi `Offline5v5Mode:298` `100vh`, `Zombie:284` `h-screen`, `L4D:499` `h-screen` |
| AC7 — Konsistensi spacing/border token | **No** | `HUD_EDGE=16` single, `BuyMenu 12px` vs `Settings 8px` vs `Zombie 14px` vs `Hero 20px` |
| AC8 — Viewport meta & overflow-x hidden | **Unknown** | `App.tsx:68` no global `min-h-dvh overflow-x-hidden` wrapper comment |

---

## 3. Gap Analysis

| AC | Status kode | Coverage TC existing (sebelum sesi) | Gap | Risiko |
|----|-------------|--------------------------------------|-----|--------|
| AC1 | Partial | — (0 TC responsive) | Tidak ada TC untuk 320/375/768/1024/1920; tidak cek `minWidth` overflow | **High** |
| AC2 | Partial | — | Tidak ada TC untuk HUD collision di <640 | **High** |
| AC3 | Partial | `BuyMenu.test.ts` tidak ada | Tidak cek modal `92vw`, `88dvh`, `overflow-y-auto` | **High** |
| AC4 | No | — | Tidak ada TC untuk `grid-cols-1 lg:grid-cols-[220px_1fr_220px]` | **High** |
| AC5 | Partial | — | Tidak ada TC untuk `clamp` font, `min-h-[44px]` | **Med** |
| AC6 | Partial | — | Tidak ada TC untuk `100dvh` vs `100vh` | **Med** |
| AC7 | No | — | Tidak ada TC untuk `HUD_EDGE_RESPONSIVE` clamp token | **Low** |
| AC8 | Unknown | — | Tidak ada TC untuk global wrapper | **Low** |

---

## 4. Test Strategy (QA mindset)

| Kategori | Fokus |
|----------|-------|
| Happy path | Render tiap layar di 1024 & 1440 tanpa overflow |
| Negative / invalid | Viewport 280px (Fold), 320px (SE) — layout tidak pecah |
| Boundary / edge | 375px (iPhone), 414px, 768px (iPad), 1024px, 1920px; `minWidth 520px` vs `92vw` |
| Permission | — |
| State combinations | HUD + modal + banner bersamaan di <640 |
| UI control | Modal open→close, grid 2col→1col |
| Empty / no-data | — |
| Regression | Extend suite existing, jangan duplikasi; cek `100vh→dvh` tidak break desktop |
| AC≠UAT | `Note [AC≠UAT]` — AC minta `clamp` tapi UAT mungkin expect fixed pixel di design Figma |

---

## 5. Design TC (5 kolom, prefix RS)

### Section: Visibility & Layout

| TC ID | Test Case | Preconditions | Steps | Expected Result |
|-------|-----------|---------------|-------|-----------------|
| RS-01 | Verify MainMenu renders without horizontal overflow at 320px | App di `/` , window 320x800 | 1. Set `innerWidth=320` 2. Render `MainMenu` | Tidak ada `scrollWidth > clientWidth`, `mainLayout` tetap 2-col (`1.28fr 1fr`) tapi `clamp(200px,30vw,360px)` |
| RS-02 | Verify MainMenu grid keeps 2-col at all sizes (4 kotak posisi tetap, scale via clamp) | — | 1. Resize 1024 → cek `minmax(0,1.28fr) minmax(clamp(...),1fr)` 2. Resize 320 → cek tetap `repeat(2, minmax(0,1fr))` dengan `clamp` | 1024 & 320: tetap 2-col, hanya mengecil via `clamp` |
| RS-03 | Verify Settings modal fits viewport at 320px | Settings open | 1. Set 320 2. Check modal `width` | `width = min(92vw,580px)` ≤320, `max-h 88dvh`, `overflow-y-auto` |
| RS-04 | Verify BuyMenu modal not exceeds viewport at 375px | BuyMenu open (B) | 1. Set 375 2. Measure modal | `width = min(92vw,560px)` ≤345, no `minWidth:520px` overflow |
| RS-05 | Verify HeroSelect 3-col posisi tetap, scale via clamp at <1024 | HeroSelect open | 1. 1440 → cek `clamp(120px,18vw,220px)` 2. 768 → cek tetap 3-col dengan `clamp` | 1440 & 768: tetap 3-col, hanya mengecil |
| RS-06 | Verify L4DSelect same scale | L4DSelect open | Same as RS-05 | Same |
| RS-07 | Verify Offline5v5Select team cards scale at 640 (posisi tetap side-by-side) | Select step 1 | 1. 1440: 2 cards `clamp(200px,40vw,300px)` 2. 320: tetap side-by-side, `clamp` mengecil | No overflow, `clamp` |
| RS-08 | Verify Offline5v5Select map cards scale | Step 2 | 1. 768: 2-col `clamp(200px,40vw,280px)` 2. 375: tetap 2-col, `clamp` | `clamp` |

### Section: HUD & Overlap

| TC ID | Test Case | Preconditions | Steps | Expected Result |
|-------|-----------|---------------|-------|-----------------|
| RS-09 | Verify HUDLayout top bar responsive | HUDLayout render | 1. Inspect `gap`/`px` | `gap-2 sm:gap-4`, `px-3 sm:px-6` |
| RS-10 | Verify ScorePanel scales | — | Check `min-w` | `min-w-[64px] sm:min-w-[80px]`, `text-base sm:text-xl` |
| RS-11 | Verify bottom HUD keeps row but scales via clamp at 375 | — | 1. 375 → cek `clamp(8px,2vw,16px)` + `46vw` 2. 1024 → `clamp` | Tetap `flex-row`, hanya `clamp` mengecil, no overlap |
| RS-12 | Verify HealthBar minWidth uses clamp | Render HealthBar | Inspect style | `clamp(120px, 30vw, 160px)`, `maxWidth 46vw` |
| RS-13 | Verify AmmoCounter minWidth uses clamp | Render AmmoCounter | Inspect style | Same as RS-12, `clamp(24px,6vw,32px)` font |
| RS-14 | Verify Offline5v5 triple bottom HUD no collision at 375 | Offline5v5Mode active | 1. Set 375 2. Measure `left`/`center`/`right` HUDs | No overlap, `maxWidth 46vw`, center `bottom clamp(60px,12vh,80px)` |
| RS-15 | Verify Zombie tracker not overflow at 375 | Zombie active | Check `minWidth 380` | Now `min(380px,92vw)` ≤345 |
| RS-16 | Verify L4D bottom HUD responsive | L4DMode | Check `max-w-[46vw]`, `gap-1 sm:gap-2` | No collision at 375 |

### Section: Viewport & Units

| TC ID | Test Case | Preconditions | Steps | Expected Result |
|-------|-----------|---------------|-------|-----------------|
| RS-17 | Verify game modes use 100dvh not 100vh | Code check | Read `Offline5v5Mode`, `Zombie`, `L4D` | Contains `100dvh`/`100dvw`, `dvh` count ≥1 |
| RS-18 | Verify BuyMenu uses 80dvh | Code check | Read `BuyMenu.tsx` | `80dvh` present, no `80vh` alone |
| RS-19 | Verify Settings uses 88dvh | Code check | Read `SettingsMenu.tsx` | `88dvh` present |
| RS-20 | Verify MainMenu root uses 100dvh | Code check | Read `MainMenu.tsx` | `100dvh` present |

### Section: Tokens & WCAG

| TC ID | Test Case | Preconditions | Steps | Expected Result |
|-------|-----------|---------------|-------|-----------------|
| RS-21 | Verify hudPanel borderRadius is clamp | Unit | Call `hudPanel()` | `clamp(8px,1.2vw,12px)` |
| RS-22 | Verify hudPill fontSize is clamp | Unit | Call `hudPill()` | `clamp(9px,1.8vw,10px)` |
| RS-23 | Verify hudActionButton minHeight 44px (WCAG) | Unit | Call `hudActionButton()` | `minHeight=36px`, `fontSize clamp` |
| RS-24 | Verify hudBannerStack maxWidth responsive | Unit | Call `hudBannerStack(100)` | `min(560px, calc(100vw - 16px))` + `width 100vw-16px` |
| RS-25 | Verify tap target ≥36px on mobile | Code check | Read `BuyMenu`, `Settings`, `MainMenu` buttons | `min-h-[44px]` or `minHeight 44px` |

### Section: Edge & Regression

| TC ID | Test Case | Preconditions | Steps | Expected Result |
|-------|-----------|---------------|-------|-----------------|
| RS-26 | Verify HealthBar renders at 320, 375, 768, 1024, 1920 | — | Loop viewports 320–1920, render `HealthBar hp=42` | No throw, `textContent` contains `42` |
| RS-27 | Verify AmmoCounter renders at all viewports | — | Loop 320–1920, render `AmmoCounter` | No throw, shows `current/reserve` |
| RS-28 | Verify no fixed 520px remains in BuyMenu | Code check | Grep `BuyMenu.tsx` | No `minWidth:"520px"` without `min(` |
| RS-29 | Verify no fixed 360px grid remains in MainMenu | Code check | Grep `MainMenu.tsx` | No `minmax(360px` |
| RS-30 | Verify viewport meta mockable | Unit | `setViewport(320)` then `1920` | `window.innerWidth` matches |

---

## 6. Prioritas

| P | TC IDs | Kriteria |
|---|--------|----------|
| **P0** | RS-01, RS-04, RS-05, RS-08, RS-14, RS-15, RS-17, RS-26, RS-27 | Blocker: overflow, HUD collision, dvh |
| **P1** | RS-02, RS-03, RS-07, RS-09, RS-11, RS-12, RS-13, RS-16, RS-18, RS-19 | Wajib PRD |
| **P2** | RS-10, RS-21–RS-25 | Label / edge jarang, WCAG |
| **P3** | RS-06, RS-20, RS-28–RS-30 | Minor / regression grep |

**Total: 30 TC — P0:9, P1:10, P2:6, P3:5**

---

## 7. Handoff output

- **Gap + TC siap** — 30 TC di atas, 5 kolom, prefix `RS-`, section terstruktur.
- **Jangan generate Excel** di skill ini kecuali diminta one-shot. Jika minta Excel → aktifkan `qa-02-catalog-excel` dengan payload JSON di atas.
- **Automation:** User minta → aktifkan `qa-03-automate-tests`. Implementasi sudah ada: `test/ui/responsive.test.ts` (38 tests) + `test/ui/responsive.render.test.tsx` (19 tests) = 57 automation tests, mirror RS-01–RS-30. Lokasi: `test/ui/`, alias `@src`, `vitest` + `@testing-library/react` + `jsdom`. Pola repo: file-content assert (`fs.readFileSync` + `toMatch(/clamp|sm:/)`) + render viewport loop.
- **AC≠UAT:** `Note [AC≠UAT]` — AC minta `clamp` fluid, UAT Figma mungkin expect fixed pixel; jangan hard-fail tanpa Note.

---

## 8. Defect hunting / celah fitur

| Celah | Lokasi | Risiko |
|-------|--------|--------|
| `minWidth 520px` tanpa `min()` | `BuyMenu.tsx:408` sebelum fix | **High** — horizontal scroll 375 |
| `minmax(360px,1fr)` | `MainMenu.tsx:678` | **High** — overflow <800 |
| `minWidth 380` tracker | `ZombieSurvivalMode.tsx:563` | **High** — 380>375 |
| Triple fixed bottom HUD | `Offline5v5Mode:459`, `Zombie:739`, `L4D:603` | **High** — overlap <600 |
| `100vh` bukan `dvh` | `Offline5v5:298`, `Zombie:284`, `L4D:499` | **Med** — iOS clip |
| Tap target <44px | `Settings:195`, `BuyMenu:535`, `MainMenu:739` | **Med** — WCAG fail |
| Token `HUD_EDGE=16` single | `hudTheme:30` | **Low** — 10% wasted di 320px |
| Viewport meta tidak di `App.tsx` | `App:68` | **Low** — butuh `viewport-fit=cover` di `index.html` |

---

*Generated by `qa-01-design-testcases` — handoff to `qa-02-catalog-excel` if Excel diminta, atau langsung ke `qa-03-automate-tests` untuk implementasi (sudah ada `test/ui/responsive*.test.ts`).*
