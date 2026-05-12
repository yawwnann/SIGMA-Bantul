/**
 * Utility untuk validasi apakah koordinat berada dalam wilayah Kabupaten Bantul
 * Menggunakan polygon GeoJSON dari backend jika tersedia, fallback ke bounding box
 */

// Bounding box Kabupaten Bantul (approximate, selaras dengan peta utama aplikasi)
const BANTUL_BOUNDS = {
  north: -7.8, // Berbatasan dengan Kota Yogyakarta
  south: -8.15, // Pantai Selatan
  west: 110.15, // Kulon Progo
  east: 110.5, // Gunung Kidul
};

// Module-level variable — diisi dari response API backend
let bantulPolygon: number[][] | null = null;

/** Set polygon dari response API backend */
export function setBantulPolygon(polygon: number[][] | null) {
  bantulPolygon = polygon;
}

export function isWithinBantul(lat: number, lng: number): boolean {
  if (bantulPolygon) {
    return pointInPolygon(lng, lat, bantulPolygon);
  }

  return (
    lat >= BANTUL_BOUNDS.south &&
    lat <= BANTUL_BOUNDS.north &&
    lng >= BANTUL_BOUNDS.west &&
    lng <= BANTUL_BOUNDS.east
  );
}

/**
 * Get distance from point to Bantul center (approximate)
 * @param lat Latitude
 * @param lng Longitude
 * @returns Distance in kilometers
 */
export function getDistanceFromBantulCenter(lat: number, lng: number): number {
  const BANTUL_CENTER_LAT = -7.886;
  const BANTUL_CENTER_LNG = 110.334;

  const R = 6371; // Earth radius in km
  const dLat = deg2rad(lat - BANTUL_CENTER_LAT);
  const dLng = deg2rad(lng - BANTUL_CENTER_LNG);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(BANTUL_CENTER_LAT)) *
      Math.cos(deg2rad(lat)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function deg2rad(deg: number): number {
  return deg * (Math.PI / 180);
}

function pointInPolygon(
  lng: number,
  lat: number,
  polygon: number[][],
): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, yi] = polygon[i];
    const [xj, yj] = polygon[j];
    if (
      yi > lat !== yj > lat &&
      lng < ((xj - xi) * (lat - yi)) / (yj - yi) + xi
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/**
 * Get user-friendly message about location relative to Bantul
 */
export function getLocationMessage(lat: number, lng: number): string {
  if (isWithinBantul(lat, lng)) {
    return "Lokasi Anda berada di wilayah Kabupaten Bantul";
  }

  const distance = getDistanceFromBantulCenter(lat, lng);

  // Determine direction
  const BANTUL_CENTER_LAT = -7.886;
  const BANTUL_CENTER_LNG = 110.334;

  let direction = "";
  if (lat > BANTUL_CENTER_LAT) {
    direction = lng > BANTUL_CENTER_LNG ? "timur laut" : "barat laut";
  } else {
    direction = lng > BANTUL_CENTER_LNG ? "tenggara" : "barat daya";
  }

  return `Lokasi Anda berada ${distance.toFixed(1)} km di ${direction} Bantul, di luar wilayah layanan`;
}

// Export bounds for reference
export const BANTUL_BOUNDARY = BANTUL_BOUNDS;
