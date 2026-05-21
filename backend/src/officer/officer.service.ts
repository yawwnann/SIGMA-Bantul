import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { UserRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import {
  EvacuationLocationStatus,
  EvacuationLocationCondition,
} from '@prisma/client';

@Injectable()
export class OfficerService {
  constructor(private prisma: PrismaService) {}

  async createOfficer(dto: CreateOfficerDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email sudah digunakan');
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
        role: UserRole.EVACUATION_LOCATION_OFFICER,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
      },
    });

    return user;
  }

  async findAllOfficers() {
    return this.prisma.user.findMany({
      where: { role: UserRole.EVACUATION_LOCATION_OFFICER },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        managedEvacuationLocations: {
          select: {
            id: true,
            name: true,
            address: true,
            condition: true,
            capacity: true,
            currentOccupancy: true,
          },
        },
      },
    });
  }

  async findOfficerById(id: number) {
    const officer = await this.prisma.user.findFirst({
      where: { id, role: UserRole.EVACUATION_LOCATION_OFFICER },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        managedEvacuationLocations: {
          select: {
            id: true,
            name: true,
            address: true,
            condition: true,
            capacity: true,
            currentOccupancy: true,
            geometry: true,
          },
        },
      },
    });

    if (!officer) {
      throw new NotFoundException(`Petugas dengan ID ${id} tidak ditemukan`);
    }

    return officer;
  }

  async updateOfficer(id: number, dto: UpdateOfficerDto) {
    await this.findOfficerById(id);

    const data: Record<string, unknown> = {};
    if (dto.name) data.name = dto.name;
    if (dto.password) data.password = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        updatedAt: true,
      },
    });
  }

  async deleteOfficer(id: number) {
    await this.findOfficerById(id);

    // Unassign all evacuationLocations first
    await this.prisma.evacuationLocation.updateMany({
      where: { officerId: id },
      data: { officerId: null },
    });

    return this.prisma.user.delete({ where: { id } });
  }

  async getOfficerStatistics(id: number) {
    await this.findOfficerById(id);

    const evacuationLocations = await this.prisma.evacuationLocation.findMany({
      where: { officerId: id },
    });

    const totalCapacity = evacuationLocations.reduce(
      (sum, s) => sum + s.capacity,
      0,
    );
    const totalOccupancy = evacuationLocations.reduce(
      (sum, s) => sum + s.currentOccupancy,
      0,
    );

    return {
      totalEvacuationLocations: evacuationLocations.length,
      totalCapacity,
      totalOccupancy,
      occupancyRate: totalCapacity > 0 ? totalOccupancy / totalCapacity : 0,
    };
  }

  async validateOfficerOwnership(
    evacuationLocationId: number,
    officerId: number,
  ): Promise<boolean> {
    const evacuationLocation = await this.prisma.evacuationLocation.findFirst({
      where: { id: evacuationLocationId, officerId },
    });
    return !!evacuationLocation;
  }

  async updateOccupancyByOfficer(
    evacuationLocationId: number,
    occupancy: number,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(
      evacuationLocationId,
      officerId,
    );
    if (!isOwner) {
      throw new BadRequestException(
        'Anda tidak memiliki akses ke evacuationLocation ini',
      );
    }

    const evacuationLocation = await this.prisma.evacuationLocation.findUnique({
      where: { id: evacuationLocationId },
    });
    if (!evacuationLocation)
      throw new NotFoundException('EvacuationLocation tidak ditemukan');

    if (occupancy < 0) {
      throw new BadRequestException('Jumlah penghuni tidak boleh negatif');
    }
    if (occupancy > evacuationLocation.capacity) {
      throw new BadRequestException(
        'Jumlah penghuni melebihi kapasitas evacuationLocation',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evacuationLocation.update({
        where: { id: evacuationLocationId },
        data: { currentOccupancy: occupancy },
      });

      await tx.evacuationLocationLog.create({
        data: {
          evacuationLocationId,
          officerId,
          action: 'UPDATE_OCCUPANCY',
          changes: { old: evacuationLocation.currentOccupancy, new: occupancy },
        },
      });

      return updated;
    });
  }

  async updateConditionByOfficer(
    evacuationLocationId: number,
    condition: string,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(
      evacuationLocationId,
      officerId,
    );
    if (!isOwner) {
      throw new BadRequestException(
        'Anda tidak memiliki akses ke evacuationLocation ini',
      );
    }

    const validConditions = ['GOOD', 'MODERATE', 'NEEDS_REPAIR', 'DAMAGED'];
    if (!validConditions.includes(condition)) {
      throw new BadRequestException('Kondisi evacuationLocation tidak valid');
    }

    const evacuationLocation = await this.prisma.evacuationLocation.findUnique({
      where: { id: evacuationLocationId },
    });
    if (!evacuationLocation)
      throw new NotFoundException('EvacuationLocation tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evacuationLocation.update({
        where: { id: evacuationLocationId },
        data: { condition: condition as EvacuationLocationCondition },
      });

      await tx.evacuationLocationLog.create({
        data: {
          evacuationLocationId,
          officerId,
          action: 'UPDATE_CONDITION',
          changes: { old: evacuationLocation.condition, new: condition },
        },
      });

      return updated;
    });
  }

  async updateStatusByOfficer(
    evacuationLocationId: number,
    status: EvacuationLocationStatus,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(
      evacuationLocationId,
      officerId,
    );
    if (!isOwner) {
      throw new BadRequestException(
        'Anda tidak memiliki akses ke evacuationLocation ini',
      );
    }

    const evacuationLocation = await this.prisma.evacuationLocation.findUnique({
      where: { id: evacuationLocationId },
    });
    if (!evacuationLocation)
      throw new NotFoundException('EvacuationLocation tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evacuationLocation.update({
        where: { id: evacuationLocationId },
        data: { status },
      });

      await tx.evacuationLocationLog.create({
        data: {
          evacuationLocationId,
          officerId,
          action: 'UPDATE_STATUS',
          changes: { old: evacuationLocation.status, new: status },
        },
      });

      return updated;
    });
  }

  async getOfficerDashboard(officerId: number) {
    const officer = await this.prisma.user.findFirst({
      where: {
        id: officerId,
        role: UserRole.EVACUATION_LOCATION_OFFICER,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!officer) {
      throw new NotFoundException(
        'Petugas tidak ditemukan atau bukan EVACUATION_LOCATION_OFFICER',
      );
    }

    const evacuationLocations = await this.prisma.evacuationLocation.findMany({
      where: { officerId },
      select: {
        id: true,
        name: true,
        address: true,
        capacity: true,
        currentOccupancy: true,
        condition: true,
        status: true,
        geometry: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalCapacity = evacuationLocations.reduce(
      (sum, s) => sum + s.capacity,
      0,
    );
    const totalOccupancy = evacuationLocations.reduce(
      (sum, s) => sum + s.currentOccupancy,
      0,
    );

    return {
      officer,
      evacuationLocations,
      statistics: {
        totalEvacuationLocations: evacuationLocations.length,
        totalCapacity,
        totalOccupancy,
        occupancyRate: totalCapacity > 0 ? totalOccupancy / totalCapacity : 0,
      },
    };
  }
}
