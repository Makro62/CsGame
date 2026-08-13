# 📖 Panduan Implementasi: Senjata, Peluru & Utilitas (v2.0)

Panduan langkah-demi-langkah implementasi mekanik tembakan, recoil, efek visual, granat taktis — termasuk **switch timing**, **reload cancel window**, dan **nade trajectory preview**.

> **Referensi:** [Design_Weapons.md](Design_Weapons.md) • [Design_Combat_Kill.md](Design_Combat_Kill.md)

---

## Urutan Implementasi (Prioritas)

```
1. State Senjata Aktif (Zustand Store)
2. Raycast Hitscan (Client + Server)
3. Bullet Tracers & Impact Sparks
4. Bullet Hole Decals
5. Hipfire & ADS Akurasi
6. Recoil Pattern "7" (AK-47)
7. Spray Spread
8. Reload Mechanic (+ cancel window)
9. Weapon Switch (deploy/undeploy)
10. Wallbang System
11. HE Grenade
12. Smoke Grenade
13. Flashbang
14. Nade Trajectory Preview (BARU)
15. Melee/Knife (future roadmap)
```

---

## 1. State Senjata Aktif

**File:** `client/src/stores/useWeaponStore.ts`

```ts
interface WeaponStore {
  activeWeapon: 'ak47' | 'm4a1' | 'awp' | 'deagle' | 'mp5' | 'knife' | null
  currentAmmo: number
  isReloading: boolean
  isADS: boolean
  recoilOffset: { x: number, y: number }
  lastFireTime: number
  isSwitching: boolean          // BARU
  switchTimer: number           // BARU
}
```

**Sumber data:** konfirmasi `weaponEquipped` dari server setelah pembelian.

## 2. Raycast Hitscan

**Client (instan):** `THREE.Raycaster` dari kamera; spread offset dari `movementState`; render tracer/spark/decal segera; kirim `shoot { origin, direction, timestamp, seq, weapon }`.

**Server (otoritatif):** validasi (ammo, fire-rate, status) → lag comp rewind → raycast hitbox → damage → broadcast `PlayerDamaged` / `HitConfirmed`.

## 3. Bullet Tracers

**File:** `client/src/game/effects/BulletTracer.tsx`
- Cylinder tipis r0.01 dari muzzle ke impact, warna `#fef08a`, hilang **60ms**.
- **Object pool 20** (hindari GC spikes).

## 4. Sparks & Decals

- Spark: 8-12 partikel r0.02; warna sesuai material (besi oranye / kayu cokelat); hidup 200ms.
- Decal: Plane 0.08m hitam di 0.001m dari permukaan; **maks 50** (tertua dibuang); hilang 10s.

## 5. Hipfire & ADS Akurasi

```ts
const spread = getSpreadRadius(weapon, movementState, isADS)
direction.x += (Math.random() - 0.5) * spread
direction.y += (Math.random() - 0.5) * spread
```

| Kondisi | Spread |
| :--- | :--- |
| Diam + Hipfire | 0.02 |
| Berjalan + Hipfire | 0.06 |
| Sprint / Slide | 0.25 |
| Melompat | 0.45 |
| ADS | 0.0 |
| AWP tanpa scope | 0.50 |

## 6. Recoil Pattern "7" (AK-47)

**File:** `client/src/game/weapons/RecoilController.ts`

- Table lookup: `AK47_RECOIL_PATTERN[bulletsFired]` — offset [x, y] radian.

```ts
const AK47_RECOIL_PATTERN = [
  [0.000, 0.010],  // 1
  [0.000, 0.018],  // 2
  [0.000, 0.025],  // 3
  [0.000, 0.030],  // 4
  [0.000, 0.033],  // 5
  [-0.008, 0.035], // 6 — mulai kiri
  [-0.014, 0.036], // 7
  // ... sampai 30 peluru
]
```

**Recovery:** `lerp(offset, 0, 0.15)` per frame saat tidak menembak.

## 7. Spray Spread (Kumulatif)

- `sprayCount++` per tembakan; `spread += sprayCount * 0.003`; reset 300ms setelah berhenti; cap per senjata.

## 8. Reload Mechanic

**File:** `client/src/game/weapons/ReloadSystem.ts`

1. Press R → `isReloading = true` → timer (AK 2.4s / M4 3.1s / AWP 3.7s / Deagle 2.2s / MP5 2.1s).
2. Lockout: tembak, sprint full, lempar granat.
3. Selesai → `currentAmmo = maxMagazine` → `isReloading = false`.
4. Kirim `reloadStart` ke server (anti-cheat).

**Reload Cancel Window (BARU):** hentikan reload di 40% pertama → aman, ammo mag tetap; > 40% → reload terus berjalan (tidak bisa dibatalkan).

## 9. Weapon Switch (BARU)

- Deploy per senjata (AK/M4 0.6s, AWP 1.0s, Deagle 0.4s, MP5 0.5s).
- `isSwitching = true` → tidak bisa shoot sampai selesai.
- Sunday: cepat switch (0.3s) untuk knife (future).
- Switch saat reload → batalkan reload & amanibunuh undo (render cancel).

## 10. Wallbang System (Server)

> ⚠️ **BELUM diimplementasikan di kode.** Panduan ini adalah rencana implementasi. Status: [Master_Implementation_Checklist.md](Master_Implementation_Checklist.md) #39.

1. Raycast ke objek → cek tag material collider (`wood_crate` / `container_door`).
2. Jika wallbangable → damage *= 0.5 → lanjut raycast (2 pass).
3. Hit pemain di balik → apply damage (maks 2 permukaan).

## 11. HE Grenade

1. RigidBody dynamic + BallCollider (lintasan parabolik Rapier).
2. Detonate 2s → **sphere cast radius 4m**.
3. Damage: 80 di titik pusat → linier 10 di 4m; self-damage 50%.
4. Client: partikel ledakan + camera shake (radius 6m).

## 12. Smoke Grenade

1. Bola fisika; 1s setelah landing → expand sphere semi-transparan r3m.
2. Server: raycast skip jika melewati zone smoke; outline glow mati.
3. Hilang 15s (fade out 2s akhir).

## 13. Flashbang

1. Bola restitution tinggi, detonate 1.5s / pantulan kedua.
2. Server: LOS check per pemain + sudut pandang → durasi (≤45°=3s, ≤70°=1.5s, else 0.5s).
3. Client: overlay putih + `brightness(5)` + tinnitus 1-3s.

## 14. Nade Trajectory Preview (BARU)

- Tahan LMB saat granat: garis putus-putus parabola 1.5s (simulasi Rapier 30 step).
- Cooldown anti-spam 5s. Tidak menembus dinding (stop di impact).

## 15. Melee/Knife (Future Roadmap)

- Model box kecil + animasi stab 0.3s; damage 50 lunge; **passive speed +10%** saat dipegang (Krunker-style).

---

## QA Checklist Weapons (implementasi)

- [ ] Damage server sesuai tabel (semua senjata).
- [ ] TTK match: AK 3 torso, M4 4 torso, AWP 1, Deagle 2 torso.
- [ ] Recoil "7" deterministik; spray reset 300ms.
- [ ] Wallbang: kecuali MP5; maks 2 permukaan.
- [ ] Switch deploy mencegah shoot; cancel reload 40% bekerja.
- [ ] HE self-damage 50%; smoke blokir LOS & outline; flash sudut → durasi.
- [ ] Trajectory preview tidak menembus dinding.
- [ ] Semua granat maks 3 per pemain per ronde (server enforce).
