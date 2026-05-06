/**
 * Utility untuk validasi apakah koordinat berada dalam wilayah Kabupaten Bantul
 * Menggunakan bounding box sederhana untuk performa
 */

// Bounding box Kabupaten Bantul (approximate)
const BANTUL_BOUNDS = {
  north: -7.88, // Batas dengan Kota Yogyakarta
  south: -8.15, // Pantai Selatan
  west: 110.2, // Batas dengan Kulon Progo
  east: 110.5, // Batas dengan Gunung Kidul
};

/**
 * Check if coordinates are within Bantul regency using bounding box
 * @param lat Latitude
 * @param lng Longitude
 * @returns true if within Bantul bounds
 */
export function isWithinBantul(lat: number, lng: number): boolean {
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
