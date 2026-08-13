# 🛠️ Laporan Perbaikan Kode — Fixing 2 (Stabilization & Quality Pass)

**Proyek:** CS Web FPS Monorepo (`@cs-game/client`, `@cs-game/server`, `@cs-game/shared`)
**Folder Dokumentasi:** `docs/fixing_2/`
**Tanggal Eksekusi:** 13 Agustus 2026
**Status Build:** ✅ **PASSED (Verifikasi nyata melalui `npm run build`)**

---

## 1. 📌 Ringkasan Fixing 2

Dokumen ini mencatat analisis lanjutan setelah keberhasilan implementasi **Fixing 1**. Berdasarkan hasil build monorepo yang berhasil, fokus Fixing 2 bukan lagi pada blocker kompilasi, melainkan pada **stabilitas runtime, kebersihan event wiring, optimasi bundle, dan polish gameplay** untuk mengurangi bug yang tidak selalu muncul saat pengujian awal.

Dengan kata lain, Fixing 2 adalah tahap **quality pass** yang menutup celah yang tidak selalu memicu error build, tetapi berpotensi menurunkan kualitas pengalaman bermain secara signifikan.

---

## 2. ✅ Status Pasca Fixing 1

Verifikasi build monorepo yang dijalankan pada tanggal 13 Agustus 2026 menunjukkan bahwa proyek sudah dapat dibangun tanpa error TypeScript/production build:

```bash
cd /Users/jeremyvalentinsiahaan/Documents/Game/cs-game
npm run build
```

Hasil aktual:

```bash
> @cs-game/client@1.0.0 build
> tsc && vite build
✓ built in 10.02s

> @cs-game/server@1.0.0 build
> tsc

> @cs-game/shared@1.0.0 build
> tsc
```

Artinya, **Fixing 1 berhasil menangani masalah build blocker utama**. Sisa pekerjaan sekarang adalah mengurangi risiko runtime dan meningkatkan kualitas arsitektur.

---

## 3. 🔎 Analisis Temuan Prioritas Fixing 2

### 3.1. Dynamic import warning pada `useNetworkStore.ts`

**Lokasi utama:** `client/src/stores/useNetworkStore.ts`
**Kategori:** Warning build / Bundle optimization

**Analisis:**

- Build berhasil, tetapi Vite memperingatkan bahwa `useNetworkStore.ts` di-import secara statis dan dinamis sekaligus.
- Hal ini muncul karena `useWeaponStore.ts` mengimpor store jaringan secara dinamis, sementara banyak komponen lain juga mengimpor secara langsung.
- Dampak yang mungkin terjadi adalah **bundle size lebih besar** dan potensi efek lintas-state/cycle dependency yang sulit diprediksi di masa depan.

**Root cause:**

- Struktur store yang digunakan di beberapa file membuat hubungan dependency tidak sejalan antara store dan komponen UI.
- Penggunaan store global yang terikat ke banyak UI component menyebabkan import graph kurang bersih.

**Solusi yang disarankan:**

- Menyederhanakan import store agar `useNetworkStore` hanya dipanggil melalui satu pola akses yang konsisten.
- Menghindari import dinamis yang tidak diperlukan untuk state global yang bersifat cross-cutting.
- Jika memang perlu lazy-load, lakukan pembatasan pada modul non-critical saja.

---

### 3.2. Risiko listener berulang pada setup room / reconnect

**Lokasi utama:** `client/src/stores/useNetworkStore.ts`
**Kategori:** Runtime stability / event leak

**Analisis:**

- `setupRoom()` membangun berbagai `room.onMessage(...)` listener setiap kali room dibuat/di-reconnect.
- Jika reconnect terjadi berulang, atau `setupRoom()` dipanggil lebih dari sekali untuk room yang sama, listener lama berpotensi menumpuk.
- Ini bisa menyebabkan duplicate event handling, seperti chat, damage, kill, radio, atau vote request masuk berulang.

**Root cause:**

- Tidak ada mekanisme teardown listener yang jelas saat room berubah atau saat reconnect.
- Fungsi `onLeave()` hanya mengubah state, tetapi tidak membatalkan callback listener lama yang terikat ke room sebelumnya.

**Solusi yang disarankan:**

- Menambahkan fungsi `cleanupRoomListeners(room)` atau mengubah pola listener menjadi satu-time registration berdasarkan `room` instance.
- Menghindari `setupRoom()` dipanggil berulang tanpa membersihkan `room.onMessage` dari callback sebelumnya.
- Menggunakan `room.onLeave` atau `room.removeAllListeners` di alur reconnect yang benar jika Colyseus menyediakan mekanisme yang aman.

---

### 3.3. Spectator / player target edge case masih perlu hardening

**Lokasi utama:** `client/src/game/player/PlayerController.tsx`
**Kategori:** Gameplay stability / crash prevention

**Analisis:**

- Mode penonton sering mengakses `remotePlayers.values()[spectatorIndexRef.current]` tanpa validasi yang cukup.
- Jika daftar remote player kosong, target tidak ditemukan, atau pemain telah keluar saat spectator berpindah, runtime dapat tetap membaca `undefined` dan memanggil `target.x`/`target.y`.
- Kondisi ini jarang terjadi dalam test normal, tetapi sangat mungkin muncul selama reconnect, death transition, atau player disconnect.

**Root cause:**

- Asumsi bahwa target selalu ada pada indeks tersebut.
- Tidak ada fallback ketika `remotePlayers` berubah saat kamera spectator sedang diupdate.

