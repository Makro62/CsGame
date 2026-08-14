# Analisis Kode & Rekomendasi Perbaikan — CsGame (CS Web FPS)

> **Repository:** `https://github.com/Makro62/CsGame`  
> **Versi Analisis:** v2.1  
> **Tanggal:** 14 Agustus 2026  
> **Lingkup:** Client (React Three Fiber), Server (Colyseus), Shared Schema

---

## 1. Executive Summary

CsGame adalah proyek FPS web-based yang ambisius dengan arsitektur monorepo yang terstruktur dengan baik. Secara keseluruhan, kode menunjukkan pemahaman yang solid tentang game networking, state synchronization, dan physics-based movement. Namun, terdapat **beberapa area kritis** yang memerlukan perhatian segera, terutama di sektor **keamanan server-side**, **memory management**, dan **code maintainability**.

| Kategori | Severity | Jumlah Temuan |
|----------|----------|---------------|
| 🔴 Security / Anti-Cheat | Kritis | 7 |
| 🟡 Performance | Sedang | 6 |
| 🟠 Code Quality | Sedang-Tinggi | 8 |
| 🔵 Architecture / Design | Rendah-Sedang | 5 |
| 🟢 DX (Developer Experience) | Rendah | 4 |

---

## 2. Temuan Kritis — Security & Anti-Cheat

### 2.1. Movement Validation Lemah (`GameRoom.ts`)

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `processMovement()`

```typescript
const rawDt = (now - lastTime) / 1000;
const dt = Math.min(rawDt, (TICK_MS * 2) / 1000);
```

**Masalah:**
- `dt` di-clamp ke max 2x tick rate, tapi **tidak ada validasi velocity cap per-axis**.
- Client bisa mengirim input dengan `sprint=true` + diagonal movement yang dihitung dua kali (forward + left), menghasilkan kecepatan ~1.41x dari yang diizinkan.
- **Tidak ada server-side position reconciliation** — client bisa "teleport" secara bertahap dengan memanipulasi sequence number.

**Rekomendasi:**
```typescript
// Validasi kecepatan maksimum per tick
const maxMovePerTick = (input.sprint ? PHYSICS.sprintSpeed : PHYSICS.walkSpeed) * dt;
const actualMove = Math.sqrt(moveX * moveX + moveZ * moveZ);
if (actualMove > maxMovePerTick * 1.1) { // toleransi 10%
  // Reject input atau flag player
  return;
}

// Validasi sequence number dengan window
if (input.seq > player.lastProcessedSeq + MAX_SEQ_WINDOW) {
  // Potensi speed-hack atau replay attack
  this.flagPlayer(sessionId, 'SEQ_OVERFLOW');
  return;
}
```

---

### 2.2. Shoot Origin Validation Tidak Cukup Ketat

**File:** `server/src/rooms/WeaponManager.ts`  
**Baris:** `validateShootOrigin()`

```typescript
const ox = data.origin.x - shooter.x;
const oy = data.origin.y - (shooter.y + 1.6);
const oz = data.origin.z - shooter.z;
return ox * ox + oy * oy + oz * oz <= MAX_ORIGIN_DISTANCE_SQ;
```

**Masalah:**
- Hanya memeriksa jarak origin dari posisi player. **Tidak memeriksa apakah origin berada di dalam map boundary**.
- Tidak memvalidasi apakah player bisa "melihat" target (wallhack masih mungkin jika client memodifikasi direction).
- `MAX_ORIGIN_DISTANCE_SQ` tidak didefinisikan di file yang terlihat — kemungkinan nilai terlalu besar.

**Rekomendasi:**
```typescript
validateShootOrigin(shooter: PlayerState, data: ShootInput): boolean {
  const dx = data.origin.x - shooter.x;
  const dy = data.origin.y - (shooter.y + 1.6);
  const dz = data.origin.z - shooter.z;
  const distSq = dx * dx + dy * dy + dz * dz;

  if (distSq > MAX_ORIGIN_DISTANCE_SQ) return false;

  // Extra: pastikan origin tidak di dalam obstacle
  for (const obs of MAP_OBSTACLES) {
    if (pointInBox(data.origin, obs)) return false;
  }

  // Extra: validasi direction vector normalized
  const dirLen = Math.sqrt(data.direction.x**2 + data.direction.y**2 + data.direction.z**2);
  if (Math.abs(dirLen - 1.0) > 0.01) return false; // must be normalized

  return true;
}
```

