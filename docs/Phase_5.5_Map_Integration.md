# Phase 5.5: Integrasi Map Container Yard (v2.0)

Menggabungkan mode Bomb Defusal dengan map 3D "Container Yard" (60×40m): rintangan, zona, dan geometri.

> **Referensi:** [Design_Map_Layout.md](Design_Map_Layout.md) • [Impl_Guide_Map.md](Impl_Guide_Map.md) • [Gameplay_Mechanics_Bible.md](Gameplay_Mechanics_Bible.md#chapter-8-map-strategy)

## Prerequisites

- Phase 5 (mode + ekonomi) selesai.
- Asset map (gltf/glb atau primitive meshes) siap.

## 1. Pemodelan & Rendering Map (v2.0)

- Peta 60×40m dengan detail: container stack, palet, box kayu, tong besi.
- Collision material:
  - Box kayu: penembus peluru (damage -50%, wallbang). ⚠️ **wallbang belum diimplementasikan** — lihat [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) #39
  - Tong besi / dinding: tidak tembus.

## 2. Definisi Zona (v2.0 — koordinat terspesifikasi)

| Zona | Koordinat / Radius |
| :--- | :--- |
| Buy Zone T & CT | 6x6m di [-25,0,0] dan [25,0,0] |
| Plant Zone A | [-5,0,-15], radius 8m |
| Plant Zone B | [5,0,15], radius 8m |
| Spawn Protection | invulnerability 1.5s saat respawn |

## 3. Navigasi & Geometri 3D (v2.0)

- Autostep character controller 0.5m untuk ramp — mulus tanpa tepi.
- Batasan map: bounding box 60x40m; tembok perimeter tinggi 7.2m (cegah moon-jump keluar).
- Collision margin 5%: collider kontainer lebih kecil dari visual (hindari stuck).

## Rollback Procedure

- Jika pemain menembus corner → kembalikan margin collider 5% & autostep.
- Jika z-fighting pada container stack → samakan ukuran UV/texture.

## Verification Steps

- [ ] Tidak ada gap/clipping yang membuat pemain jatuh keluar map.
- [ ] Plant hanya di Site A / Site B (radius sesuai).
- [ ] Box kayu tembus (-50% dmg); dinding solid tidak.
- [ ] Buy menu hanya di Buy Zone (validasi koordinat).
- [ ] Moon-jump tidak bisa melewati perimeter (7.2m height).

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Stuck di kontainer | Margin collider 5%; autostep 0.5m; snapToGround |
| Wallbang tidak bekerja | Material physics layer penetrable vs solid pada raycast |
| Pemain melompat keluar map | Pastikan tembok perimeter 7.2m + collider penuh |
