# Product Requirements Document (PRD) Frontend

## Sistem Informasi Geografis (SIG) Manajemen Krisis Bencana Gempa Bumi Kabupaten Bantul

---

# 1. Gambaran Produk

Frontend sistem SIG manajemen krisis gempa bumi Kabupaten Bantul merupakan aplikasi web berbasis peta interaktif yang bertujuan untuk:

- memberikan informasi gempa terbaru secara semi real-time,
- menampilkan zona rawan gempa,
- memberikan rekomendasi jalur evakuasi utama dan alternatif,
- menampilkan lokasi shelter dan fasilitas umum,
- menyediakan dashboard admin untuk pengelolaan data.

Frontend dibangun untuk:

- masyarakat umum,
- BPBD,
- perangkat desa,
- admin sistem.

---

# 2. Tujuan Frontend

## Tujuan Utama

Menyediakan antarmuka pengguna yang:

- mudah dipahami,
- responsif,
- informatif,
- modern,
- mendukung pengambilan keputusan saat kondisi darurat.

---

# 3. Tech Stack Frontend

## Core:

- Next.js (App Router)
- TypeScript

## Styling:

- Tailwind CSS

## UI:

- shadcn/ui

## GIS:

- Leaflet + React Leaflet

## State:

- Zustand (opsional)

## API:

- Axios

## Realtime:

- Socket.IO Client

---

# 4. User Roles

## 1. Public User

Akses:

- melihat peta
- melihat gempa terbaru
- melihat shelter
- melihat jalur evakuasi

## 2. Admin

Akses:

- login
- CRUD shelter
- CRUD fasilitas umum
- update jalur evakuasi
- monitoring gempa

---

# 5. Sitemap Frontend

## Public:

- /
- /map
- /earthquakes
- /evacuation
- /education

## Admin:

- /admin/login
- /admin/dashboard
- /admin/shelters
- /admin/facilities
- /admin/routes

---

# 6. Halaman Public

---

## 6.1 Dashboard / Landing Page

### Tujuan:

Memberikan ringkasan cepat informasi kebencanaan.

### Komponen:

- Hero section:
  - nama sistem
  - deskripsi
- gempa terbaru
- jumlah shelter
- CTA ke peta

### UI:

- card modern
- responsive

---

## 6.2 Halaman Peta Utama (/map)

### Tujuan:

Menjadi pusat visualisasi GIS.

### Komponen utama:

- peta interaktif fullscreen
- sidebar layer

### Layer:

- zona rawan gempa
- marker gempa terbaru BMKG
- shelter
- fasilitas umum
- jalur utama
- jalur alternatif weighted overlay

### Interaksi:

- zoom
- pan
- klik marker
- popup detail

### Popup:

- Magnitudo
- Kedalaman
- Waktu
- Lokasi

### Panel kanan:

- gempa terbaru
- shelter terdekat
- status wilayah

---

## 6.3 Halaman Gempa (/earthquakes)

### Fitur:

- histori gempa BMKG
- filter tanggal
- detail gempa
- shakemap

---

## 6.4 Halaman Jalur Evakuasi (/evacuation)

### Fitur:

- rekomendasi jalur utama
- jalur alternatif
- shelter terdekat

### Input:

- lokasi user (opsional)

---

## 6.5 Halaman Edukasi (/education)

### Fitur:

- tips evakuasi
- SOP gempa
- checklist darurat

---

# 7. Halaman Admin

---

## 7.1 Login Admin

### Fitur:

- login email/password
- JWT auth

---

## 7.2 Dashboard Admin

### Fitur:

- statistik:
  - jumlah shelter
  - gempa terbaru
  - jalur

- quick actions

---

## 7.3 CRUD Shelter

### Fitur:

- tambah shelter
- edit shelter
- hapus shelter

### Input:

- nama
- lokasi
- kapasitas

---

## 7.4 CRUD Fasilitas Umum

### Fitur:

- tambah:
  - rumah sakit
  - sekolah
  - kantor desa

---

## 7.5 CRUD Jalur Evakuasi

### Fitur:

- tambah jalur
- edit jalur
- weighted overlay result

---

# 8. Realtime Features

## Socket.IO:

### event:

- new-earthquake
- route-update

### frontend behavior:

- update marker otomatis
- toast notif gempa

---

# 9. Integrasi API

## Backend:

- /earthquakes/latest
- /earthquakes/history
- /hazard-zones
- /roads
- /shelters
- /routes/recommendation

---

# 10. UI / UX Requirement

## Prinsip:

- clean
- profesional
- modern
- mudah dipahami

## Style:

- warna:
  - biru tua
  - putih
  - abu terang
  - merah alert

## UX:

- mobile responsive
- loading state
- skeleton

---

# 11. Non Functional Requirement

## Performance:

- load map < 3 detik

## Responsiveness:

- desktop / tablet / mobile

## Accessibility:

- warna jelas
- icon jelas

---

# 12. MVP Prioritas

## Phase 1:

- setup Next.js
- auth admin
- layout

## Phase 2:

- halaman map
- marker gempa
- shelter

## Phase 3:

- websocket notif
- weighted overlay

## Phase 4:

- admin CRUD

---

# 13. Success Metrics

- peta tampil smooth
- marker realtime update
- shelter tampil
- jalur alternatif tampil
- admin bisa CRUD
- UI mudah digunakan

---