---

### 2.3. Grenade Throw Anti-Cheat Bisa Dibypass

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `onMessage("throw_grenade")`

```typescript
const speed = Math.sqrt(velocity.x ** 2 + velocity.y ** 2 + velocity.z ** 2);
if (speed <= 0 || speed > GRENADE.maxThrowSpeed) return;
```

**Masalah:**
- Hanya memeriksa kecepatan total. **Tidak memvalidasi trajectory** — player bisa melempar grenade dengan kecepatan normal tapi arah yang dimodifikasi untuk mencapai target di balik dinding.
- Tidak ada check apakah grenade origin berada di depan player (bisa melempar "backward" dengan kecepatan tinggi).

**Rekomendasi:**
```typescript
// Validasi arah lemparan — velocity harus searah dengan rotasi player (±90°)
const playerForward = { x: -Math.sin(player.rotationY), z: -Math.cos(player.rotationY) };
const velHoriz = { x: velocity.x, z: velocity.z };
const velLen = Math.sqrt(velHoriz.x**2 + velHoriz.z**2);
const forwardLen = Math.sqrt(playerForward.x**2 + playerForward.z**2);
const dot = (velHoriz.x * playerForward.x + velHoriz.z * playerForward.z) / (velLen * forwardLen);

if (dot < -0.3) { // tidak boleh melempar ke belakang
  return;
}
```

---

### 2.4. Buy System — Zone Check Bisa Dibypass

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `onMessage("buy")`

```typescript
const buyZone = BUY_ZONE[player.team as keyof typeof BUY_ZONE];
if (buyZone) {
  const dx = player.x - buyZone.x;
  const dz = player.z - buyZone.z;
  if (Math.sqrt(dx * dx + dz * dz) > buyZone.radius) return;
}
```

**Masalah:**
- Buy request bisa dikirim berulang kali dalam satu frame sebelum player bergerak keluar zone.
- **Tidak ada timestamp/sequence validation** — client bisa queue multiple buy requests.
- Tidak memeriksa apakah item yang dibeli valid untuk fase buy.

**Rekomendasi:**
```typescript
// Tambahkan rate limiting per buy request
private lastBuyTime: Map<string, number> = new Map();

// Di onMessage("buy"):
const now = performance.now();
const lastBuy = this.lastBuyTime.get(client.sessionId) || 0;
if (now - lastBuy < 500) return; // minimal 500ms antar buy
this.lastBuyTime.set(client.sessionId, now);
```

---

### 2.5. Chat Message — XSS Injection Risk

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `onMessage("chat")`

```typescript
const message = data.message
  .replace(/[\u0000-\u001f\u007f]/g, "")
  .trim()
  .slice(0, MAX_CHAT_LENGTH);
```

**Masalah:**
- Regex hanya menghapus control characters ASCII. **Tidak menghapus HTML tags, Unicode homoglyphs, atau zero-width characters**.
- Client menampilkan chat message langsung di DOM — potensi XSS jika tidak di-escape.

**Rekomendasi:**
```typescript
// Server-side sanitization lebih ketat
const message = data.message
  .replace(/[\u0000-\u001f\u007f\u200b-\u200f\ufeff]/g, "") // zero-width chars
  .replace(/[<>"']/g, "") // HTML tags
  .trim()
  .slice(0, MAX_CHAT_LENGTH);

// Client-side (HUD.tsx) — selalu escape sebelum render
const escapedMessage = message.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
```

---

### 2.6. Vote Kick — Exploit Potensial

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `onMessage("vote_kick")`

```typescript
if (yesCount / this.state.players.size >= 0.5) {
```

