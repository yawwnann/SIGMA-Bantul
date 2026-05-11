/**
 * Kecepatan adaptif berdasarkan kondisi jalan (40/30/20/10 km/jam).
 * Dipakai untuk estimasi waktu tempuh per segmen; bobot Dijkstra/pgRouting tetap memakai cost terpisah.
 */

const CONDITION_TO_FACTOR: Record<string, number> = {
  GOOD: 0,
  MODERATE: 0.3,
  POOR: 0.7,
  DAMAGED: 2.0,
};

const FACTOR_TO_SPEED_KMH = new Map<number, number>([
  [0, 40],
  [0.3, 30],
  [0.7, 20],
  [2.0, 10],
]);

/**
 * Factor kondisi jalan (0 / 0.3 / 0.7 / 2.0) selaras dengan bobot condition di routing.
 * Tanpa data → 0 (perlakuan sama jalan baik, 40 km/jam).
 */
export function getConditionFactorFromRoadCondition(
  condition: string | null | undefined,
): number {
  if (condition == null || condition === '') {
    return 0;
  }
  return CONDITION_TO_FACTOR[condition] ?? 0;
}

/**
 * Kecepatan rencana (km/jam) dari conditionFactor.
 */
export function getKecepatanDariKondisi(conditionFactor: number): number {
  return FACTOR_TO_SPEED_KMH.get(conditionFactor) ?? 40;
}

/**
 * Waktu tempuh satu segmen (menit), dari panjang meter dan factor kondisi.
 */
export function segmentTravelMinutes(
  lengthM: number,
  conditionFactor: number,
): number {
  const km = lengthM / 1000;
  const v = getKecepatanDariKondisi(conditionFactor);
  return (km / v) * 60;
}
