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
    // Check if shelter exists and has capacity
    const shelter = await this.prisma.shelter.findUnique({
      where: { id: dto.shelterId },
    });

    if (!shelter) {
      throw new NotFoundException('Shelter tidak ditemukan');
    }

    if (shelter.currentOccupancy + dto.familySize > shelter.capacity) {
      throw new BadRequestException(
        `Kapasitas shelter tidak mencukupi. Tersisa: ${shelter.capacity - shelter.currentOccupancy} orang`,
      );
    }

    // Create evacuee
    const evacuee = await this.prisma.evacuee.create({
      data: {
        ...dto,
        registeredBy: userId,
      },
      include: {
        shelter: true,
        registeredByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Update shelter occupancy
    await this.prisma.shelter.update({
      where: { id: dto.shelterId },
      data: {
        currentOccupancy: {
          increment: dto.familySize,
        },
      },
    });

    return evacuee;
  }

  async findAll(shelterId?: number, status?: EvacueeStatus) {
    const where: any = {};

    if (shelterId) {
      where.shelterId = shelterId;
    }

    if (status) {
      where.status = status;
    }

    return this.prisma.evacuee.findMany({
      where,
      include: {
        shelter: {
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
        shelter: true,
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

    // If family size changed, update shelter occupancy
    if (dto.familySize && dto.familySize !== evacuee.familySize) {
      const difference = dto.familySize - evacuee.familySize;

      const shelter = await this.prisma.shelter.findUnique({
        where: { id: evacuee.shelterId },
      });

      if (
        difference > 0 &&
        shelter.currentOccupancy + difference > shelter.capacity
      ) {
        throw new BadRequestException(
          `Kapasitas shelter tidak mencukupi untuk menambah ${difference} orang`,
        );
      }

      await this.prisma.shelter.update({
        where: { id: evacuee.shelterId },
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

      // Decrease shelter occupancy
      await this.prisma.shelter.update({
        where: { id: evacuee.shelterId },
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
        shelter: true,
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

    // If evacuee is still active, decrease shelter occupancy
    if (evacuee.status === 'ACTIVE') {
      await this.prisma.shelter.update({
        where: { id: evacuee.shelterId },
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

  async getStatsByShelterId(shelterId: number) {
    const [total, active, relocated, returnedHome, byGender, byAgeGroup] =
      await Promise.all([
        this.prisma.evacuee.count({
          where: { shelterId },
        }),
        this.prisma.evacuee.count({
          where: { shelterId, status: 'ACTIVE' },
        }),
        this.prisma.evacuee.count({
          where: { shelterId, status: 'RELOCATED' },
        }),
        this.prisma.evacuee.count({
          where: { shelterId, status: 'RETURNED_HOME' },
        }),
        this.prisma.evacuee.groupBy({
          by: ['gender'],
          where: { shelterId, status: 'ACTIVE' },
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
          WHERE "shelterId" = ${shelterId} AND status = 'ACTIVE'
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
