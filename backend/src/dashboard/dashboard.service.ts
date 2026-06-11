import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';

@Injectable()
export class DashboardService {
  constructor(
    private prisma: PrismaService,
    private redis: RedisService,
  ) {}

  async getDashboardSummary() {
    const [
      earthquakeStats,
      evacuationLocationStats,
      roadStats,
      hazardStats,
      evacuationStats,
      latestEarthquake,
    ] = await Promise.all([
      this.getEarthquakeSummary(),
      this.getEvacuationLocationSummary(),
      this.getRoadSummary(),
      this.getHazardSummary(),
      this.getEvacuationSummary(),
      this.prisma.earthquake.findFirst({
        orderBy: { time: 'desc' },
      }),
    ]);

    return {
      earthquake: earthquakeStats,
      evacuationLocation: evacuationLocationStats,
      road: roadStats,
      hazardZone: hazardStats,
      evacuation: evacuationStats,
      latestEarthquake,
    };
  }

  private async getEarthquakeSummary() {
    const [total, last30Days, avgMagnitude] = await Promise.all([
      this.prisma.earthquake.count(),
      this.prisma.earthquake.count({
        where: {
          time: {
            gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          },
        },
      }),
      this.prisma.earthquake.aggregate({
        _avg: { magnitude: true },
      }),
    ]);

    return {
      total,
      last30Days,
      averageMagnitude:
        Math.round((avgMagnitude._avg.magnitude || 0) * 100) / 100,
    };
  }

  private async getEvacuationLocationSummary() {
    const [total, agg, goodCondition, totalOfficers] = await Promise.all([
      this.prisma.evacuationLocation.count(),
      this.prisma.evacuationLocation.aggregate({ _sum: { capacity: true, currentOccupancy: true } }),
      this.prisma.evacuationLocation.count({
        where: { condition: 'GOOD' },
      }),
      this.prisma.user.count({ where: { role: 'EVACUATION_LOCATION_OFFICER' } })
    ]);

    return {
      total,
      totalCapacity: agg._sum.capacity || 0,
      currentOccupancy: agg._sum.currentOccupancy || 0,
      goodCondition,
      totalOfficers,
    };
  }

  private async getRoadSummary() {
    const [total, totalLength, goodCondition, moderateCondition, poorCondition, damagedCondition] = await Promise.all([
      this.prisma.road.count(),
      this.prisma.road.aggregate({ _sum: { length: true } }),
      this.prisma.road.count({
        where: { condition: 'GOOD' },
      }),
      this.prisma.road.count({
        where: { condition: 'MODERATE' },
      }),
      this.prisma.road.count({
        where: { condition: 'POOR' },
      }),
      this.prisma.road.count({
        where: { condition: 'DAMAGED' },
      }),
    ]);

    return {
      total,
      totalLength: Math.round((totalLength._sum.length || 0) * 100) / 100,
      goodCondition,
      moderateCondition,
      poorCondition,
      damagedCondition,
    };
  }

  private async getHazardSummary() {
    const [total, critical, high] = await Promise.all([
      this.prisma.hazardZone.count(),
      this.prisma.hazardZone.count({
        where: { level: 'CRITICAL' },
      }),
      this.prisma.hazardZone.count({
        where: { level: 'HIGH' },
      }),
    ]);

    return {
      total,
      critical,
      high,
    };
  }

  private async getEvacuationSummary() {
    const [totalRoutes, avgScore] = await Promise.all([
      this.prisma.evacuationRoute.count(),
      this.prisma.evacuationRoute.aggregate({
        _avg: { score: true },
      }),
    ]);

    return {
      totalRoutes,
      averageScore: Math.round((avgScore._avg.score || 0) * 100) / 100,
    };
  }
}
