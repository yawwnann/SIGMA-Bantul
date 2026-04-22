import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { ShelterCondition } from '@prisma/client';

@Injectable()
export class ShelterService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateShelterDto) {
    return this.prisma.shelter.create({
      data: dto,
    });
  }

  async findAll(params?: { condition?: ShelterCondition }) {
    const where = params?.condition ? { condition: params.condition } : {};
    return this.prisma.shelter.findMany({ where });
  }

  async findById(id: number) {
    const shelter = await this.prisma.shelter.findUnique({ where: { id } });
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

  async updateOccupancy(id: number, currentOccupancy: number) {
    await this.findById(id);
    return this.prisma.shelter.update({
      where: { id },
      data: { currentOccupancy },
    });
  }

  async getNearby(lat: number, lon: number, radiusKm: number = 10) {
    const shelters = await this.prisma.shelter.findMany();

    return shelters.filter((shelter) => {
      const geom = shelter.geometry as {
        type: string;
        coordinates: number[] | number[][];
      } | null;
      if (!geom?.coordinates) return false;

      let shelterLat: number;
      let shelterLon: number;

      if (
        geom.type === 'Point' &&
        Array.isArray(geom.coordinates) &&
        geom.coordinates.length >= 2
      ) {
        shelterLat = geom.coordinates[1] as number;
        shelterLon = geom.coordinates[0] as number;
      } else if (
        Array.isArray(geom.coordinates) &&
        geom.coordinates.length > 0
      ) {
        const firstCoord = geom.coordinates[0];
        if (Array.isArray(firstCoord) && firstCoord.length >= 2) {
          shelterLat = firstCoord[1];
          shelterLon = firstCoord[0];
        } else {
          return false;
        }
      } else {
        return false;
      }

      if (typeof shelterLat !== 'number' || typeof shelterLon !== 'number')
        return false;

      const distance = this.calculateDistance(lat, lon, shelterLat, shelterLon);
      return distance <= radiusKm;
    });
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
