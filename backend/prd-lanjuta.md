# PRD Lanjutan — Integrasi Data Gempa Terbuka BMKG

## Sistem SIG Manajemen Krisis Bencana Gempa Bumi Kabupaten Bantul

---

# 1. Tujuan Integrasi BMKG

Integrasi data gempa terbuka BMKG bertujuan untuk:

- menampilkan informasi gempa terbaru secara semi real-time,
- memberikan notifikasi kejadian gempa terbaru kepada pengguna,
- memperbarui visualisasi titik episentrum di peta,
- mendukung pengambilan keputusan mitigasi dan evakuasi,
- menyimpan histori kejadian gempa untuk analisis.

---

# 2. Sumber Data Eksternal

## Provider:

BMKG (Badan Meteorologi, Klimatologi, dan Geofisika)

## Endpoint Publik:

### 1. Gempa terbaru

https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json

### 2. Daftar 15 gempa M ≥ 5.0

https://data.bmkg.go.id/DataMKG/TEWS/gempaterkini.json

### 3. Daftar 15 gempa dirasakan

https://data.bmkg.go.id/DataMKG/TEWS/gempadirasakan.json

---

# 3. Kebutuhan Sistem BMKG Module

## Functional Requirements

### 3.1 Sinkronisasi Data Otomatis

Sistem backend harus:

- mengambil data gempa terbaru dari BMKG secara berkala.
- interval sinkronisasi:
  - default: 5 menit
  - configurable.

### 3.2 Validasi Data Baru

Sistem harus:

- membandingkan:
  - DateTime
  - Magnitude
  - coordinates
- memastikan tidak ada data duplikat.

### 3.3 Penyimpanan Database Lokal

Sistem menyimpan:

- histori gempa terbaru
- detail gempa

### 3.4 Distribusi Real-Time

Jika ada data baru:

- simpan DB
- kirim WebSocket event:
  - new-earthquake

### 3.5 Visualisasi GIS

Frontend:

- tampilkan marker episentrum
- popup detail
- overlay zona rawan

---

# 4. Arsitektur Integrasi BMKG

BMKG API → Scheduler NestJS → Redis Cache → PostgreSQL/PostGIS → WebSocket → Frontend GIS

---

# 5. Backend Requirement

## 5.1 Earthquake Module

NestJS module:

- earthquake.module.ts
- earthquake.service.ts
- earthquake.controller.ts

### Service:

- fetchLatestEarthquake()
- fetchRecentEarthquakes()
- fetchFeltEarthquakes()
- syncBMKGData()

---

## 5.2 Scheduler / Cron Job

Gunakan:

- @nestjs/schedule

Task:

- cron tiap 5 menit:
  - cek autogempa.json

---

## 5.3 Redis Cache

Tujuan:

- menghindari spam request ke BMKG
- simpan latest cache

Redis key:

- bmkg:latest
- bmkg:last-sync

TTL:

- 300 detik

---

# 6. Database Design

## Table: earthquakes

```sql
CREATE TABLE earthquakes (
  id SERIAL PRIMARY KEY,
  bmkg_id VARCHAR(255) UNIQUE,
  magnitude DECIMAL(3,1),
  depth VARCHAR(50),
  latitude DECIMAL(10,6),
  longitude DECIMAL(10,6),
  location TEXT,
  felt TEXT,
  potential TEXT,
  occurred_at TIMESTAMP,
  shakemap_url TEXT,
  coordinates GEOMETRY(POINT, 4326),
  source VARCHAR(50) DEFAULT 'BMKG',
  created_at TIMESTAMP DEFAULT NOW()
);
```