**Masalah:**
- Pemain yang baru join bisa langsung vote tanpa cooldown.
- **Tidak ada minimum player count** untuk mengaktifkan vote kick (2 player = 1 vote cukup).
- Vote tidak mempertimbangkan apakah target sedang aktif bermain.

**Rekomendasi:**
```typescript
// Minimum 4 pemain untuk vote kick
if (this.state.players.size < 4) return;

// Hanya pemain yang sudah bermain >60s bisa vote
const playerJoinTime = this.playerJoinTimes.get(client.sessionId) || 0;
if (now - playerJoinTime < 60000) return;

// Threshold: 66% bukan 50%
if (yesCount / (this.state.players.size - 1) >= 0.66) {
```

---

### 2.7. Reconnect Token Tidak Di-validate

**File:** `client/src/stores/useNetworkStore.ts`  
**Baris:** `connect()`

```typescript
const { reconnectionToken } = JSON.parse(saved);
if (reconnectionToken) {
  room = await client.reconnect(reconnectionToken);
}
```

**Masalah:**
- `reconnectionToken` disimpan di `sessionStorage` tanpa encryption.
- **Tidak ada expiry check** di client — token bisa digunakan berulang kali bahkan setelah session seharusnya expired.

**Rekomendasi:**
```typescript
// Tambahkan timestamp ke session storage
sessionStorage.setItem(SESSION_KEY, JSON.stringify({
  reconnectionToken: room.reconnectionToken,
  createdAt: Date.now(),
}));

// Saat reconnect, cek expiry
const saved = sessionStorage.getItem(SESSION_KEY);
if (saved) {
  const { reconnectionToken, createdAt } = JSON.parse(saved);
  if (Date.now() - createdAt > 5 * 60 * 1000) { // 5 menit max
    sessionStorage.removeItem(SESSION_KEY);
  } else {
    room = await client.reconnect(reconnectionToken);
  }
}
```

---

## 3. Temuan Performa

### 3.1. Zustand Store Terlalu Besar — Re-render Berlebihan

**File:** `client/src/stores/useNetworkStore.ts`

**Masalah:**
- Single store `useNetworkStore` menampung ~40+ state fields. Setiap perubahan kecil (misal: ping update) memicu re-render seluruh komponen yang subscribe ke store.
- `remotePlayers` adalah `Map` — setiap update membuat Map baru: `remotePlayers = new Map()`.

**Rekomendasi:**
```typescript
// Pisahkan store menjadi beberapa slice
export const useNetworkStore = create<NetworkState>()(/* ... */);
export const usePlayerStore = create<PlayerState>()(/* ... */);
export const useRoundStore = create<RoundState>()(/* ... */);

// Atau gunakan selector untuk meminimalkan re-render
const ping = useNetworkStore(s => s.ping); // hanya re-render saat ping berubah
```

---

### 3.2. `setInterval` di Server — Tidak Precise

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `startTickLoop()`

```typescript
this.tickInterval = setInterval(() => {
  // ... game logic
}, TICK_MS);
```

**Masalah:**
- `setInterval` di Node.js **tidak precise** — bisa drift 5-15ms per tick.
- Pada 30 tick/detik, drift kumulatif bisa signifikan.

**Rekomendasi:**
```typescript
private startTickLoop() {
  const tick = () => {
    const start = performance.now();
    this.processTick();
    const elapsed = performance.now() - start;
    const nextTick = Math.max(0, TICK_MS - elapsed);
    this.tickInterval = setTimeout(tick, nextTick);
  };
  tick();
}
```

---

### 3.3. Grenade Simulation — O(n²) Collision Check

**File:** `server/src/rooms/GameRoom.ts`  
**Baris:** `simulateGrenades()`

**Masalah:**
- Setiap grenade dicek collision dengan **semua obstacle** (loop bersarang).
- Jika ada 20 grenade × 50 obstacle = 1000 checks per tick.

**Rekomendasi:**
```typescript
// Gunakan spatial hashing atau AABB broad-phase
// Contoh sederhana: hanya cek obstacle dalam radius grenade
const nearbyObstacles = this.spatialGrid.query(
  grenade.x, grenade.z, 5 // radius 5 unit
);
for (const obs of nearbyObstacles) {
  // ... collision check
}
```

