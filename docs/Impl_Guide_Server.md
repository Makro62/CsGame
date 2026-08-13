# 📖 Panduan Implementasi: Multiplayer Server (Colyseus) (v2.0)

Panduan langkah-demi-langkah implementasi server Colyseus otoritatif: bomb defusal logic, ekonomi, anti-cheat, **spectator broadcast**, **reconnect**, **vote kick/forfeit**, **network monitor**, **ready/skip**, dan **overtime**.

> **Referensi:** [Design_Networking_Advanced.md](Design_Networking_Advanced.md) • [Design_Gameplay.md](Design_Gameplay.md)

---

## Urutan Implementasi (Prioritas)

```
1. Colyseus Room & State Schema (v2: + spectator, ready, network fields)
2. Join Room & Auto-Matchmaking
3. Pembagian Tim (T/CT) Zig-Zag
4. Sinkronisasi Posisi (Prediction + Reconciliation)
5. Tembakan & Lag Compensation
6. Bomb Defusal Logic
7. Ekonomi & Buy Menu
8. Kill Feed Broadcast
9. Radio Commands
10. Anti-Cheat & Interest Management
11. Spectator Broadcast (BARU)
12. Reconnect Session Resume (BARU)
13. Vote Kick & Forfeit (BARU)
14. Ready/Skip Buy Phase (BARU)
15. Overtime (BARU)
16. Network Monitor Metrics (BARU)
```

---

## 1. Colyseus Room & State Schema

**File:** `shared/src/schema/`

```
GameState
  ├── phase: string        ('warmup' | 'buy' | 'active' | 'roundEnd')
  ├── roundTimeLeft: number
  ├── teamRedScore / teamBlueScore: number
  ├── bombPlanted, bombTimeLeft, bombSite
  ├── roundNumber: number          (BARU: half-time + OT trigger)
  ├── isOvertime: boolean          (BARU)
  ├── readyCount: number           (BARU)
  ├── players: MapSchema<PlayerState>
  └── spectating: MapSchema<SpectatorState>   (BARU)

PlayerState
  ├── x, y, z, rotation, hp, isDead, team, money
  ├── activeWeapon, kills, deaths, lastProcessedSeq, hasBomb
  ├── isReloading, isSwitching     (BARU)
  ├── lastKnownPos: {x,y,z}        (BARU: reconnect snapshot)
  └── spectateTargetId: string     (BARU)
```

---

## 2-4. Join / Tim / Sync

- `joinOrCreate("fps_room", { nickname })`; tim zig-zag (1→CT, 2→T, 3→CT...).
- Spawn: T [-25,0,0] / CT [25,0,0]; `money = 800` (pistol round).
- Input dengan `seq` + `timestamp`; validasi delta; update `lastProcessedSeq`.
- Reconciliation: client lerp/snap sesuai aturan.

## 5. Tembakan & Lag Compensation

- History buffer 500ms (15 snapshot × 33ms).
- Validasi: ammo > 0, !isReloading, !isSwitching, !isDead, fire-rate.
- Rewind → raycast hitbox historis → damage → broadcast.

## 6. Bomb Defusal Logic

- Plant: pemain T + `hasBomb` + di plant zone + tahan E 3s (immobile).
- Bomb: `bombPlanted = true`, countdown 40s.
- Defuse: CT di dekat bom (rasio 10s / 5s kit), progress; selesai → CT menang.
- Meledak: T menang + radius 6m fatal / 10m 50 dmg ke CT terdekat.
- Simultan: bomb 0 tepat saat defuse selesai → CT menang (resolve di tick yang sama).

## 7. Ekonomi & Buy Menu

- `onMessage("buy", ...)`: validasi `phase === 'buy'`, `player.money >= harga`, di zona buy.
- Bonus per event (rifle $300, AWP $100, SMG $600, win $3,250, loss streak $1,400/$1,900, plant/defuse $300).
- **Cap $16,000**.

## 8-10. Kill Feed / Radio / Anti-Cheat

- Kill feed: broadcast event server-only.
- Radio: filter `team === sender.team`.
- Anti-cheat: speedhack 15%, fire-rate 0.85, ammo/dead/reload check, interest management 60m + LOS, velocity clamp 12 m/s.

---

## 11. Spectator Broadcast (BARU)

- `GameState.spectating` berisi mode + target per pemain mati.
- Server hanya mengirim posisi target yang di-spectate + event penting (kill, plant, defuse) — **bukan full state**.
- Free cam: server kirim sekali data map bounds; client render lokal.
- Anti-wallhack: follow hanya pemain dari tim sendiri (atau semua setelah match end).

## 12. Reconnect Session Resume (BARU)

- `onLeave` → simpan `PlayerState` ke slot reconnect (60s TTL).
- `onJoin` kembali: jika `sessionId` sama & slot ada → restore state penuh (posisi terakhir valid, money, weapon, skor).
- Jika posisi tidak aman (LOS musuh hidup) → pindah ke spawn aman + 1.5s protection.
- `room.allowReconnection(client, 60)` untuk Colyseus.

## 13. Vote Kick & Forfeit (BARU)

```ts
onMessage("voteKick", (client, { targetId, vote }) => {
  // validasi: 1 vote/2 menit, bukan target, phase aktif
  // akumulasi; jika >= 50% pemain online (dikurangi target) → kick
})

onMessage("forfeit", (client, { vote }) => {
  // butuh 4/5 tim; hanya setelah round 3; match end, lawan menang
})
```

## 14. Ready/Skip Buy Phase (BARU)

- `onMessage("ready")` → `readyCount++`; jika ≥ 8/10 → `phase = 'active'`, `roundTimeLeft += 10`.
- Reset `readyCount = 0` tiap ronde.

## 15. Overtime (BARU)

- Setelah ronde 14: jika `7-7` → `isOvertime = true`, first-to-9 (maks 2 ronde).
- Jika `8-8` setelah ronde 16 → **Sudden Death**: 1 ronde, tanpa buy phase, full loadout + kit untuk semua.

## 16. Network Monitor Metrics (BARU)

- Sample per detik per client: ping (echo), loss (gap seq), jitter (deviasi ping).
- Simpan di `player.network: {ping, loss, jitter}` → HUD client render warna.

---

## QA Checklist Server (implementasi)

- [ ] 2 client sync + prediction (100ms simulasi).
- [ ] Lag comp 500ms: hit fair di ping 150ms.
- [ ] Bomb flow: plant → 40s → defuse/meledak; simultan resolve benar.
- [ ] Economy server-side; cap $16,000; buy hanya di buy phase.
- [ ] Anti-cheat reject speedhack & fire-rate.
- [ ] Spectator broadcast tidak bocor info musuh.
- [ ] Reconnect 60s mengembalikan state; > 60s jadi player baru.
- [ ] Vote kick 50%+, forfeit 4/5, ready skip 8/10.
- [ ] OT trigger 7-7; sudden death 8-8.
- [ ] Ping/loss/jitter metrics akurat untuk HUD.
