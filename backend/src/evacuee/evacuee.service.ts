import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvacueeDto } from './dto/create-evacuee.dto';
import { UpdateEvacueeDto } from './dto/update-evacuee.dto';
import { EvacueeStatus, EvacuationLocationStatus } from '@prisma/client';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class EvacueeService {
  constructor(
    private prisma: PrismaService,
    private websocketService: WebsocketService,
  ) {}

  async create(dto: CreateEvacueeDto, userId: number) {
    // FIX: Use transaction to prevent race condition on capacity check
    // Serialize the capacity check and update to prevent overbooking
    const result = await this.prisma.$transaction(async (tx) => {
      // Lock the evacuation location row for update to prevent concurrent modifications
      const evacuationLocation = await tx.$queryRaw<{
        id: number;
        name: string;
        capacity: number;
        currentOccupancy: number;
        status: EvacuationLocationStatus;
      }[]>`
        SELECT id, name, capacity, "currentOccupancy", status
        FROM "EvacuationLocation"
        WHERE id = ${dto.evacuationLocationId}
        FOR UPDATE
      `;

      if (!evacuationLocation || evacuationLocation.length === 0) {
        throw new NotFoundException('EvacuationLocation tidak ditemukan');
      }

      const location = evacuationLocation[0];

      // Check capacity atomically with the lock held
      // (REMOVED: Dalam kondisi bencana, overcapacity sangat wajar dan tidak boleh diblokir oleh sistem)
      // if (location.currentOccupancy + dto.familySize > location.capacity) {
      //   throw new BadRequestException(...);
      // }

      // Create evacuee
      const evacuee = await tx.evacuee.create({
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

      const namedSum = await tx.evacuee.aggregate({
        _sum: { familySize: true },
        where: { evacuationLocationId: dto.evacuationLocationId, status: 'ACTIVE' }
      });
      const currentNamed = namedSum._sum.familySize || 0;
      
      const newOccupancy = Math.max(location.currentOccupancy, currentNamed);
      const newStatus = newOccupancy >= location.capacity ? 'UNAVAILABLE' : location.status;

      // Update evacuationLocation occupancy within the same transaction
      const updatedLocation = await tx.evacuationLocation.update({
        where: { id: dto.evacuationLocationId },
        data: {
          currentOccupancy: newOccupancy,
          status: newStatus,
        },
      });

      return { evacuee, updatedLocation };
    }, {
      isolationLevel: 'Serializable', // Highest isolation to prevent phantom reads
    });

    // Broadcast real-time update via WebSocket (outside transaction)
    this.websocketService.broadcastEvacueeCheckIn({
      evacueeId: result.evacuee.id,
      name: result.evacuee.name,
      evacuationLocationId: dto.evacuationLocationId,
      evacuationLocationName: result.evacuee.evacuationLocation.name,
      familySize: dto.familySize,
    });

    this.websocketService.broadcastEvacuationCapacityUpdate({
      id: result.updatedLocation.id,
      name: result.updatedLocation.name,
      currentOccupancy: result.updatedLocation.currentOccupancy,
      availableCapacity: result.updatedLocation.capacity - result.updatedLocation.currentOccupancy,
      totalCapacity: result.updatedLocation.capacity,
    });

    return result.evacuee;
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

    // FIX: Use transaction to prevent race condition on capacity check
    const result = await this.prisma.$transaction(async (tx) => {
      // If family size changed, update evacuationLocation occupancy
      if (dto.familySize && dto.familySize !== evacuee.familySize) {
        const difference = dto.familySize - evacuee.familySize;

        if (difference > 0) {
          // Lock the evacuation location row for update
          const evacuationLocation = await tx.$queryRaw<{
            id: number;
            name: string;
            capacity: number;
            currentOccupancy: number;
            status: EvacuationLocationStatus;
          }[]>`
            SELECT id, name, capacity, "currentOccupancy", status
            FROM "EvacuationLocation"
            WHERE id = ${evacuee.evacuationLocationId}
            FOR UPDATE
          `;

          if (evacuationLocation && evacuationLocation.length > 0) {
            // const location = evacuationLocation[0];
            // (REMOVED: Hard capacity check. Allow overbooking during emergencies)
          }
        }

          const evacuationLocation = await tx.$queryRaw<{
            id: number;
            name: string;
            capacity: number;
            currentOccupancy: number;
            status: EvacuationLocationStatus;
          }[]>`
            SELECT id, name, capacity, "currentOccupancy", status
            FROM "EvacuationLocation"
            WHERE id = ${evacuee.evacuationLocationId}
            FOR UPDATE
          `;
          const location = evacuationLocation[0];
          
          const namedSum = await tx.evacuee.aggregate({
            _sum: { familySize: true },
            where: { evacuationLocationId: evacuee.evacuationLocationId, status: 'ACTIVE' }
          });
          const currentNamed = (namedSum._sum.familySize || 0) + difference;
          
          let newOccupancy = location.currentOccupancy;
          if (difference > 0) {
            newOccupancy = Math.max(location.currentOccupancy, currentNamed);
          } else {
            newOccupancy = Math.max(0, location.currentOccupancy + difference);
          }
          
          const newStatus = newOccupancy >= location.capacity ? 'UNAVAILABLE' : (location.status === 'UNAVAILABLE' ? 'ACTIVE' : location.status);

          await tx.evacuationLocation.update({
            where: { id: evacuee.evacuationLocationId },
            data: {
              currentOccupancy: newOccupancy,
              status: newStatus,
            },
          });
      }

      // If status changed to RETURNED_HOME or RELOCATED, set checkOutDate
      if (dto.status && dto.status !== 'ACTIVE' && evacuee.status === 'ACTIVE') {
        dto.checkOutDate = dto.checkOutDate || new Date().toISOString();

        // Decrease evacuationLocation occupancy
        // Need to get the current capacity and occupancy first
        const evacuationLocation = await tx.$queryRaw<{
          capacity: number;
          currentOccupancy: number;
          status: EvacuationLocationStatus;
        }[]>`
          SELECT capacity, "currentOccupancy", status
          FROM "EvacuationLocation"
          WHERE id = ${evacuee.evacuationLocationId}
          FOR UPDATE
        `;
        const location = evacuationLocation[0];
        const newOccupancy = Math.max(0, location.currentOccupancy - evacuee.familySize);
        const newStatus = location.status === 'UNAVAILABLE' && newOccupancy < location.capacity ? 'ACTIVE' : location.status;

        const updatedLocation = await tx.evacuationLocation.update({
          where: { id: evacuee.evacuationLocationId },
          data: {
            currentOccupancy: newOccupancy,
            status: newStatus,
          },
        });

        // Broadcast real-time update via WebSocket
        this.websocketService.broadcastEvacueeCheckOut({
          evacueeId: evacuee.id,
          name: evacuee.name,
          evacuationLocationId: evacuee.evacuationLocationId,
          evacuationLocationName: evacuee.evacuationLocation.name,
          familySize: evacuee.familySize,
        });

        this.websocketService.broadcastEvacuationCapacityUpdate({
          id: updatedLocation.id,
          name: updatedLocation.name,
          currentOccupancy: updatedLocation.currentOccupancy,
          availableCapacity: updatedLocation.capacity - updatedLocation.currentOccupancy,
          totalCapacity: updatedLocation.capacity,
        });
      }

      return tx.evacuee.update({
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
    }, {
      isolationLevel: 'Serializable',
    });

    return result;
  }

  async delete(id: number) {
    const evacuee = await this.findOne(id);

    // FIX: Use transaction to ensure atomic occupancy decrement and delete
    // If evacuee is still active, decrease evacuationLocation occupancy
    if (evacuee.status === 'ACTIVE') {
      const result = await this.prisma.$transaction(async (tx) => {
        // Lock and update evacuation location
        const evacuationLocation = await tx.$queryRaw<{
          capacity: number;
          currentOccupancy: number;
          status: EvacuationLocationStatus;
        }[]>`
          SELECT capacity, "currentOccupancy", status
          FROM "EvacuationLocation"
          WHERE id = ${evacuee.evacuationLocationId}
          FOR UPDATE
        `;
        const location = evacuationLocation[0];
        const newOccupancy = Math.max(0, location.currentOccupancy - evacuee.familySize);
        const newStatus = location.status === 'UNAVAILABLE' && newOccupancy < location.capacity ? 'ACTIVE' : location.status;

        const updatedLocation = await tx.evacuationLocation.update({
          where: { id: evacuee.evacuationLocationId },
          data: {
            currentOccupancy: newOccupancy,
            status: newStatus,
          },
        });

        // Delete evacuee
        await tx.evacuee.delete({
          where: { id },
        });

        return updatedLocation;
      }, {
        isolationLevel: 'Serializable',
      });

      // Broadcast real-time update via WebSocket
      this.websocketService.broadcastEvacueeCheckOut({
        evacueeId: evacuee.id,
        name: evacuee.name,
        evacuationLocationId: evacuee.evacuationLocationId,
        evacuationLocationName: evacuee.evacuationLocation.name,
        familySize: evacuee.familySize,
      });

      this.websocketService.broadcastEvacuationCapacityUpdate({
        id: result.id,
        name: result.name,
        currentOccupancy: result.currentOccupancy,
        availableCapacity: result.capacity - result.currentOccupancy,
        totalCapacity: result.capacity,
      });
    } else {
      // Just delete without updating occupancy (already checked out)
      await this.prisma.evacuee.delete({
        where: { id },
      });
    }

    return { message: 'Evacuee deleted successfully' };
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
