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
import { ShelterStatus } from '@prisma/client';

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
        role: UserRole.SHELTER_OFFICER,
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
      where: { role: UserRole.SHELTER_OFFICER },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        managedShelters: {
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
      where: { id, role: UserRole.SHELTER_OFFICER },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        managedShelters: {
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

    // Unassign all shelters first
    await this.prisma.shelter.updateMany({
      where: { officerId: id },
      data: { officerId: null },
    });

    return this.prisma.user.delete({ where: { id } });
  }

  async getOfficerStatistics(id: number) {
    await this.findOfficerById(id);

    const shelters = await this.prisma.shelter.findMany({
      where: { officerId: id },
    });

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = shelters.reduce(
      (sum, s) => sum + s.currentOccupancy,
      0,
    );

    return {
      totalShelters: shelters.length,
      totalCapacity,
      totalOccupancy,
      occupancyRate: totalCapacity > 0 ? totalOccupancy / totalCapacity : 0,
    };
  }

  async validateOfficerOwnership(
    shelterId: number,
    officerId: number,
  ): Promise<boolean> {
    const shelter = await this.prisma.shelter.findFirst({
      where: { id: shelterId, officerId },
    });
    return !!shelter;
  }

  async updateOccupancyByOfficer(
    shelterId: number,
    occupancy: number,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(shelterId, officerId);
    if (!isOwner) {
      throw new BadRequestException('Anda tidak memiliki akses ke shelter ini');
    }

    const shelter = await this.prisma.shelter.findUnique({
      where: { id: shelterId },
    });
    if (!shelter) throw new NotFoundException('Shelter tidak ditemukan');

    if (occupancy < 0) {
      throw new BadRequestException('Jumlah penghuni tidak boleh negatif');
    }
    if (occupancy > shelter.capacity) {
      throw new BadRequestException(
        'Jumlah penghuni melebihi kapasitas shelter',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shelter.update({
        where: { id: shelterId },
        data: { currentOccupancy: occupancy },
      });

      await tx.shelterLog.create({
        data: {
          shelterId,
          officerId,
          action: 'UPDATE_OCCUPANCY',
          changes: { old: shelter.currentOccupancy, new: occupancy },
        },
      });

      return updated;
    });
  }

  async updateConditionByOfficer(
    shelterId: number,
    condition: string,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(shelterId, officerId);
    if (!isOwner) {
      throw new BadRequestException('Anda tidak memiliki akses ke shelter ini');
    }

    const validConditions = ['GOOD', 'MODERATE', 'NEEDS_REPAIR', 'DAMAGED'];
    if (!validConditions.includes(condition)) {
      throw new BadRequestException('Kondisi shelter tidak valid');
    }

    const shelter = await this.prisma.shelter.findUnique({
      where: { id: shelterId },
    });
    if (!shelter) throw new NotFoundException('Shelter tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shelter.update({
        where: { id: shelterId },
        data: { condition: condition as any },
      });

      await tx.shelterLog.create({
        data: {
          shelterId,
          officerId,
          action: 'UPDATE_CONDITION',
          changes: { old: shelter.condition, new: condition },
        },
      });

      return updated;
    });
  }

  async updateStatusByOfficer(
    shelterId: number,
    status: ShelterStatus,
    officerId: number,
  ) {
    const isOwner = await this.validateOfficerOwnership(shelterId, officerId);
    if (!isOwner) {
      throw new BadRequestException('Anda tidak memiliki akses ke shelter ini');
    }

    const shelter = await this.prisma.shelter.findUnique({
      where: { id: shelterId },
    });
    if (!shelter) throw new NotFoundException('Shelter tidak ditemukan');

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.shelter.update({
        where: { id: shelterId },
        data: { status },
      });

      await tx.shelterLog.create({
        data: {
          shelterId,
          officerId,
          action: 'UPDATE_STATUS',
          changes: { old: shelter.status, new: status },
        },
      });

      return updated;
    });
  }

  async getOfficerDashboard(officerId: number) {
    const officer = await this.prisma.user.findFirst({
      where: {
        id: officerId,
        role: UserRole.SHELTER_OFFICER,
      },
      select: { id: true, name: true, email: true, role: true },
    });

    if (!officer) {
      throw new NotFoundException(
        'Petugas tidak ditemukan atau bukan SHELTER_OFFICER',
      );
    }

    const shelters = await this.prisma.shelter.findMany({
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

    const totalCapacity = shelters.reduce((sum, s) => sum + s.capacity, 0);
    const totalOccupancy = shelters.reduce(
      (sum, s) => sum + s.currentOccupancy,
      0,
    );

    return {
      officer,
      shelters,
      statistics: {
        totalShelters: shelters.length,
        totalCapacity,
        totalOccupancy,
        occupancyRate: totalCapacity > 0 ? totalOccupancy / totalCapacity : 0,
      },
    };
  }
}
