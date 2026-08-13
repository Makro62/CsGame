# Fase 4: Multiplayer Server Setup (v2.0)

Fase ini mengubah game dari single-player menjadi **multiplayer sesungguhnya** dengan **Colyseus** di Node.js — termasuk sync, lag compensation, spectator, reconnect, vote, dan overtime.

> **Referensi:** [Impl_Guide_Server.md](Impl_Guide_Server.md) • [Design_Networking_Advanced.md](Design_Networking_Advanced.md)

## Prerequisites

- Phase 0 selesai (shared schema + PHYSICS/WEAPONS konstanta).
- Phase 2 & 3 selesai (client movement + shooting siap di-sync).
- Fase 2.5 (network prototype 2 client) sudah dijalankan.

## 1. Inisialisasi Proyek Backend (Server)

```bash
mkdir server && cd server
npm init -y
npm install colyseus express cors @colyseus/schema
npm install -D typescript ts-node @types/express @types/node
npx tsc --init
```

## 2. Skema State (Schema) — dari shared

- **Wajib import dari shared** (bukan duplikasi):
  `import { GameState, PlayerState, PHYSICS, WEAPONS } from "@cs-game/shared"`

## 3. Room Logic

```typescript
export class FPSRoom extends Room<GameState> {
  maxClients = 10;

  onCreate(options: any) {
    this.setState(new GameState());
    this.clock.setInterval(this.gameLoop, 1000 / 30);  // 30 tick/s

    this.onMessage("input", (client, data) => { /* seq, delta, timestamp → validate & apply */ });
    this.onMessage("shoot", (client, data) => { /* lag comp + raycast → damage */ });
    this.onMessage("buy", (client, itemId) => { /* ekonomi validasi */ });
    this.onMessage("radio", (client, code) => { /* team-filter broadcast */ });
    // v2.0 BARU:
    this.onMessage("ready", ...);      // skip buy phase di 8/10
    this.onMessage("voteKick", ...);   // 50%+ kick
    this.onMessage("forfeit", ...);    // 4/5 ff
    this.onMessage("spectate", ...);   // set spectateTargetId
  }

  onJoin(client: Client, options: any) { /* zig-zag team, spawn, money 800 */ }
  onLeave(client: Client, consented: boolean) { /* snapshot 60s reconnect */ }
}
```

## 4. Fitur Multiplayer v2.0

| Fitur | Status | Deskripsi Ringkas |
| :--- | :--- | :--- |
| Prediction + reconciliation | MVP | lerp <0.5 / snap >0.5 |
| Lag compensation | MVP | buffer 500ms |
| Bomb defusal + economy | MVP | plant 3s / 40s / defuse 5/10 |
| Anti-cheat | MVP | speed/fire-rate/ammo/dead |
| Interest management | Post | 60m + LOS |
| Spectator broadcast | Post | free cam/follow/objective |
| Reconnect 60s | Post | session resume |
| Vote kick / forfeit / ready | Post | 50% / 4-5 / 8-10 |
| Overtime 7-7 → sudden death | Post | auto trigger |

## 5. Konfigurasi Server Utama (index.ts)

```typescript
const gameServer = new Server({ server: http.createServer(app) });
gameServer.define("fps_room", FPSRoom);
server.listen(2567, () => console.log("Listening on :2567"));
```

## 6. Koneksi Client

```ts
import * as Colyseus from "colyseus.js";
const client = new Colyseus.Client("ws://localhost:2567");
client.joinOrCreate("fps_room", { nickname }).then(room => { ... })
```

## Rollback Procedure

- Server crash loop → cek log schema; jika error schema, revert ke commit sebelumnya.
- Desync parah → aktifkan flag debug (tick 30 → 15) sementara untuk debugging.

## Verification Steps

- [ ] 2 tab browser saling melihat & menembak (HP berkurang dari server).
- [ ] Simulasi 100ms latency: prediction responsif, reconciliation benar.
- [ ] Reconnect dalam 60s mengembalikan state; vote kick & forfeit bekerja.
- [ ] Overtime trigger pada 7-7.
- [ ] Anti-cheat menolak paket speedhack & fire-rate hack.

## Common Errors

| Error | Solusi |
| :--- | :--- |
| Connect refused :2567 | Jalankan server dulu (`npm run dev` di server/) |
| Desync hitbox | Samakan schema & konstanta via shared; jangan hardcode |
| Reconnect tidak restore | Cek TTL slot 60s & sessionId dikirim saat join |