**Solusi yang disarankan:**

- Tambahkan guard eksplisit: `if (!target) return;` atau fallback ke posisi default, free camera, atau last known position.
- Clamp index secara aman sebelum akses array map.
- Pastikan `spectatorIndexRef.current` selalu valid setelah perubahan daftar player.

---

### 3.4. Recoil / shooting feel masih perlu konsolidasi

**Lokasi utama:** `client/src/game/weapons/ShootingSystem.tsx`
**Kategori:** Combat polish / feeling

**Analisis:**

- Seperti yang terdokumentasi pada Fixing 1, recoil berpotensi dipanggil dari dua jalur yang berbeda.
- Meski build aman, perasaan tembakan bisa terasa tidak konsisten saat posisi senjata diupdate dari beberapa tempat.
- Bug ini sering tidak terlihat saat tes singkat, tetapi terasa jelas saat gameplay real-time.

**Root cause:**

- Recoil dipengaruhi oleh lebih dari satu update loop atau event source.
- Tidak ada single source of truth untuk offset recoil dan smoothing.

**Solusi yang disarankan:**

- Mengkonsolidasikan pembaruan recoil di satu layer saja, idealnya di loop render/update utama.
- Menjaga `shoot()` hanya mentrigger fire event, bukan membarui recoil secara langsung.
- Menambahkan dampening/smoothing secara central agar hasil tembakan stabil dan terdengar natural.

---

### 3.5. Chat & radio system butuh hardening untuk edge-case multipemain

**Lokasi utama:**

- `client/src/components/ChatSystem.tsx`
- `client/src/components/RadioCommand.tsx`
- `server/src/rooms/GameRoom.ts`

**Kategori:** Network reliability / UX stability

**Analisis:**

- Keduanya berhubungan dengan message event dan payload yang dipastikan server serta client memahami format yang sama.
- Dalam situasi koneksi intermiten atau reconnect, message bisa datang terlewat, berurutan, atau dengan payload yang tidak lengkap.
- Radio command sangat sensitif terhadap formatting payload dan validasi tim karena command berdasarkan key `Z + 1/2/3`.

**Root cause:**

- Event-driven message belum dibatasi secara ketat terhadap payload invalid.
- Tidak ada fallback handling jika server mengirim pesan dengan `sender`/`team` tidak valid atau timestamp tidak tersedia.

**Solusi yang disarankan:**

- Menambahkan validasi payload sebelum memproses `chat` dan `radio`.
- Menerapkan rate-limit sederhana untuk mencegah spam chat/radio.
- Menambahkan graceful fallback untuk subscriber tidak aktif atau room belum siap.

---

## 4. 🧩 File Target Pada Fixing 2

| No  | File                                          | Fokus Perbaikan                                                         |
| :-- | :-------------------------------------------- | :---------------------------------------------------------------------- |
| 1   | `client/src/stores/useNetworkStore.ts`        | Cleanup listener reconnect, stabilisasi setup room, event deduplication |
| 2   | `client/src/game/player/PlayerController.tsx` | Guard spectator target, safe null check, indeks clamp                   |
| 3   | `client/src/game/weapons/ShootingSystem.tsx`  | Konsolidasi recoil update, smoothing & feel stability                   |
| 4   | `client/src/components/ChatSystem.tsx`        | Validasi payload, chat rendering, reconnect-safe UI                     |
| 5   | `client/src/components/RadioCommand.tsx`      | Dispatch payload aman, fallback UI, command filtering                   |
| 6   | `server/src/rooms/GameRoom.ts`                | Validasi payload radio/chat, rate limit, anti-spam server               |
| 7   | `client/src/App.tsx`                          | Optimasi mount state, prevent duplicate component effects               |

---

## 5. 🎯 Rencana Tindakan Fixing 2

### Prioritas P0

1. Menambahkan guard pada spectator target dan array index handling.
2. Memastikan `setupRoom()` dan reconnect tidak menumpuk listener event.
3. Validasi payload radio/chat di server dan client.

### Prioritas P1

4. Mengurangi risiko duplicate recoil update yang bisa memengaruhi feel tembakan.
5. Menyederhanakan import store untuk menurunkan warning build dan mencegah cycle dependency.

### Prioritas P2

6. Menambah polish pada voice/radio feedback visual.
7. Menjaga konsistensi state UI selama reconnect dan round transition.

---

## 6. ✅ Kriteria Penerimaan Fixing 2

Fixing 2 dianggap berhasil apabila:

- Build monorepo tetap bersih setelah perubahan (`npm run build` sukses).
- Tidak ada duplikasi listener saat reconnect atau room switch.
- Spectator mode tidak crash bila target player tidak valid atau kosong.
- Chat & radio aman terhadap payload invalid dan spam.
- Recoil dan feel tembakan konsisten tanpa efek ganda.
- Warning bundle berkurang atau menjadi lebih terkendali.

---

## 7. Kesimpulan

Fixing 1 berhasil menormalisasi proyek dari status build blocker menjadi kondisi **build sehat**. Namun, proyek masih memiliki beberapa titik kritikal yang tidak selalu terlihat pada tahap kompilasi, terutama pada **event lifecycle**, **spectator safety**, **recoil feel**, dan **network message integrity**.

Karena itu, Fixing 2 adalah fase yang sangat penting untuk **mengangkat kualitas stabilitas runtime** agar game tidak hanya build sukses, tetapi juga lebih tahan terhadap kondisi real-world play dan reconnect multipemain.
