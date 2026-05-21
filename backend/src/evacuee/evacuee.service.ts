import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvacueeDto } from './dto/create-evacuee.dto';
import { UpdateEvacueeDto } from './dto/update-evacuee.dto';
import { EvacueeStatus } from '@prisma/client';

@Injectable()
export class EvacueeService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateEvacueeDto, userId: number) {
    // Check if evacuationLocation exists and has capacity
    const evacuationLocation = await this.prisma.evacuationLocation.findUnique({
      where: { id: dto.evacuationLocationId },
    });

    if (!evacuationLocation) {
      throw new NotFoundException('EvacuationLocation tidak ditemukan');
    }

    if (
      evacuationLocation.currentOccupancy + dto.familySize >
      evacuationLocation.capacity
    ) {
      throw new BadRequestException(
        `Kapasitas evacuationLocation tidak mencukupi. Tersisa: ${evacuationLocation.capacity - evacuationLocation.currentOccupancy} orang`,
      );
    }

    // Create evacuee
    const evacuee = await this.prisma.evacuee.create({
      data: {
        ...dto,
        registeredBy: userId,
      },
      include: {
        evacuationLocation: true,
        registeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update evacuationLocation occupancy
    await this.prisma.evacuationLocation.update({
      where: { id: dto.evacuationLocationId },
      data: {
        currentOccupancy: {
          increment: dto.familySize,
        },
      },
    });

    return evacuee;
  }

  async findAll(evacuationLocationId?: number, status?: EvacueeStatus) {
    const where: any = {};

    if (evacuationLocationId) {
      where.evacuationLocationId = evacuationLocationId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.evacuee.findMany({
      where,
      include: {
        evacuationLocation: {
          select: {
            id: true,
            name: true,
            address: true,
          },
        },
        registeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: {
        checkInDate: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const evacuee = await this.prisma.evacuee.findUnique({
      where: { id },
      include: {
        evacuationLocation: true,
        registeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (!evacuee) {
      throw new NotFoundException('Data pengungsi tidak ditemukan');
    }

    return evacuee;
  }

  async update(id: number, dto: UpdateEvacueeDto) {
    const evacuee = await this.findOne(id);

    // If family size changed, update evacuationLocation occupancy
    if (dto.familySize && dto.familySize !== evacuee.familySize) {
      const difference = dto.familySize - evacuee.familySize;

      const evacuationLocation =
        await this.prisma.evacuationLocation.findUnique({
          where: { id: evacuee.evacuationLocationId },
        });

      if (
        difference > 0 &&
        evacuationLocation.currentOccupancy + difference >
          evacuationLocation.capacity
      ) {
        throw new BadRequestException(
          `Kapasitas evacuationLocation tidak mencukupi untuk menambah ${difference} orang`,
        );
      }

      await this.prisma.evacuationLocation.update({
        where: { id: evacuee.evacuationLocationId },
        data: {
          currentOccupancy: {
            increment: difference,
          },
        },
      });
    }

    // If status changed to RETURNED_HOME or RELOCATED, set checkOutDate
    if (dto.status && dto.status !== 'ACTIVE' && evacuee.status === 'ACTIVE') {
      dto.checkOutDate = dto.checkOutDate || new Date().toISOString();

      // Decrease evacuationLocation occupancy
      await this.prisma.evacuationLocation.update({
        where: { id: evacuee.evacuationLocationId },
        data: {
          currentOccupancy: {
            decrement: evacuee.familySize,
          },
        },
      });
    }

    return this.prisma.evacuee.update({
      where: { id },
      data: dto,
      include: {
        evacuationLocation: true,
        registeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }

  async delete(id: number) {
    const evacuee = await this.findOne(id);

    // If evacuee is still active, decrease evacuationLocation occupancy
    if (evacuee.status === 'ACTIVE') {
      await this.prisma.evacuationLocation.update({
        where: { id: evacuee.evacuationLocationId },
        data: {
          currentOccupancy: {
            decrement: evacuee.familySize,
          },
        },
      });
    }

    return this.prisma.evacuee.delete({
      where: { id },
    });
  }

  async getStatsByEvacuationLocationId(evacuationLocationId: number) {
    const [total, active, relocated, returnedHome, byGender, byAgeGroup] =
      await Promise.all([
        this.prisma.evacuee.count({
          where: { evacuationLocationId },
        }),
        this.prisma.evacuee.count({
          where: { evacuationLocationId, status: 'ACTIVE' },
        }),
        this.prisma.evacuee.count({
          where: { evacuationLocationId, status: 'RELOCATED' },
        }),
        this.prisma.evacuee.count({
          where: { evacuationLocationId, status: 'RETURNED_HOME' },
        }),
        this.prisma.evacuee.groupBy({
          by: ['gender'],
          where: { evacuationLocationId, status: 'ACTIVE' },
          _count: true,
        }),
        this.prisma.$queryRaw`
          SELECT 
            CASE 
              WHEN age < 5 THEN '0-4'
              WHEN age < 18 THEN '5-17'
              WHEN age < 60 THEN '18-59'
              ELSE '60+'
            END as age_group,
            COUNT(*) as count
          FROM "Evacuee"
          WHERE "evacuationLocationId" = ${evacuationLocationId} AND status = 'ACTIVE'
          GROUP BY age_group
          ORDER BY age_group
        `,
      ]);

    return {
      total,
      active,
      relocated,
      returnedHome,
      byGender,
      byAgeGroup,
    };
  }
}
