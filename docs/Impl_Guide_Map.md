# 📖 Panduan Implementasi: Map "Container Yard" 3D (v2.0)

Panduan langkah-demi-langkah membangun arena 3D memakai primitive `BoxGeometry` (tanpa GLB eksternal) di React Three Fiber — termasuk **minimap data export**, **spawn protection zones**, dan **training range arena**.

> **Referensi:** [Design_Map_Layout.md](Design_Map_Layout.md) • [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md)

---

## Urutan Implementasi (Prioritas)

```
1. Lantai & Batas Dinding Arena
2. T-Spawn & CT-Spawn Zones (color coded)
3. Kontainer Shipping (instancedMesh)
4. Boks Kayu (wallbangable)
5. Tong Besi (bulletproof)
6. Kontainer L-Shape (Ambush Tunnel)
7. Ramp Miring & Atap (High Ground Site B)
8. Trigger Zones (Buy/Plant)
9. Pencahayaan Sunny Day
10. Physics Colliders (Terpisah dari Visual)
11. Spawn Protection Zones (BARU)
12. Callout Labels (debug)
13. Minimap Data Export (BARU)
14. Training Range Arena (BARU)
```

---

## 1. Lantai & Batas Dinding

**File:** `client/src/game/map/ArenaFloor.tsx`
- Dimensi 60×40m (X -30..30, Z -20..20).
- Lantai `PlaneGeometry [60, 40]` rot -PI/2, `#4a5568`.
- Tembok 4 sisi: Utara/Selatan `[60, 7.2, 0.5]`, Barat/Timur `[0.5, 7.2, 40]`, `#6b7280`.

## 2. Spawn Zones

- T-Spawn: circle `#ef444433` di [-25, 0.01, 0] (r5).
- CT-Spawn: circle `#3b82f633` di [25, 0.01, 0].

## 3. Kontainer Shipping

- Satu kontainer: `Box [6.0, 2.4, 2.4]`.
- **Wajib `instancedMesh`** (satu draw call untuk puluhan kontainer).

## 4. Boks Kayu

> ⚠️ `wallbangable` di bawah ini **belum diproses oleh sistem tembak** (wallbang belum diimplementasikan) — peluru saat ini diblokir semua permukaan.

- `Box [1.2,1.2,1.2]` `#92400e`.
- Collider `CuboidCollider` + `userData: { material: 'wood_crate', wallbangable: true }`.
- 3-5 di lorong A, 2-3 dekat ramp B.

## 5. Tong Besi

- `Cylinder [0.35, 0.35, 1.5]` `#374151`.
- `userData: { material: 'iron_barrel', wallbangable: false }`.
- 2 di pintu Mid (dari T), 1-2 di Site A.

## 6. Kontainer L-Shape

- 2 kontainer sudut 90°; area persimpangan dead zone.

## 7. Ramp & Atap

- `Box [2.4, 0.1, 2.4]` rotation.x = -PI/6 (30°), menempel kontainer B.
- Autostep (0.5, 0.2) membuat pemain bisa naik.

## 8. Trigger Zones

- Buy Zone: invisible sensor box 6×6m di [-25,0,0] & [25,0,0] → `playerInBuyZone`.
- Plant Zone: `CircleGeometry r4` transparan hijau di [-5,0,-15] & [5,0,15] → tombol 'E' tanam.

## 9. Pencahayaan Sunny Day

```jsx
<ambientLight intensity={0.7} color="#ffeedd" />
<directionalLight castShadow position={[20,30,10]} intensity={2.0}
  shadow-mapSize={[2048,2048]} />
<Sky sunPosition={[100,30,100]} sunScale={1} />
```

## 10. Physics Colliders

- Collider sedikit lebih kecil dari visual (anti-stuck).
- `type="fixed"` untuk statis; hanya pemain `kinematicPosition`.
- Debug: `<Debug />` rapier untuk wireframe collider.

---

## 11. Spawn Protection Zones (BARU)

- 2 zone sensor tambahan: radius 5m di tiap spawn.
- Saat pemain spawn: aktifkan `invulnerable = true` + timer 1.5s.
- Hilangkan invuln jika: menembak, atau keluar radius 5m (sensor exit).
- Server juga memvalidasi (client visual only).

## 12. Callout Labels (BARU)

- Debug-only: `<Html>` drei dengan label (Tunnel, Mid Box, Barrels, Ramp Top, B Stack, A Corner...).
- Hapus di build produksi (flag `__DEV__`).

## 13. Minimap Data Export (BARU)

- Komponen map mengekspor data **top-down** ke `useNetworkStore.minimapData`:
  - Zone rectangles (color-coded), plant zones, spawn points, cover roundrects.
- Client minimap canvas mengonsumsi data ini — jangan hardcode koordinat di dua tempat.

## 14. Training Range Arena (BARU)

- Area 30×20m terpisah (di dalam map utama, sisi selatan luar = di floor yang sama? Tidak — **arena terpisah di dalam map, blokir pintu masuk dengan collider invisible**).
- Pilih mode: `range` di GameState (single player local).
- Dummy target prefab + aim trainer target spawner + movement course checkpoint ring (8 cincin) + recoil wall.

---

## QA Checklist Map (implementasi)

- [ ] Tidak ada gap/clipping; autostep & snap-to-ground bekerja di ramp.
- [ ] Wallbang 2 permukaan hanya lewat boks/container door.
- [ ] Buy & plant zone presisi.
- [ ] Spawn invuln 1.5s hilang saat shoot / keluar radius.
- [ ] Callout labels off di produksi.
- [ ] Minimap align 100% dengan slope/cover (test visual overlays).
- [ ] Training range: dummy/aim/movement course jalan lokal.
- [ ] InstancedMesh digunakan untuk container (draw calls < 500).
