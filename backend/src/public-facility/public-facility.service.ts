import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePublicFacilityDto } from './dto/create-public-facility.dto';

@Injectable()
export class PublicFacilityService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreatePublicFacilityDto) {
    return this.prisma.publicFacility.create({
      data: dto,
    });
  }

  async findAll(type?: string) {
    const where = type ? { type } : {};
    return this.prisma.publicFacility.findMany({ where });
  }

  async findById(id: number) {
    const facility = await this.prisma.publicFacility.findUnique({
      where: { id },
    });
    if (!facility) {
      throw new NotFoundException(`PublicFacility with ID ${id} not found`);
    }
    return facility;
  }

  async update(id: number, dto: CreatePublicFacilityDto) {
    await this.findById(id);
    return this.prisma.publicFacility.update({
      where: { id },
      data: dto,
    });
  }

  async delete(id: number) {
    await this.findById(id);
    return this.prisma.publicFacility.delete({ where: { id } });
  }

  async getStatistics() {
    const [total, byType] = await Promise.all([
      this.prisma.publicFacility.count(),
      this.prisma.publicFacility.groupBy({
        by: ['type'],
        _count: true,
      }),
    ]);

    return {
      total,
      byType: byType.map((item) => ({
        type: item.type,
        count: item._count,
      })),
    };
  }
}
