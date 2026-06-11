import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEvacuationLocationDto } from './dto/create-evacuation-location.dto';
import { UpdateEvacuationLocationDto } from './dto/update-evacuation-location.dto';
import { RedisService } from '../redis/redis.service';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
  UserRole,
} from '@prisma/client';
import { WebsocketService } from '../websocket/websocket.service';

@Injectable()
export class EvacuationLocationService {
  constructor(
    private prisma: PrismaService,
    private websocketService: WebsocketService,
    private redisService: RedisService,
  ) {}

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

  async update(id: number, dto: UpdateEvacuationLocationDto) {
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
    const evacuationLocation = await this.findById(id);
    const updated = await this.prisma.evacuationLocation.update({
      where: { id },
      data: { currentOccupancy },
    });

    const inboundCount = await this.getInboundCount(id);

    // Broadcast capacity update via WebSocket
    this.websocketService.broadcastEvacuationCapacityUpdate({
      id: updated.id,
      name: updated.name,
      currentOccupancy: updated.currentOccupancy,
      availableCapacity: updated.capacity - updated.currentOccupancy - inboundCount,
      totalCapacity: updated.capacity,
    });

    return updated;
  }

  // 15% of capacity is reserved for walk-ins (people arriving without the system)
  private readonly SYSTEM_CAPACITY_RATIO = 0.85;

  getSystemCapacity(totalCapacity: number): number {
    return Math.floor(totalCapacity * this.SYSTEM_CAPACITY_RATIO);
  }

  async getInboundCount(id: number): Promise<number> {
    const cacheKey = `evacuation-location:${id}:inbound`;
    let inboundUsers = await this.redisService.getJson<{deviceId: string, timestamp: number, evacueeCount: number}[]>(cacheKey) || [];
    
    // Clean up old ones (45 mins timeout)
    const now = Date.now();
    const timeoutMs = 45 * 60 * 1000;
    const validUsers = inboundUsers.filter(u => now - u.timestamp < timeoutMs);
    
    if (validUsers.length !== inboundUsers.length) {
      await this.redisService.setJson(cacheKey, validUsers);
    }
    
    // Sum all evacuee counts (not just number of devices)
    return validUsers.reduce((sum, u) => sum + (u.evacueeCount || 1), 0);
  }

  async startNavigation(id: number, deviceId: string, evacueeCount: number = 1) {
    const shelter = await this.findById(id);
    const cacheKey = `evacuation-location:${id}:inbound`;
    let inboundUsers = await this.redisService.getJson<{deviceId: string, timestamp: number, evacueeCount: number}[]>(cacheKey) || [];
    
    const now = Date.now();
    const timeoutMs = 45 * 60 * 1000;
    inboundUsers = inboundUsers.filter(u => now - u.timestamp < timeoutMs);

    const existingIdx = inboundUsers.findIndex(u => u.deviceId === deviceId);
    if (existingIdx >= 0) {
      // Update existing booking
      inboundUsers[existingIdx].timestamp = now;
      inboundUsers[existingIdx].evacueeCount = evacueeCount;
    } else {
      // Check against system capacity (85% of total)
      const systemCapacity = this.getSystemCapacity(shelter.capacity);
      const currentInbound = inboundUsers.reduce((sum, u) => sum + (u.evacueeCount || 1), 0);
      const totalOccupied = shelter.currentOccupancy + currentInbound + evacueeCount;
      
      if (totalOccupied > systemCapacity) {
        throw new BadRequestException(
          `Kapasitas sistem untuk lokasi ini sudah penuh (${systemCapacity} dari ${shelter.capacity} total, 15% dicadangkan untuk kedatangan langsung). Silakan pilih lokasi evakuasi lain.`
        );
      }
      inboundUsers.push({ deviceId, timestamp: now, evacueeCount });
    }

    await this.redisService.setJson(cacheKey, inboundUsers);

    const totalInbound = inboundUsers.reduce((sum, u) => sum + (u.evacueeCount || 1), 0);
    const systemCapacity = this.getSystemCapacity(shelter.capacity);

    this.websocketService.broadcastEvacuationCapacityUpdate({
      id: shelter.id,
      name: shelter.name,
      currentOccupancy: shelter.currentOccupancy,
      availableCapacity: systemCapacity - shelter.currentOccupancy - totalInbound,
      totalCapacity: shelter.capacity,
    });

    return { success: true, inboundCount: totalInbound, systemCapacity };
  }

  async stopNavigation(id: number, deviceId: string) {
    const cacheKey = `evacuation-location:${id}:inbound`;
    let inboundUsers = await this.redisService.getJson<{deviceId: string, timestamp: number, evacueeCount: number}[]>(cacheKey) || [];
    
    const initialLength = inboundUsers.length;
    inboundUsers = inboundUsers.filter(u => u.deviceId !== deviceId);
    
    if (inboundUsers.length !== initialLength) {
      await this.redisService.setJson(cacheKey, inboundUsers);
      
      const shelter = await this.findById(id);
      const totalInbound = inboundUsers.reduce((sum, u) => sum + (u.evacueeCount || 1), 0);
      const systemCapacity = this.getSystemCapacity(shelter.capacity);

      this.websocketService.broadcastEvacuationCapacityUpdate({
        id: shelter.id,
        name: shelter.name,
        currentOccupancy: shelter.currentOccupancy,
        availableCapacity: systemCapacity - shelter.currentOccupancy - totalInbound,
        totalCapacity: shelter.capacity,
      });
    }
    return { success: true };
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

    const results = await Promise.all(evacuationLocations.map(async (evacuationLocation) => {
      const inboundCount = await this.getInboundCount(evacuationLocation.id);
      const systemCapacity = this.getSystemCapacity(evacuationLocation.capacity);
      return {
        ...evacuationLocation,
        distanceKm: Math.round((evacuationLocation.distance / 1000) * 100) / 100,
        inboundCount,
        systemCapacity,
        availableCapacity:
          systemCapacity -
          (evacuationLocation.currentOccupancy || 0) - inboundCount,
      };
    }));
    
    // Return all locations so they are visible on the map, even if full
    // The frontend map handles the full status visually and ignores them for auto-routing
    return results;
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