---

### 3.4. Position History — Memory Leak Potensial

**File:** `server/src/rooms/WeaponManager.ts`  
**Baris:** `recordPosition()`

```typescript
history.push({ t: now, x: player.x, z: player.z });
while (history.length > 60) {
  history.shift();
}
```

**Masalah:**
- History tidak dihapus saat player disconnect — memory leak jika player reconnect berulang kali.
- `history` array tumbuh tanpa batas jika `while` condition tidak tercapai (edge case).

**Rekomendasi:**
```typescript
recordPosition(sessionId: string, player: PlayerState, now: number): void {
  let history = this.shootHistory.get(sessionId);
  if (!history) {
    history = [];
    this.shootHistory.set(sessionId, history);
  }
  history.push({ t: now, x: player.x, z: player.z });

  // Batasi dengan waktu, bukan hanya count
  const cutoff = now - HISTORY_WINDOW_MS;
  const idx = history.findIndex(h => h.t >= cutoff);
  if (idx > 0) {
    history.splice(0, idx);
  }
  // Hard limit
  if (history.length > 100) {
    history.splice(0, history.length - 100);
  }
}
```

---

### 3.5. Client-side `setTimeout` di WeaponStore

**File:** `client/src/stores/useWeaponStore.ts`  
**Baris:** `equipWeapon()`, `switchToSlot()`

```typescript
setTimeout(() => {
  set({ isSwitching: false, switchTimer: 0 });
}, DEPLOY_TIMES[weapon] * 1000);
```

**Masalah:**
- `setTimeout` di client tidak reliable — bisa delayed jika tab tidak aktif.
- Jika player switch weapon berulang kali, multiple timeout berjalan bersamaan.

**Rekomendasi:**
```typescript
// Gunakan ref untuk tracking timeout
const switchTimeoutRef = { current: null as ReturnType<typeof setTimeout> | null };

// Di action:
if (switchTimeoutRef.current) {
  clearTimeout(switchTimeoutRef.current);
}
switchTimeoutRef.current = setTimeout(() => {
  set({ isSwitching: false, switchTimer: 0 });
  switchTimeoutRef.current = null;
}, DEPLOY_TIMES[weapon] * 1000);
```

---

### 3.6. Broadcast Semua Event — Bandwidth Inefisien

**File:** `server/src/rooms/GameRoom.ts`

**Masalah:**
- `this.broadcast("damage", ...)` dikirim ke **semua client** termasuk yang tidak terlibat.
- Kill feed, damage event, dan reload broadcast ke semua player.

**Rekomendasi:**
```typescript
// Hanya broadcast ke player yang relevan
// Damage: shooter + victim saja
client.send("damage", { ... }); // shooter
this.clients.find(c => c.sessionId === victimId)?.send("damage", { ... }); // victim

// Kill feed: broadcast (ini memang perlu)
this.broadcast("kill", killEvent);
```

---

## 4. Temuan Code Quality

### 4.1. Duplikasi Ray-vs-Box Function

**File:** `server/src/rooms/GameRoom.ts` dan `server/src/rooms/WeaponManager.ts`

**Masalah:**
- Function `rayVsBox()` dan `bounceAxis()` didefinisikan identik di dua file.

**Rekomendasi:**
```typescript
// Buat file utils/geometry.ts
export function rayVsBox(...) { /* ... */ }
export function bounceAxis(...) { /* ... */ }

// Import di kedua file
import { rayVsBox, bounceAxis } from "../utils/geometry";
```

---

### 4.2. `any` Type di Colyseus Import

**File:** `server/src/index.ts`

```typescript
const { Server, LobbyRoom } = colyseus as any;
```

**Masalah:**
- Cast ke `any` menghilangkan type safety. Colyseus v0.15 sudah memiliki TypeScript definitions.

**Rekomendasi:**
```typescript
import { Server, LobbyRoom } from "colyseus";
// atau
import colyseus from "colyseus";
const { Server, LobbyRoom } = colyseus;
```

---

### 4.3. Magic Numbers

**File:** Banyak file

