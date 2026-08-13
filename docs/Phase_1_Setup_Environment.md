# Fase 1: Setup & Environment (Web 3D) (v2.0)

Fase ini mempersiapkan proyek secara teknis: struktur folder dan "dunia" 3D sederhana (lantai dan cahaya) sebagai fondasi gameplay.

> **Referensi spek:** [Design_UI_Flow_Geometry.md](Design_UI_Flow_Geometry.md) (geometri/lighting)

## Prerequisites

- Phase 0 selesai (monorepo + `shared` ter-install).
- Client harus bisa meng-import `@cs-game/shared`.

## 1. Inisialisasi Proyek Frontend (Client)

```bash
npx create-vite@latest client --template react-ts
cd client

npm install three @react-three/fiber @react-three/drei @react-three/rapier
npm install zustand
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p
```

### Tailwind Config

```javascript
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: { extend: {} },
  plugins: [],
}
```

## 2. Struktur File Awal (`client/src`)

- `components/` → UI HTML/CSS (Crosshair, Main Menu, HUD).
- `game/` → komponen R3F (Map, Player, Senjata).
- `screens/` → layar penuh (MainMenu, BuyMenu, Leaderboard, DeathScreen).
- `stores/` → Zustand global state (Game, Network, Weapon).
- `hooks/` → custom hooks (usePlayerInput).

## 3. Setup Lingkungan 3D Pertama

```tsx
// src/App.tsx
import { Canvas } from '@react-three/fiber'
import { Sky, PointerLockControls } from '@react-three/drei'
import { Physics } from '@react-three/rapier'

export default function App() {
  return (
    <div className="w-full h-screen">
      {/* UI Overlay di sini (di atas canvas) */}
      <Canvas shadows camera={{ fov: 75 }}>
        <Sky sunPosition={[100, 20, 100]} />
        <ambientLight intensity={0.5} />
        <directionalLight castShadow position={[10, 10, 10]} intensity={1.5} />
        <Physics gravity={[0, -9.81, 0]}>
          <Ground />
        </Physics>
        <PointerLockControls />
      </Canvas>
    </div>
  )
}
```

## Rollback Procedure

- Vite template rusak → hapus `client/` lalu ulangi `create-vite`.
- Dependency gagal → `npm ci` dari root (pakai lockfile).

## Verification Steps

- [ ] `npm run dev` → halaman memuat, tidak ada console error.
- [ ] Browser menampilkan langit, lantai, dan cahaya.
- [ ] Klik layar → pointer lock aktif, mouse-look bekerja.
- [ ] Import `@cs-game/shared` di `App.tsx` tanpa error type.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| WebGL not supported | Upgrade browser / driver GPU |
| Pointer lock error | Pastikan interaksi user 1x sebelum request lock |
| Canvas hitam | Cek <Physics> wrapper — semua mesh harus di dalamnya |
