import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateHazardZoneDto } from './dto/create-hazard-zone.dto';
import { HazardLevel } from '@prisma/client';

@Injectable()
export class HazardZoneService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateHazardZoneDto) {
    return this.prisma.hazardZone.create({
      data: dto,
    });
  }

  async findAll(params?: { level?: HazardLevel }) {
    const where = params?.level ? { level: params.level } : {};
    return this.prisma.hazardZone.findMany({ where });
  }

  async findById(id: number) {
    const zone = await this.prisma.hazardZone.findUnique({ where: { id } });
    if (!zone) {
      throw new NotFoundException(`HazardZone with ID ${id} not found`);
    }
    return zone;
  }

  async update(id: number, dto: CreateHazardZoneDto) {
    await this.findById(id);
    return this.prisma.hazardZone.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.hazardZone.delete({ where: { id } });
  }

  async getStatistics() {
    const [total, byLevel] = await Promise.all([
      this.prisma.hazardZone.count(),
      this.prisma.hazardZone.groupBy({
        by: ['level'],
        _count: true,
      }),
    ]);

    return {
      total,
      byLevel: byLevel.map((item) => ({
        level: item.level,
        count: item._count,
      })),
    };
  }
}
