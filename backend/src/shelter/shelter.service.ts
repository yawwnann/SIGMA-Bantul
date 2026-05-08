import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { ShelterCategory, ShelterCondition, UserRole } from '@prisma/client';

@Injectable()
export class ShelterService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShelterDto) {
    return this.prisma.shelter.create({
      data: dto,
    });
  }

  async findAll(params?: {
    condition?: ShelterCondition;
    category?: ShelterCategory;
  }) {
    const where = {
      ...(params?.condition ? { condition: params.condition } : {}),
      ...(params?.category ? { category: params.category } : {}),
    };
    return this.prisma.shelter.findMany({
      where,
      include: {
        officer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
  }

  async findById(id: number) {
    const shelter = await this.prisma.shelter.findUnique({
      where: { id },
      include: {
        officer: {
          select: { id: true, name: true, email: true },
        },
      },
    });
    if (!shelter) {
      throw new NotFoundException(`Shelter with ID ${id} not found`);
    }
    return shelter;
  }

  async update(id: number, dto: CreateShelterDto) {
    await this.findById(id);
    return this.prisma.shelter.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.shelter.delete({ where: { id } });
  }

  async assignOfficer(shelterId: number, officerId: number) {
    await this.findById(shelterId);

    const officer = await this.prisma.user.findFirst({
      where: { id: officerId, role: UserRole.SHELTER_OFFICER },
    });
    if (!officer) {
      throw new BadRequestException('User bukan petugas shelter yang valid');
    }

    return this.prisma.shelter.update({
      where: { id: shelterId },
      data: { officerId },
      include: { officer: { select: { id: true, name: true, email: true } } },
    });
  }

  async unassignOfficer(shelterId: number) {
    await this.findById(shelterId);
    return this.prisma.shelter.update({
      where: { id: shelterId },
      data: { officerId: null },
      include: { officer: { select: { id: true, name: true, email: true } } },
    });
  }

  async updateOccupancy(id: number, currentOccupancy: number) {
    await this.findById(id);
    return this.prisma.shelter.update({
      where: { id },
      data: { currentOccupancy },
    });
  }

  async getNearby(
    lat: number,
    lon: number,
    radiusKm: number = 5,
    limit: number = 10,
  ) {
    // Use PostGIS spatial query for optimal performance
    // ST_DWithin uses spatial index (GIST) for fast filtering
    const radiusMeters = radiusKm * 1000;

    const shelters = await this.prisma.$queryRaw<
      Array<{
        id: number;
        name: string;
        category: ShelterCategory;
        capacity: number;
        currentOccupancy: number;
        geometry: any;
        address: string | null;
        condition: ShelterCondition;
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
      FROM "Shelter"
      WHERE ST_DWithin(
        geom::geography,
        ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)::geography,
        ${radiusMeters}
      )
      ORDER BY geom <-> ST_SetSRID(ST_MakePoint(${lon}, ${lat}), 4326)
      LIMIT ${limit}
    `;

    return shelters.map((shelter) => ({
      ...shelter,
      distanceKm: Math.round((shelter.distance / 1000) * 100) / 100,
      availableCapacity: shelter.capacity - (shelter.currentOccupancy || 0),
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
      this.prisma.shelter.count(),
      this.prisma.shelter.groupBy({
        by: ['condition'],
        _count: true,
      }),
      this.prisma.shelter.aggregate({ _sum: { capacity: true } }),
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
