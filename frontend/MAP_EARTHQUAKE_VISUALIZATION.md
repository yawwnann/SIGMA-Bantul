# Earthquake Visualization on Interactive Map

## Overview

Peta interaktif sekarang menampilkan semua riwayat gempa yang pernah terjadi dengan visualisasi radius dampak.

## Features

### 1. Circle Radius Visualization

- Setiap gempa ditampilkan dengan lingkaran radius yang menunjukkan area dampak
- Radius dihitung berdasarkan magnitude: `radius = magnitude × 10 km`
- Contoh: Gempa M5.0 = radius 50km

### 2. Visual Elements

**Pusat Gempa:**

- CircleMarker merah dengan border putih
- Radius: 8px (hover: 10px)
- Warna: #dc2626 (red-600)

**Radius Dampak:**

- Circle dengan fill semi-transparan
- Fill opacity: 15% (hover: 25%)
- Border opacity: 40% (hover: 60%)
- Warna: #dc2626 (red-600)

### 3. Interactive Features

**Hover Effect:**

- Circle radius menjadi lebih terlihat (opacity meningkat)
- Center marker membesar
- Smooth transition

**Click/Popup:**

- Menampilkan detail lengkap gempa:
  - Magnitude
  - Kedalaman
  - Lokasi
  - Tanggal & Waktu
  - Status dirasakan (jika ada)

### 4. Data Display

**Sidebar Info:**

- Total kejadian gempa
- Info gempa terbaru
- Magnitude dan lokasi

**Legend:**

- Pusat gempa (red circle)
- Radius dampak (red circle with fill)
- Instruksi "Klik titik untuk detail"

## Implementation Details

### Map Client Component

```typescript
// Calculate radius based on magnitude
const radiusInMeters = eq.magnitude * 10000; // 10km per magnitude

// Create impact circle
L.circle([eq.lat, eq.lon], {
  radius: radiusInMeters,
  color: "#dc2626",
  fillColor: "#dc2626",
  fillOpacity: 0.15,
  weight: 1,
  opacity: 0.4,
});

// Create center marker
L.circleMarker([eq.lat, eq.lon], {
  radius: 8,
  color: "#ffffff",
  fillColor: "#dc2626",
  fillOpacity: 1,
  weight: 2,
});
```

### Data Fetching

```typescript
// Fetch all earthquakes (not just latest)
earthquakeApi.getAll();
```

## Color Scheme

- Primary: `#dc2626` (red-600)
- Border: `#ffffff` (white)
- Fill opacity: 15% (normal), 25% (hover)
- Border opacity: 40% (normal), 60% (hover)

## User Experience

1. **Load Map** → Semua gempa ditampilkan dengan circle radius
2. **Hover** → Circle dan marker highlight
3. **Click** → Popup detail muncul
4. **Toggle** → Dapat di-hide/show via filter "Gempa"

## Performance

- Semua gempa ditampilkan (tidak dibatasi)
- Efficient rendering dengan Leaflet
- Hover effects menggunakan CSS transitions
- Popup lazy-loaded saat diklik

## Files Modified

- `frontend/app/map/page.tsx` - Fetch all earthquakes
- `frontend/components/map/map-client.tsx` - Circle visualization
- Added legend and hover effects
