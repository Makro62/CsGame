# Phase 0: Setup Monorepo & Shared Types (v2.0)

Untuk mencegah duplikasi kode (State Schema & tipe data) antara Client (React) dan Server (Node.js), kita menggunakan **Monorepo** dengan NPM Workspaces.

## Prerequisites

- Node.js v18+ terinstal.
- Tidak ada dependensi dari fase lain (fase pertama).

## 1. Struktur Folder Monorepo

```text
cs-game/
├── package.json         # Konfigurasi workspace
├── client/              # Vite React App
├── server/              # Node.js Colyseus Server
└── shared/              # Shared Types & Colyseus Schemas
```

## 2. Setup `package.json` Root

```json
{
  "name": "cs-game-monorepo",
  "private": true,
  "workspaces": ["client", "server", "shared"],
  "scripts": {
    "dev": "npm run dev --workspaces",
    "build": "npm run build --workspaces"
  }
}
```

## 3. Setup `shared/` Package

```bash
mkdir shared && cd shared
npm init -y
npm install @colyseus/schema
```

Update `shared/package.json`: name `@cs-game/shared`, main `index.ts`, dep `@colyseus/schema ^2.0.0`.

## 4. Schema & Konstanta di `shared/index.ts` (v2.0 — BARU)

```typescript
import { Schema, type, MapSchema } from "@colyseus/schema";

export class PlayerState extends Schema {
  @type("number") x: number = 0;
  @type("number") y: number = 0;
  @type("number") z: number = 0;
  @type("number") rotationY: number = 0;
  @type("number") hp: number = 100;
}

export class GameState extends Schema {
  @type({ map: PlayerState }) players = new MapSchema<PlayerState>();
}

// ⚠️ BARU: Semua konstanta physics DI SINI (client & server pakai nilai identik!)
export const PHYSICS = {
  walkSpeed: 5, sprintSpeed: 7.5, crouchSpeed: 2.5,
  jumpVelocity: 5, gravity: 9.81,
  strafeMultiplier: 1.2, slideBoost: 1.3, slideDuration: 0.6,
  maxVelocity: 12, maxStrafeTurnDeg: 30,
  friction: { walk: 5, sprint: 3, slide: 0.5, air: 0 },
  airControl: 0.75, moonJumpMult: 1.4, shortHopMult: 0.6,
  inputWindowMs: 100, slideControlDefault: 6,
} as const;

export const WEAPONS = {
  ak47: { dmg: 35, headshot: 100, fireRate: 10, mag: 30, reload: 2.4, price: 2700 },
  m4a1: { dmg: 31, headshot: 92, fireRate: 11, mag: 25, reload: 3.1, price: 3100 },
  awp:  { dmg: 115, headshot: 115, fireRate: 1/1.2, mag: 5, reload: 3.7, price: 4750 },
  deagle:{ dmg: 53, headshot: 100, fireRate: 1/0.3, mag: 7, reload: 2.2, price: 700 },
  mp5:  { dmg: 24, headshot: 72, fireRate: 10.5, mag: 30, reload: 2.1, price: 1500 },
} as const;

export interface ShootInput {
  origin: { x, y, z };
  direction: { x, y, z };
  timestamp: number;
  seq: number;
}
```

## Rollback Procedure

- Jika install gagal: hapus `node_modules` + `package-lock.json`, ulangi `npm install`.
- Jika schema error: kembalikan `shared/index.ts` ke commit terakhir (`git checkout -- shared/index.ts`).

## Verification Steps

- [ ] `npm install` sukses dari root (semua 3 workspace).
- [ ] `node -e "require('@cs-game/shared')"` (dari server) & import dari client tidak error.
- [ ] TypeScript compile lulus di client dan server (`npm run build --workspaces`).
- [ ] Spreadsheet: `shared` dapat di-import oleh keduanya.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| `EACCES` saat install | Jangan gunakan sudo; fix permission folder |
| Type mismatch schema | Pastikan semua `@type` bersifat primitif (string/number/boolean) atau MapSchema |
| Package tidak ditemukan | `npm run build` di `shared` dulu, pastikan `main` mengarah ke file yang diekspor |