**Contoh:**
```typescript
player.y = PHYSICS.jumpVelocity * 0.1; // kenapa 0.1?
if (obs.maxY < 0.45) continue; // 0.45 adalah apa?
if (Math.sqrt(dx * dx + dz * dz) > 2) return; // 2 unit?
```

**Rekomendasi:**
```typescript
const PLAYER_CAPSULE_HEIGHT = 1.8;
const PLAYER_CAPSULE_RADIUS = 0.3;
const ANKLE_HEIGHT = 0.45;
const BOMB_PICKUP_RADIUS = 2.0;
```

---

### 4.4. Error Handling Minimal

**File:** `client/src/stores/useNetworkStore.ts`

```typescript
try {
  room = await client.joinOrCreate("fps_room", { nickname });
} catch (e) {
  console.error("Failed to join room:", e);
  set({ reconnecting: false });
}
```

**Masalah:**
- Error hanya di-log. **User tidak mendapat feedback** (UI tetap loading).
- Tidak ada retry dengan exponential backoff.

**Rekomendasi:**
```typescript
try {
  room = await client.joinOrCreate("fps_room", { nickname });
} catch (e) {
  console.error("Failed to join room:", e);
  set({ 
    reconnecting: false, 
    connectionError: e instanceof Error ? e.message : "Unknown error" 
  });
  // Tampilkan error di UI
}
```

---

### 4.5. `useNetworkStore.getState()` di Dalam Store

**File:** `client/src/stores/useNetworkStore.ts`

```typescript
const { sessionId, showHitMarker } = useNetworkStore.getState();
```

**Masalah:**
- Memanggil store dari dalam store action — bisa menyebabkan circular dependency.
- Lebih baik gunakan parameter atau pisahkan logic.

**Rekomendasi:**
```typescript
// Jadikan action menerima parameter
addKillEvent: (event: KillEvent, sessionId: string | null) => {
  const isDeath = sessionId && event.victimId === sessionId;
  // ...
}
```

---

### 4.6. `window.dispatchEvent` untuk Komunikasi Antar-Store

**File:** `client/src/stores/useNetworkStore.ts`

```typescript
window.dispatchEvent(new CustomEvent("nadeThrown", { detail: data }));
```

**Masalah:**
- Menggunakan DOM events untuk komunikasi antar module/store — anti-pattern.
- Sulit di-trace dan bisa menyebabkan memory leak jika listener tidak di-cleanup.

**Rekomendasi:**
```typescript
// Gunakan event emitter atau Zustand subscribe
import { subscribe } from "zustand";

// Atau buat dedicated event bus
const gameEvents = new EventTarget(); // lebih terkontrol
```

---

### 4.7. `Math.random()` untuk ID — Collision Risk

**File:** `client/src/stores/useNetworkStore.ts`

```typescript
id: `${data.senderId}-${data.timestamp}-${Math.random()}`,
```

**Masalah:**
- `Math.random()` bisa collision (meskipun kecil kemungkinannya).

**Rekomendasi:**
```typescript
id: `${data.senderId}-${data.timestamp}-${crypto.randomUUID()}`,
// atau
id: `${data.senderId}-${data.timestamp}-${++messageCounter}`,
```

---

### 4.8. `Date.now()` vs `performance.now()` — Inkonsisten

**File:** Banyak file

**Masalah:**
- Beberapa bagian pakai `Date.now()`, beberapa pakai `performance.now()`.
- `Date.now()` bisa berubah jika system clock berubah (NTP sync, user mengubah waktu).

**Rekomendasi:**
```typescript
// Gunakan performance.now() untuk semua game logic
// Gunakan Date.now() hanya untuk display timestamp (chat, kill feed)
```

---

## 5. Temuan Arsitektur & Design

### 5.1. Single Room Type untuk Semua Mode

**File:** `server/src/rooms/GameRoom.ts`

**Masalah:**
- `GameRoom` menangani bomb_defusal, FFA, TDM, dan KOTH dalam satu class.
- Class sudah >1000 baris dan akan semakin besar saat mode bertambah.

