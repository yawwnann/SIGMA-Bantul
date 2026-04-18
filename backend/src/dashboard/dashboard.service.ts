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
      shelterStats,
      roadStats,
      hazardStats,
      evacuationStats,
      latestEarthquake,
    ] = await Promise.all([
      this.getEarthquakeSummary(),
      this.getShelterSummary(),
      this.getRoadSummary(),
      this.getHazardSummary(),
      this.getEvacuationSummary(),
      this.prisma.earthquake.findFirst({
        orderBy: { time: 'desc' },
      }),
    ]);

    return {
      earthquake: earthquakeStats,
      shelter: shelterStats,
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

  private async getShelterSummary() {
    const [total, totalCapacity, goodCondition] = await Promise.all([
      this.prisma.shelter.count(),
      this.prisma.shelter.aggregate({ _sum: { capacity: true } }),
      this.prisma.shelter.count({
        where: { condition: 'GOOD' },
      }),
    ]);

    return {
      total,
      totalCapacity: totalCapacity._sum.capacity || 0,
      goodCondition,
    };
  }

  private async getRoadSummary() {
    const [total, totalLength, goodCondition] = await Promise.all([
      this.prisma.road.count(),
      this.prisma.road.aggregate({ _sum: { length: true } }),
      this.prisma.road.count({
        where: { condition: 'GOOD' },
      }),
    ]);

    return {
      total,
      totalLength: Math.round((totalLength._sum.length || 0) * 100) / 100,
      goodCondition,
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
