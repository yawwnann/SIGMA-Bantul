# Product Requirements Document (PRD)

## Sistem Informasi Geografis (SIG) Manajemen Krisis Bencana Gempa Bumi Kabupaten Bantul

---

# 1. Latar Belakang

Kabupaten Bantul merupakan wilayah rawan gempa bumi karena berada di zona subduksi aktif selatan Pulau Jawa. Dibutuhkan sistem informasi geografis berbasis web yang mampu menyajikan informasi kebencanaan secara interaktif, akurat, dan semi real-time untuk mendukung mitigasi, evakuasi, serta pengambilan keputusan.

Sistem ini dirancang untuk:

- menampilkan zona rawan gempa,
- memberikan informasi gempa terbaru,
- menyediakan titik evakuasi,
- merekomendasikan jalur evakuasi utama dan alternatif berbasis weighted overlay.

---

# 2. Tujuan Produk

## Tujuan Utama

Membangun platform WebGIS manajemen krisis bencana gempa bumi yang dapat membantu masyarakat, BPBD, dan pemangku kepentingan dalam memperoleh informasi spasial dan jalur evakuasi secara efektif.

## Sasaran

- Menyediakan visualisasi peta bencana interaktif.
- Menampilkan informasi gempa semi real-time.
- Memberikan rekomendasi jalur evakuasi aman.
- Mendukung kesiapsiagaan bencana.

---

# 3. Ruang Lingkup Produk

## In Scope

- WebGIS berbasis web.
- Integrasi data zona rawan gempa.
- Integrasi BMKG API.
- Sistem semi real-time gempa.
- Weighted overlay jalur evakuasi.
- Dashboard admin.

## Out of Scope

- Prediksi gempa.
- Sistem early warning resmi.
- Mobile app native.
- Integrasi sensor IoT.

---

# 4. Stakeholder

- Mahasiswa Peneliti
- Dosen Pembimbing
- BPBD Kabupaten Bantul
- Masyarakat Bantul
- Perangkat Desa

---

# 5. User Persona

## 1. Masyarakat

Kebutuhan:

- tahu lokasi aman
- lihat shelter
- lihat jalur evakuasi

## 2. BPBD / Admin

Kebutuhan:

- update data shelter
- monitor gempa
- evaluasi jalur

## 3. Pemerintah Desa

Kebutuhan:

- data mitigasi wilayah
- fasilitas umum

---

# 6. Fitur Utama

## 6.1 Dashboard Utama

- Ringkasan gempa terbaru
- Statistik shelter
- Peta singkat

## 6.2 Peta Interaktif

- Zona rawan gempa
- Marker gempa
- Shelter
- Jalur evakuasi
- Jalur alternatif

## 6.3 Informasi Gempa

- Gempa terbaru BMKG
- Histori gempa

## 6.4 Jalur Evakuasi

- Jalur utama
- Jalur alternatif weighted overlay
- shelter terdekat

## 6.5 Edukasi Mitigasi

- panduan evakuasi
- tips kesiapsiagaan

## 6.6 Admin Dashboard

- CRUD data:
  - shelter
  - fasilitas umum
  - jalur
  - zona rawan

---

# 7. Arsitektur Teknologi

## Backend

- NestJS
- PostgreSQL + PostGIS
- Prisma
- Redis
- Socket.IO

## Frontend

- Next.js
- Leaflet.js

## External API

- BMKG API publik

---

# 8. Arsitektur Sistem

BMKG API → Backend Scheduler → Redis Cache → PostgreSQL → WebSocket → Frontend GIS

---

# 9. Kebutuhan Backend

## Modul:

- Auth
- Earthquake
- Hazard Zone
- Roads
- Shelter
- Evacuation
- WebSocket Gateway
- Redis Cache

## Endpoint:

- GET /earthquakes/latest
- GET /earthquakes/history
- GET /hazard-zones
- GET /roads
- GET /shelters
- GET /routes/recommendation

---

# 10. Data & Weighted Overlay

## Data:

- Zona rawan gempa
- Jaringan jalan
- Shelter
- Fasilitas umum

## Weighted Overlay:

Kriteria:

- tingkat kerawanan
- jenis jalan
- jarak shelter

Contoh bobot:

- kerawanan: 50%
- kondisi jalan: 30%
- jarak: 20%

Output:

- jalur aman
- jalur alternatif

---

# 11. Non Functional Requirements

## Performance

- load map < 3 detik
- response API < 500 ms

## Security

- JWT auth admin
- rate limit API

## Reliability

- cache BMKG
- retry fetch

## Scalability

- modular backend
- scalable websocket

---

# 12. MVP Prioritas

## Phase 1:

- backend setup
- database schema
- BMKG sync
- redis cache

## Phase 2:

- peta GIS
- shelter
- zona rawan

## Phase 3:

- weighted overlay
- jalur alternatif

## Phase 4:

- websocket notifikasi

---

# 13. Risiko

- keterbatasan data spasial
- API BMKG downtime
- validasi jalur evakuasi

Mitigasi:

- cache lokal
- fallback data statis

---

# 14. KPI Keberhasilan

- sistem berjalan stabil
- data gempa update otomatis
- peta interaktif berjalan
- jalur alternatif tampil
- user mudah menggunakan

---