**Rekomendasi:**
```typescript
// Gunakan strategy pattern atau class inheritance
abstract class BaseGameRoom extends Room {
  // shared logic: movement, shooting, grenades
}

class BombDefusalRoom extends BaseGameRoom {
  // bomb-specific logic
}

class FFARoom extends BaseGameRoom {
  // FFA-specific logic
}

gameServer.define("fps_bomb", BombDefusalRoom);
gameServer.define("fps_ffa", FFARoom);
```

---

### 5.2. State Schema Terlalu Monolithic

**File:** `shared/src/schema/GameState.ts` (diasumsikan)

**Masalah:**
- `PlayerState` kemungkinan besar memiliki terlalu banyak field yang di-sync ke semua client.
- Field seperti `isPlanting`, `plantProgress`, `isDefusing`, `defuseProgress` tidak perlu di-sync ke semua player (hanya ke spectator dan nearby players).

**Rekomendasi:**
```typescript
// Gunakan @filter() dari Colyseus untuk membatasi sync
@filter(function(this: PlayerState, client: Client) {
  return this.sessionId === client.sessionId || this.isSpectatedBy === client.sessionId;
})
plantProgress: number = 0;
```

---

### 5.3. Tidak Ada Input Buffering di Server

**Masalah:**
- Client input diproses langsung saat diterima. **Tidak ada input buffering** untuk menangani jitter.

**Rekomendasi:**
```typescript
// Buffer input selama 2-3 tick
private inputBuffer: Map<string, ClientInput[]> = new Map();

// Di tick loop:
this.inputBuffer.forEach((inputs, sessionId) => {
  const input = inputs.shift(); // proses oldest input
  if (input) this.processMovement(sessionId, player, input);
});
```

---

### 5.4. Tidak Ada Logging System

**Masalah:**
- Semua log pakai `console.log`/`console.error`.
- Tidak ada structured logging, log levels, atau log rotation.

**Rekomendasi:**
```typescript
import winston from "winston";

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || "info",
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: "logs/error.log", level: "error" }),
    new winston.transports.File({ filename: "logs/combined.log" }),
  ],
});
```

---

### 5.5. Tidak Ada Health Check Endpoint

**File:** `server/src/index.ts`

**Masalah:**
- Server tidak memiliki health check endpoint untuk monitoring (Docker, Kubernetes, load balancer).

**Rekomendasi:**
```typescript
httpServer.on("request", (req, res) => {
  if (req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      status: "ok",
      uptime: process.uptime(),
      players: gameServer.stats.local.ccu,
      rooms: gameServer.stats.local.roomCount,
    }));
    return;
  }
  // ... existing monitor
});
```

---

## 6. Temuan DX (Developer Experience)

### 6.1. Tidak Ada ESLint / Prettier Config

**File:** `package.json`

**Masalah:**
- Script `lint` ada tapi tidak ada ESLint config yang terlihat.
- Inkonsistensi formatting (semicolon, quotes, indentation) di seluruh codebase.

**Rekomendasi:**
```json
// .eslintrc.json
{
  "extends": ["@typescript-eslint/recommended"],
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "rules": {
    "@typescript-eslint/no-explicit-any": "error",
    "@typescript-eslint/no-unused-vars": "error"
  }
}
```

---

### 6.2. Tidak Ada Environment Variable Validation

**File:** `server/src/index.ts`

```typescript
const port = Number(process.env.PORT) || 2567;
```

**Masalah:**
- Tidak ada validasi tipe atau required env vars.

**Rekomendasi:**
```typescript
import { z } from "zod";

const envSchema = z.object({
  PORT: z.string().transform(Number).default("2567"),
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
});

export const env = envSchema.parse(process.env);
```

---

### 6.3. Test Coverage Minimal

**File:** `package.json`

```json
"test": "vitest run",
```

**Masalah:**
- Vitest terinstall tapi tidak ada test files yang terlihat.
- Logic kritis (damage calculation, economy, movement) tidak memiliki unit test.

