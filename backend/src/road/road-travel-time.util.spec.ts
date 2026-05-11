import {
  getConditionFactorFromRoadCondition,
  getKecepatanDariKondisi,
  segmentTravelMinutes,
} from './road-travel-time.util';

describe('road-travel-time.util', () => {
  describe('getConditionFactorFromRoadCondition', () => {
    it('maps Prisma road conditions to factors', () => {
      expect(getConditionFactorFromRoadCondition('GOOD')).toBe(0);
      expect(getConditionFactorFromRoadCondition('MODERATE')).toBe(0.3);
      expect(getConditionFactorFromRoadCondition('POOR')).toBe(0.7);
      expect(getConditionFactorFromRoadCondition('DAMAGED')).toBe(2.0);
    });

    it('returns 0 for unknown or missing (default good / 40 km/h)', () => {
      expect(getConditionFactorFromRoadCondition(undefined)).toBe(0);
      expect(getConditionFactorFromRoadCondition(null)).toBe(0);
      expect(getConditionFactorFromRoadCondition('')).toBe(0);
      expect(getConditionFactorFromRoadCondition('UNKNOWN')).toBe(0);
    });
  });

  describe('getKecepatanDariKondisi', () => {
    it('maps known factors to speeds km/h', () => {
      expect(getKecepatanDariKondisi(0)).toBe(40);
      expect(getKecepatanDariKondisi(0.3)).toBe(30);
      expect(getKecepatanDariKondisi(0.7)).toBe(20);
      expect(getKecepatanDariKondisi(2.0)).toBe(10);
    });

    it('defaults to 40 km/h for non-mapped factor', () => {
      expect(getKecepatanDariKondisi(0.5)).toBe(40);
    });
  });

  describe('segmentTravelMinutes', () => {
    it('1 km GOOD (factor 0) at 40 km/h = 1.5 minutes', () => {
      expect(segmentTravelMinutes(1000, 0)).toBeCloseTo(1.5, 5);
    });

    it('1 km DAMAGED (factor 2) at 10 km/h = 6 minutes', () => {
      expect(segmentTravelMinutes(1000, 2.0)).toBeCloseTo(6, 5);
    });
  });
});
