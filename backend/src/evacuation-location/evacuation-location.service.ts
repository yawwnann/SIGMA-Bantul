import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvacuationLocationDto } from './dto/create-evacuation-location.dto';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
  UserRole,
} from '@prisma/client';

@Injectable()
export class EvacuationLocationService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEvacuationLocationDto) {
    return this.prisma.evacuationLocation.create({
      data: dto,
    });
  }

  async findAll(params?: {
    condition?: EvacuationLocationCondition;
    category?: EvacuationLocationCategory;
  }) {
    const where = {
      ...(params?.condition ? { condition: params.condition } : {}),
      ...(params?.category ? { category: params.category } : {}),
    };
    return this.prisma.evacuationLocation.findMany({
      where,
      include: {
        officer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findById(id: number) {
    const evacuationLocation = await this.prisma.evacuationLocation.findUnique({
      where: { id },
      include: {
        officer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!evacuationLocation) {
      throw new NotFoundException(`EvacuationLocation with ID ${id} not found`);
    }
    return evacuationLocation;
  }

  async update(id: number, dto: CreateEvacuationLocationDto) {
    await this.findById(id);
    return this.prisma.evacuationLocation.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.evacuationLocation.delete({ where: { id } });
  }

  async assignOfficer(evacuationLocationId: number, officerId: number) {
    await this.findById(evacuationLocationId);

    const officer = await this.prisma.user.findFirst({
      where: { id: officerId, role: UserRole.EVACUATION_LOCATION_OFFICER },
    });
    if (!officer) {
      throw new BadRequestException(
        'User bukan petugas evacuationLocation yang valid',
      );
    }

    return this.prisma.evacuationLocation.update({
      where: { id: evacuationLocationId },
      data: { officerId },
      include: { officer: { select: { id: true, name: true, email: true } } },
    });
  }

  async unassignOfficer(evacuationLocationId: number) {
    await this.findById(evacuationLocationId);
    return this.prisma.evacuationLocation.update({
      where: { id: evacuationLocationId },
      data: { officerId: null },
      include: { officer: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateOccupancy(id: number, currentOccupancy: number) {
    await this.findById(id);
    return this.prisma.evacuationLocation.update({
      where: { id },
      data: { currentOccupancy },
    });
  }

  async getNearby(
    lat: number,
    lon: number,
    radiusKm: number = 3,
    limit: number = 10,
  ) {
    // Use PostGIS spatial query for optimal performance
    // ST_DWithin uses spatial index (GIST) for fast filtering
    const radiusMeters = radiusKm * 1000;

    const evacuationLocations = await this.prisma.$queryRaw<
      Array<{
        id: number;
        name: string;
        category: EvacuationLocationCategory;
        capacity: number;
        currentOccupancy: number;
        geometry: any;
        address: string | null;
        condition: EvacuationLocationCondition;
        status: string;
        facilities: string | null;
        distance: number;
      }>
    >`
      SELECT 
        id,
        name,
        category,
        capacity,
        "currentOccupancy",
        geometry,
        address,
        condition,
        status,
        facilities,
        ST_Distance(
          geom::geography,
          ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography
        ) as distance
      FROM "EvacuationLocation"
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      LIMIT ${limit}
    `;

    return evacuationLocations.map((evacuationLocation) => ({
      ...evacuationLocation,
      distanceKm: Math.round((evacuationLocation.distance / 1000) * 100) / 100,
      availableCapacity:
        evacuationLocation.capacity -
        (evacuationLocation.currentOccupancy || 0),
    }));
  }

  private calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    const R = 6371;
    const dLat = this.toRad(lat2 - lat1);
    const dLon = this.toRad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  async getStatistics() {
    const [total, byCondition, totalCapacity] = await Promise.all([
      this.prisma.evacuationLocation.count(),
      this.prisma.evacuationLocation.groupBy({
        by: ['condition'],
        _count: true,
      }),
      this.prisma.evacuationLocation.aggregate({ _sum: { capacity: true } }),
    ]);

    return {
      total,
      totalCapacity: totalCapacity._sum.capacity || 0,
      byCondition: byCondition.map((item) => ({
        condition: item.condition,
        count: item._count,
      })),
    };
  }
}