**Rekomendasi:**
```typescript
// server/src/__tests__/WeaponManager.test.ts
import { describe, it, expect } from "vitest";
import { WeaponManager } from "../rooms/WeaponManager";

describe("WeaponManager", () => {
  it("should calculate headshot damage correctly", () => {
    const wm = new WeaponManager();
    const dmg = wm.calculateDamage("ak47", "head", 0, false);
    expect(dmg).toBe(143); // sesuai WEAPONS.ak47.headshot
  });
});
```

---

### 6.4. Dokumentasi API Tidak Ada

**Masalah:**
- Tidak ada OpenAPI spec atau API documentation untuk client-server protocol.
- Developer baru harus membaca kode untuk memahami message protocol.

**Rekomendasi:**
Buat file `docs/API_PROTOCOL.md`:
```markdown
## Message Types

### Client → Server
| Message | Payload | Description |
|---------|---------|-------------|
| `input` | `{ seq, forward, backward, left, right, jump, sprint, crouch, rotationY }` | Player movement input |
| `shoot` | `{ origin, direction, latency }` | Fire weapon |
| `buy` | `{ item }` | Purchase item |

### Server → Client
| Message | Payload | Description |
|---------|---------|-------------|
| `snapshot` | `{ x, y, z, rotationY, lastProcessedSeq }` | Authoritative position |
| `kill` | `{ killerId, victimId, weapon, headshot }` | Kill event |
```

---

## 7. Rekomendasi Prioritas

### 🔴 Priority 1 — Security (Sebelum Production)

| # | Task | File |
|---|------|------|
| 1 | Implementasi velocity cap validation di `processMovement` | `GameRoom.ts` |
| 2 | Tambahkan trajectory validation untuk grenade | `GameRoom.ts` |
| 3 | Sanitasi chat message (XSS prevention) | `GameRoom.ts`, `HUD.tsx` |
| 4 | Perbaiki vote kick threshold & cooldown | `GameRoom.ts` |
| 5 | Encrypt reconnect token di sessionStorage | `useNetworkStore.ts` |

### 🟡 Priority 2 — Performance (Sebelum Beta)

| # | Task | File |
|---|------|------|
| 1 | Refactor Zustand store ke multiple slices | `stores/*.ts` |
| 2 | Ganti `setInterval` ke `setTimeout` recursive | `GameRoom.ts` |
| 3 | Implementasi spatial hashing untuk collision | `GameRoom.ts` |
| 4 | Batasi broadcast hanya ke client relevan | `GameRoom.ts` |
| 5 | Cleanup position history saat disconnect | `WeaponManager.ts` |

### 🟢 Priority 3 — Maintainability (Ongoing)

| # | Task | File |
|---|------|------|
| 1 | Extract utility functions (rayVsBox, bounceAxis) | `utils/geometry.ts` |
| 2 | Hapus `any` type dari Colyseus import | `index.ts` |
| 3 | Tambahkan ESLint + Prettier config | root |
| 4 | Implementasi structured logging | `index.ts` |
| 5 | Tambahkan health check endpoint | `index.ts` |
| 6 | Buat unit test untuk WeaponManager & EconomySystem | `__tests__/*.ts` |
| 7 | Dokumentasikan API protocol | `docs/API_PROTOCOL.md` |

---

## 8. Kesimpulan

CsGame adalah proyek dengan fondasi yang kuat — arsitektur monorepo, state sync dengan Colyseus, dan game mechanics yang terdefinisi dengan baik. Namun, **sebelum bisa di-deploy ke production**, beberapa masalah keamanan kritis harus ditangani:

1. **Anti-cheat server-side masih bisa di-bypass** di beberapa area (movement, grenade, buy system).
2. **Performance** akan menjadi bottleneck saat player count meningkat — terutama di collision detection dan state sync.
3. **Code quality** memerlukan standardisasi (linting, testing, logging) untuk memudahkan kontribusi dan maintenance jangka panjang.

Dengan perbaikan di atas, proyek ini memiliki potensi menjadi FPS web-based yang solid dan kompetitif.

---

*Dokumen ini dibuat untuk tujuan analisis kode dan perbaikan. Semua rekomendasi bersifat saran dan dapat disesuaikan dengan kebutuhan proyek.*
