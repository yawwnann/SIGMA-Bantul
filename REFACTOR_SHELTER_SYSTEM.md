# Refactor Sistem Shelter/Lokasi Evakuasi

## 📋 Ringkasan Perubahan

Sistem telah direfactor dari menampilkan **semua shelter sekaligus** menjadi **hanya menampilkan shelter terdekat** berdasarkan lokasi user dengan performa optimal menggunakan PostGIS spatial query.

## 🎯 Konsep Baru

### Flow Aplikasi

1. **Auto-request Lokasi User**
   - Aplikasi otomatis meminta akses lokasi saat dibuka
   - Tidak perlu klik tombol "Cari Lokasi Saya"
   - Menggunakan Geolocation API browser

2. **Fetch Nearby Shelters**
   - Backend mencari shelter terdekat menggunakan PostGIS
   - Hanya mengembalikan maksimal 10 shelter dalam radius 3 km
   - Menggunakan spatial index (GIST) untuk performa optimal

3. **Tampilan Map**
   - Hanya menampilkan marker user dan shelter terdekat
   - TIDAK menampilkan semua shelter
   - TIDAK langsung generate routing

4. **Routing On-Demand**
   - Routing hanya dihitung ketika user klik "Lihat Rute" pada shelter
   - Tidak ada perhitungan rute otomatis

5. **Kategori Shelter**
   - SCHOOL (Sekolah) - Icon 🏫 Biru
   - FIELD (Lapangan) - Icon 🏟️ Hijau
   - GOVERNMENT (Pemerintahan) - Icon 🏛️ Merah

## 🔧 Perubahan Backend

### 1. Shelter Service (`backend/src/shelter/shelter.service.ts`)

**Method Baru: `getNearby()`**

```typescript
async getNearby(lat: number, lon: number, radiusKm: number = 3, limit: number = 10)
```

**Fitur:**

- Menggunakan PostGIS `ST_DWithin` untuk filtering spatial
- Menggunakan `ST_Distance` untuk menghitung jarak akurat
- Menggunakan operator `<->` untuk sorting berdasarkan jarak (menggunakan GIST index)
- Return data dengan `distanceKm` dan `availableCapacity`

**Query PostGIS:**

```sql
SELECT
  id, name, category, capacity, "currentOccupancy",
  geometry, address, condition, status, facilities,
  ST_Distance(
    geom::geography,
    ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography
  ) as distance
FROM "Shelter"
WHERE ST_DWithin(
  geom::geography,
  ST_SetSRID(ST_MakePoint(lon, lat), 4326)::geography,
  radiusMeters
)
ORDER BY geom <-> ST_SetSRID(ST_MakePoint(lon, lat), 4326)
LIMIT limit
```

### 2. Shelter Controller (`backend/src/shelter/shelter.controller.ts`)

**Endpoint Baru:**

```
GET /shelters/nearby?lat={lat}&lon={lon}&radius={radius}&limit={limit}
```

**Parameters:**

- `lat` (required): Latitude user
- `lon` (required): Longitude user
- `radius` (optional): Radius pencarian dalam km (default: 3)
- `limit` (optional): Maksimal hasil (default: 10)

**Response:**

```json
[
  {
    "id": 1,
    "name": "SD Negeri 1 Bantul",
    "category": "SCHOOL",
    "capacity": 500,
    "currentOccupancy": 120,
    "geometry": { "type": "Point", "coordinates": [110.3289, -7.8878] },
    "address": "Jl. Parangtritis",
    "condition": "GOOD",
    "status": "ACTIVE",
    "facilities": "Toilet, Air bersih, Dapur umum",
    "distance": 1234.56,
    "distanceKm": 1.23,
    "availableCapacity": 380
  }
]
```

## 🎨 Perubahan Frontend

### 1. Custom Hook: `useUserLocation`

**File:** `frontend/hooks/use-user-location.ts`

**Fitur:**

- Auto-request lokasi saat component mount
- Handle error dengan pesan yang jelas
- Loading state management
- Manual request location function

**Usage:**

```typescript
const { location, loading, error, requestLocation } = useUserLocation(true);
```

### 2. Service: `evacuationService`

**File:** `frontend/services/evacuation.service.ts`

**Methods:**

- `getNearbyShelters()`: Fetch shelter terdekat dari API
- `calculateRoute()`: Hitung rute evakuasi

### 3. Component: `UserLocationMarker`

**File:** `frontend/components/map/user-location-marker.tsx`

**Fitur:**

