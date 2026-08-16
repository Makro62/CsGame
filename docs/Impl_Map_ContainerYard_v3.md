# Proses Implementasi — Container Yard Map v3

> **Status:** 🔲 Belum dikerjakan (map v2.2 sudah ada; dokumen ini = perbaikan bentuk + visual)  
> **Tujuan:** arena bomb-defusal lebih rapi, mudah dibaca, dan menarik — tanpa ganti mode 5v5 plant/defuse.  
> **Tanggal:** 16 Agustus 2026  
> **Kode:** `client/src/game/map/ContainerYard.tsx`, `client/src/game/map/MapHelpers.tsx`, `shared/index.ts`, `client/src/components/Minimap.tsx`  
> **Angka gameplay:** [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md) · [Analysis_Reference_Doc.md](Analysis_Reference_Doc.md)

---

## 0. Kondisi Awal (apa yang sudah ada)

| Item | Status di kode |
| :--- | :--- |
| Arena 60×40 m + perimeter walls | ✅ |
| `MAP_OBSTACLES` + mirror visual | ✅ |
| Mid box, barrels, Site A/B, B-tunnel, ramp | ✅ |
| Callout toggle V | ✅ |
| Material flat / prop sedikit / spawn slab tipis | 🟨 prototype |
| Minimap Site A/B ≠ `BOMB_SITES` | 🔴 bug |
| Ramp visual miring, collision AABB lurus | 🔴 bug |

**Single source of truth koordinat (kode saat ini):**

```ts
SPAWN.T = (-25, 0, 0)
SPAWN.CT = (25, 0, 0)
BOMB_SITES.A = (15, 0, -15) radius 6
BOMB_SITES.B = (12, 0, 15) radius 6
BUY_ZONE radius = 10
MAP_BOUNDARY = X±29, Z±19
```

Keputusan v3: **pertahankan** `BOMB_SITES` di atas; rapikan cover + fix minimap/callout mengelilinginya. Geser plant ke pusat map = fase opsional belakangan.

---

## 1. Urutan Kerja (wajib ikuti)

```
Fase A  Sinkron data + bentuk    →  wajib dulu
Fase B  Visual & lighting        →  setelah A hijau
Fase C  Polish & balance         →  opsional
```

Jangan mulai Fase B sebelum checklist Fase A lulus.

---

## 2. Fase A — Sinkron & Bentuk Rapi

### A1. Fix minimap ↔ `BOMB_SITES`

**File:** `client/src/components/Minimap.tsx`

- Hapus hardcode `SITE_A = (-5,-15)` / `SITE_B = (5,15)`.
- Import `BOMB_SITES`, `SPAWN` dari `@cs-game/shared`.
- Gambar marker plant di pusat site; tambah titik T/CT spawn.

**Done when:** marker minimap tepat di atas floor zone plant di world.

### A2. Align callout ke plant

**File:** `shared/index.ts` (`MAP_CALLOUTS`)

- `site_a` / `site_b` → pusat plant (atau label terpisah `a_main` vs `site_a`).
- Pastikan label V tidak menunjuk choke kosong.

### A3. Tutup koridor Site A (G1)

**File:** `ContainerYard.tsx` + `MAP_OBSTACLES`

- Di x≈0…10, z≈-15 tambah 2–3 kontainer/stack wood+metal.
- Setiap mesh baru **wajib** entry `MAP_OBSTACLES` (client hitscan + server movement).

**Done when:** tidak ada strip kosong >~8 m di jalur plant A.

### A4. L-choke A↔Mid (G2)

- 2 kontainer sudut 90° antara Mid dan Site A (callout Tunnel).
- Update `MAP_CALLOUTS` bila perlu.

### A5. Landmark spawn Red/Blue Base (G4)

- T-spawn: 1–2 kontainer merah + slab buy zone.
- CT-spawn: simetris biru.
- Bukan hanya plane 0.1 m.

### A6. Mid Yellow AWP cover (G3)

- Tambah kontainer/`nest` kuning di mid (selain wood 1.2³).
- Jaga sightline AWP tetap ada counter-cover (barrels).

