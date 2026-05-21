import { Injectable } from '@nestjs/common';
import {
  Prisma,
  EvacuationLocationCategory,
  EvacuationLocationCondition,
  EvacuationLocationStatus,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

export type NearbyEvacuationLocation = {
  id: number;
  name: string;
  category: EvacuationLocationCategory;
  capacity: number;
  currentOccupancy: number;
  geometry: Prisma.JsonValue;
  address: string | null;
  condition: EvacuationLocationCondition;
  status: EvacuationLocationStatus;
  facilities: string | null;
  officerId: number | null;
  createdAt: Date;
  updatedAt: Date;
  distanceMeters: number;
};

@Injectable()
export class EvacuationLocationRepository {
  constructor(private readonly prisma: PrismaService) {}

  findNearby(params: {
    lat: number;
    lng: number;
    radiusMeters: number;
    limit: number;
  }) {
    const { lat, lng, radiusMeters, limit } = params;

    return this.prisma.$queryRaw<NearbyEvacuationLocation[]>`
      WITH user_point AS (
        SELECT ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326) AS geom
      )
      SELECT
        s.id,
        s.name,
        s.category,
        s.capacity,
        s."currentOccupancy",
        s.geometry,
        s.address,
        s.condition,
        s.status,
        s.facilities,
        s."officerId",
        s."createdAt",
        s."updatedAt",
        ST_Distance(s.geom::geography, user_point.geom::geography) AS "distanceMeters"
      FROM "EvacuationLocation" s
      CROSS JOIN user_point
      WHERE
        s.geom IS NOT NULL
        AND s.status = 'ACTIVE'::"EvacuationLocationStatus"
        AND ST_DWithin(s.geom::geography, user_point.geom::geography, ${radiusMeters})
      ORDER BY s.geom <-> user_point.geom
      LIMIT ${limit}
    `;
  }
}