- Marker dengan animasi pulse
- Warna biru (#3b82f6)
- Popup dengan koordinat

### 4. Component: `NearbyEvacuationMarkers`

**File:** `frontend/components/map/nearby-evacuation-markers.tsx`

**Fitur:**

- Icon berbeda per kategori shelter
- Popup dengan informasi lengkap
- Tombol "Lihat Rute Evakuasi"
- Badge kategori dengan warna berbeda

**Icon Mapping:**

- SCHOOL: 🏫 (Biru)
- FIELD: 🏟️ (Hijau)
- GOVERNMENT: 🏛️ (Merah)

### 5. Main Page: `page.tsx`

**File:** `frontend/app/page.tsx`

**Perubahan Utama:**

- Auto-request user location on mount
- Fetch nearby shelters ketika location tersedia
- Hanya render marker user dan nearby shelters
- Routing on-demand (klik tombol)
- Info cards untuk status lokasi dan shelter count

## 📊 Optimasi Performa

### Backend

1. **PostGIS Spatial Index (GIST)**
   - Index pada kolom `geom` untuk query cepat
   - `ST_DWithin` menggunakan index untuk filtering
   - Operator `<->` menggunakan index untuk sorting

2. **Limit Query**
   - Maksimal 10 hasil per request
   - Radius default 3 km

3. **Geography Type**
   - Menggunakan `geography` untuk perhitungan jarak akurat (meter)
   - Lebih akurat daripada `geometry` untuk jarak jauh

### Frontend

1. **Lazy Loading**
   - Map component di-load secara dynamic
   - Tidak render semua shelter sekaligus

2. **Conditional Rendering**
   - Hanya render marker ketika data tersedia
   - Loading state untuk UX yang baik

3. **On-Demand Routing**
   - Routing hanya dihitung ketika user request
   - Tidak ada perhitungan rute otomatis

## 🚀 Cara Menggunakan

### 1. Jalankan Backend

```bash
cd backend
npm install
npm run start:dev
```

### 2. Jalankan Frontend

```bash
cd frontend
npm install
npm run dev
```

### 3. Akses Aplikasi

Buka browser dan akses `http://localhost:5173`

**Flow:**

1. Aplikasi otomatis meminta izin lokasi
2. Setelah lokasi didapat, shelter terdekat ditampilkan
3. Klik marker shelter untuk melihat detail
4. Klik "Lihat Rute Evakuasi" untuk menghitung rute

## 📝 Catatan Penting

### Geolocation Permission

- User harus memberikan izin akses lokasi
- Jika ditolak, tampilkan pesan error yang jelas
- Fallback ke center Bantul jika lokasi tidak tersedia

### Boundary Check

- Sistem hanya mendukung wilayah Kabupaten Bantul
- Bounding box: lat (-8.15 to -7.8), lng (110.15 to 110.5)
- Tampilkan modal jika user di luar wilayah

### Mobile Optimization

- Responsive design untuk mobile
- Touch-friendly marker size
- Optimized untuk koneksi lambat

## 🔍 Testing

### Test Backend Endpoint

```bash
# Test nearby shelters
curl "http://localhost:3001/shelters/nearby?lat=-7.8878&lon=110.3289&radius=3&limit=10"
```

### Test Frontend

1. Buka browser DevTools
2. Simulasi lokasi GPS:
   - Chrome: DevTools > Sensors > Location
   - Set custom location: -7.8878, 110.3289
3. Refresh halaman
4. Verify shelter markers muncul

## 📚 Dependencies

### Backend

- `@prisma/client`: Database ORM
- `@nestjs/common`: NestJS framework
- PostGIS extension di PostgreSQL

### Frontend

- `react-leaflet`: Map library
- `leaflet`: Core map library
- `sonner`: Toast notifications

## 🐛 Troubleshooting

### Shelter tidak muncul

- Check console untuk error API
- Verify PostGIS extension installed
- Check shelter data di database memiliki `geom` column

### Lokasi tidak terdeteksi

- Check browser permission
- Verify HTTPS (Geolocation requires secure context)
- Check console untuk Geolocation API errors

### Rute tidak terhitung

- Verify road network data tersedia
- Check routing API endpoint
- Verify start/end points terhubung dengan jalan

## 📈 Future Improvements

1. **Caching**
   - Cache nearby shelters di Redis
   - Cache key: `nearby:${lat}:${lng}:${radius}`

2. **Real-time Updates**
   - WebSocket untuk update kapasitas shelter real-time
   - Notifikasi ketika shelter penuh

3. **Advanced Filtering**
   - Filter by category
   - Filter by available capacity
   - Sort by distance/capacity

4. **Offline Support**
   - Service Worker untuk offline map
   - Cache shelter data locally

5. **Analytics**
   - Track most accessed shelters
   - Heatmap untuk shelter usage

## 👥 Contributors

- Backend: NestJS + PostGIS spatial queries
- Frontend: Next.js + React Leaflet
- Database: PostgreSQL + PostGIS extension

---

**Last Updated:** May 8, 2026
**Version:** 2.0.0