### A7. Match ramp collision ↔ visual

**File:** `ContainerYard.tsx` + `MAP_OBSTACLES` `site_b_ramp`

- Visual sudah `rotation z = π/6`.
- Collision harus mengikuti kemiringan (collider rotated / mesh collider), bukan AABB lurus.
- Prop rotated (`dec_panel`, `dec_crate_2`): hilangkan rotasi **atau** OBB ikut.

**Done when:** naik ramp B mulus; kaki tidak “mengambang” / nyangkut di AABB palsu.

### Checklist Fase A

- [ ] Minimap A/B/spawn = shared constants
- [ ] Callout align plant
- [ ] Koridor A tertutup cover
- [ ] L-choke A↔Mid ada
- [ ] Red/Blue Base spawn
- [ ] Mid yellow landmark
- [ ] Ramp physics = visual
- [ ] Smoke-test plant/defuse + rotate A↔B

---

## 3. Fase B — Visual Menarik

### B1. Material per tipe (`MapHelpers.tsx`)

| Tipe | rough / metal (target) |
| :--- | :--- |
| Wood | 0.9 / 0 |
| Metal container | 0.35–0.5 / 0.55–0.7 |
| Concrete wall | 0.85 / 0 |

### B2. Prop grid-aligned

- Perluas `DecorativeDetails`: 3–5 crate pendekatan A, 2–3 dekat ramp B.
- Grid kelipatan 1.2 m; jangan tebar di sightline mid.
- Cover fungsional → `MAP_OBSTACLES`; dekor murni → collider kecil/tidak ada.

### B3. Ground noise deterministik

- Ganti `Math.random()` displacement lantai dengan noise ber-seed (semua client sama).
- Amplitudo kecil (±0.05) agar tidak bertentangan physics flat.

### B4. Stensil A/B + lane cues

- Huruf A/B di floor plant zone.
- Strip tipis 3-lane (west/mid/east) tanpa collider.

### B5. Lighting map-local di `ContainerYard`

- Directional + shadow-mapSize 2048.
- Ambient warm `#ffeedd` ~0.55–0.7.
- Fill rendah di B-tunnel; rim di Ramp Top.

### Checklist Fase B

- [ ] Metal/wood/concrete terasa beda
- [ ] Spawn merah/biru jelas dari mid
- [ ] Tunnel lebih gelap dari outdoor
- [ ] Tidak clipping prop
- [ ] Shadow kontainer aktif

---

## 4. Fase C — Polish (opsional)

| ID | Kerja |
| :--- | :--- |
| C1 | `InstancedMesh` kontainer (perf) |
| C2 | Minimap overlay AABB `MAP_OBSTACLES` (+ export `minimapData`) |
| C3 | Balance: geser plant lebih ke tengah jika CT advantage terlalu besar |
| C4 | Rapikan B-tunnel geometri (G5); dokumentasikan inset boundary (G6) |

---

## 5. Aturan Wajib Saat Edit Map

1. **Satu truth:** ubah geometri cover → update `MAP_OBSTACLES` di `shared` **dan** visual di `ContainerYard.tsx`.
2. **Jangan** hardcode koordinat site di Minimap / HUD.
3. Tetap zero-asset (primitives); jangan impor GLB besar untuk MVP v3.
4. Setelah edit: playtest T-spawn → A, T→B, CT→A, CT→B, plant, defuse, AWP mid.

---

## 6. File Sentuh per Fase

| Fase | File |
| :--- | :--- |
| A | `Minimap.tsx`, `shared/index.ts`, `ContainerYard.tsx` |
| B | `MapHelpers.tsx`, `ContainerYard.tsx` |
| C | `ContainerYard.tsx`, `Minimap.tsx`, `shared/index.ts` |

---

## 7. Definition of Done (v3 selesai)

1. Choke/lane/site terbaca &lt;3 detik first-person + minimap akurat.
2. Landmark spawn & mid jelas.
3. Visual–physics match di ramp & prop.
4. Material & lighting terasa “yard”, bukan prototype flat.
5. Tidak ada hardcode site yang drift dari `BOMB_SITES`.
