# 🔍 Laporan Pengecekan Kode & Dokumen Perbaikan (Code Audit & Fixing Document)

**Proyek:** CS Web FPS Monorepo (`@cs-game/client`, `@cs-game/server`, `@cs-game/shared`)  
**Tanggal Pengecekan:** 13 Agustus 2026  
**Status Build Saat Ini:** ❌ Failed (`@cs-game/client` build error) -> **Siap diperbaiki**

---

## 1. 📌 Ringkasan Eksekutif Hasil Pengecekan Kodecar

Berdasarkan audit komprehensif terhadap seluruh file di `client/src`, `server/src`, dan `shared/`, ditemukan beberapa **kategori permasalahan** dari tingkat **Kritis (Build Blocker)** hingga **Flaw Logic / Memory Leak** dan **Gap Dokumen Implementation Checklist**.

---

## 2. 🚨 Daftar Temuan & Bug Utama

### 🔴 Kategori 1: Build Blocker / TypeScript Error (Kritis)
1. **Property `sendChat` Hilang di `useNetworkStore.ts`**
   - **Lokasi File:** [`client/src/stores/useNetworkStore.ts:166`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/stores/useNetworkStore.ts#L166)
   - **Deskripsi:** Interface `NetworkState` mendeklarasikan `sendChat: (message: string) => void`, namun objek pembuatan store Zustand di baris 166 tidak mendefinisikan implementasi `sendChat`.
   - **Dampak:** `npm run build` pada workspace client gagal kompilasi (`TS2741`).

---

### 🟠 Kategori 2: Masalah Jaringan & Event Listener (Network & Memory Leak)
2. **Event Listener `pong` Bocor di `measurePing()`**
   - **Lokasi File:** [`client/src/stores/useNetworkStore.ts:382`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/stores/useNetworkStore.ts#L382)
   - **Deskripsi:** `measurePing()` memanggil `room.onMessage("pong", ...)` setiap kali fungsi tersebut dijalankan (setiap 2 detik dari `App.tsx`). Hal ini mendaftarkan listener baru tanpa membersihkan listener lama.
   - **Perbaikan:** Daftarkan listener `pong` sekali saja di dalam `setupRoom()` dan `measurePing()` hanya bertugas mengirim `room.send("ping", ...)`.

3. **Komponen `RadioCommand.tsx` Tidak Memiliki Handler Server & Belum Ter-mount**
   - **Lokasi File:** 
     - [`client/src/components/RadioCommand.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/components/RadioCommand.tsx)
     - [`server/src/rooms/GameRoom.ts`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/server/src/rooms/GameRoom.ts)
   - **Deskripsi:** `RadioCommand.tsx` mengirim pesan `radio` saat tombol Z + 1/2/3 ditekan, namun `GameRoom.ts` tidak memiliki handler `this.onMessage("radio", ...)`. Selain itu `RadioCommand` tidak di-mount di `App.tsx` atau `HUD.tsx`.
   - **Perbaikan:** Tambahkan handler `radio` di `GameRoom.ts` untuk mem-broadcast radio message ke pemain setim, dan pastikan `RadioCommand` di-mount dengan benar.

4. **Sistem Chat Putus dari Server Broadcast**
   - **Lokasi File:** [`client/src/components/ChatSystem.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/components/ChatSystem.tsx#L57)
   - **Deskripsi:** Di `ChatSystem.tsx`, baris pengiriman pesan ke server ter-comment (`// room.send("chat", ...)`). `useNetworkStore` juga belum mendengarkan event `room.onMessage("chat")` dari server.
   - **Perbaikan:** Hubungkan `ChatSystem` dengan `sendChat()` store dan tambahkan listener `room.onMessage("chat")` di `useNetworkStore.ts` untuk menyimpan log obrolan global/tim.

---

### 🟡 Kategori 3: Gameplay, Combat, Recoil & Spectator Logic
5. **Aplikasi Recoil Ganda (Double Recoil Bug)**
   - **Lokasi File:** [`client/src/game/weapons/ShootingSystem.tsx:270, 338`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/game/weapons/ShootingSystem.tsx#L270)
   - **Deskripsi:** Fungsi `shoot()` memanggil `updateRecoil(offsetX, offsetY)`. Di saat bersamaan, loop `useFrame()` memanggil `updateRecoil(offsetX * sensitivity, offsetY * sensitivity)` dari `controller.update(1/60)`. Hal ini menyebabkan model senjata melompat atau tersentak 2x lebih besar dari seharusnya.
   - **Perbaikan:** Konsolidasikan pembaruan recoil agar hanya diatur secara kontinu dalam `useFrame()` atau di-fire secara konsisten.

6. **Crash Kamera Spectator Saat Target Remote Player Kosong/Dead**
   - **Lokasi File:** [`client/src/game/player/PlayerController.tsx:183`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/game/player/PlayerController.tsx#L183)
   - **Deskripsi:** Saat pemain mati (`localIsDead: true`), controller membaca `remotePlayers.values()[spectatorIndexRef.current]`. Jika target bernilai `undefined` (misalnya pemain tersebut keluar/belum ada pemain lain), kode langsung membaca `target.x` & `target.y`, menyebabkan error runtime.
   - **Perbaikan:** Tambahkan pengecekan `if (!target) return;` atau fallback posisi ke kamera mati (free cam/ghost view).

---

### 🔵 Kategori 4: Gap Dokumen Master Checklist vs Kode
7. **Fitur Menengah-Lanjut yang Belum Terimplementasi Penuh:**
   - **Server Lag Compensation / Rewind Buffer (#51):** `GameRoom.ts` langsung melakukan raycast posisi terkini tanpa buffer histori posisi 500ms.
   - **Anti-Cheat Validation (#52):** Validasi kecepatan bergerak & rate-of-fire di server belum memiliki logging/rejection penuh.
   - **Perintah Forfeit `/ff` (#58):** Vote kick sudah ada, namun perintah menyerah `/ff` belum di-handle.

---

## 3. 🛠️ Rencana Perbaikan (Folder & File Fixes)

Berikut daftar file yang akan dimodifikasi dalam tahap eksekusi perbaikan:

| No | File yang Diperbaiki | Deskripsi Perubahan |
| :--- | :--- | :--- |
| 1 | [`client/src/stores/useNetworkStore.ts`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/stores/useNetworkStore.ts) | • Tambahkan `sendChat(message: string)` ke Zustand store.<br>• Pindahkan listener `room.onMessage("pong")` keluar dari `measurePing()` ke `setupRoom()`.<br>• Tambahkan listener `room.onMessage("chat")` dan state `chatMessages`. |
| 2 | [`server/src/rooms/GameRoom.ts`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/server/src/rooms/GameRoom.ts) | • Tambahkan handler `this.onMessage("radio", ...)` untuk menyebarkan sinyal radio ke teman tim.<br>• Tambahkan validasi rate-limit pesan obrolan & radio. |
| 3 | [`client/src/components/ChatSystem.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/components/ChatSystem.tsx) | • Hubungkan input obrolan ke `useNetworkStore.getState().sendChat()`.<br>• Sinkronkan state pesan obrolan dengan store jaringan. |
| 4 | [`client/src/components/RadioCommand.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/components/RadioCommand.tsx) | • Pastikan pengiriman sinyal radio menggunakan payload yang dipahami server. |
| 5 | [`client/src/App.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/App.tsx) | • Mount `RadioCommand` di dalam render tree `MultiplayerMode`. |
| 6 | [`client/src/game/weapons/ShootingSystem.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/game/weapons/ShootingSystem.tsx) | • Perbaiki perhitungan recoil offset agar tidak terjadi *double application* pada model senjata. |
| 7 | [`client/src/game/player/PlayerController.tsx`](file:///Users/jeremyvalentinsiahaan/Documents/Game/cs-game/client/src/game/player/PlayerController.tsx) | • Tambahkan validasi safe null-check untuk spectator mode target player. |

---

## 4. 🧪 Rencana Verifikasi (Verification Plan)

1. **Uji Kompilasi TypeScript & Build Monorepo:**
   - Jalankan `npm run build` di root workspace untuk memastikan tidak ada tipe error TS.
2. **Uji Fitur Network & Chat:**
   - Jalankan server & client, uji pengiriman chat dan perintah radio (Z + 1/2/3).
3. **Uji Pergerakan & Tembakan:**
   - Uji penembakan senjata, hentakan recoil, serta mode penonton (spectator mode saat mati).
