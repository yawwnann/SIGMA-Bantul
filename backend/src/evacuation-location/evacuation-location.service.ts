import { BadRequestException, Injectable } from '@nestjs/common';
import { EvacuationLocationRepository } from './evacuation-location.repository';

const DEFAULT_RADIUS_KM = 23;
const MAX_RADIUS_KM = 50;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

@Injectable()
export class EvacuationLocationService {
  constructor(private readonly repository: EvacuationLocationRepository) {}

  async findNearby(query: {
    lat: number;
    lng: number;
    radius?: number;
    limit?: number;
  }) {
    const lat = Number(query.lat);
    const lng = Number(query.lng);

    if (!Number.isFinite(lat) || lat < -90 || lat > 90) {
      throw new BadRequestException('lat harus berupa angka antara -90 dan 90');
    }

    if (!Number.isFinite(lng) || lng < -180 || lng > 180) {
      throw new BadRequestException(
        'lng harus berupa angka antara -180 dan 180',
      );
    }

    const radiusKm = Math.min(
      Math.max(Number(query.radius ?? DEFAULT_RADIUS_KM), 0.1),
      MAX_RADIUS_KM,
    );
    const limit = Math.min(
      Math.max(Math.trunc(Number(query.limit ?? DEFAULT_LIMIT)), 1),
      MAX_LIMIT,
    );

    const rows = await this.repository.findNearby({
      lat,
      lng,
      radiusMeters: radiusKm * 1000,
      limit,
    });

    return {
      data: rows.map((row) => ({
        ...row,
        distanceMeters: Math.round(Number(row.distanceMeters)),
        distanceKm: Number((Number(row.distanceMeters) / 1000).toFixed(2)),
      })),
      meta: {
        lat,
        lng,
        radiusKm,
        limit,
        count: rows.length,
      },
    };
  }
}
