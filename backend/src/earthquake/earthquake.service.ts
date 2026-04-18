import { HttpService } from '@nestjs/axios';
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { EarthquakeGateway } from './earthquake.gateway';
import { Earthquake } from '@prisma/client';
import { CreateEarthquakeDto } from './dto/create-earthquake.dto';

export interface BMKGAutoGempa {
  Tanggal: string;
  Jam: string;
  DateTime: string;
  Coordinates: string;
  Lintang: string;
  Bujur: string;
  Magnitude: string;
  Kedalaman: string;
  Wilayah: string;
  Potensi: string;
  Felt: string;
  Shaking: string;
  ShakemapUrl: string;
}

export interface BMKGGempaItem {
  DateTime: string;
  Lat: string;
  Lon: string;
  Magnitude: string;
  Depth: string;
  Coordinates: string;
  Location: string;
  Region: string;
  Felt: string;
  Shaking: string;
}

@Injectable()
export class EarthquakeService {
  private readonly logger = new Logger(EarthquakeService.name);

  constructor(
    private httpService: HttpService,
    private prisma: PrismaService,
    private redis: RedisService,
    private earthquakeGateway: EarthquakeGateway,
    private configService: ConfigService,
  ) {}

  private getBMKGUrl(endpoint: string): string {
    const baseUrl =
      this.configService.get<string>('BMKG_BASE_URL') ||
      'https://data.bmkg.go.id/DataMKG/TEWS';
    return `${baseUrl}/${endpoint}`;
  }

  @Cron(CronExpression.EVERY_5_MINUTES)
  async syncFromBMKG() {
    this.logger.log('Starting BMKG earthquake sync...');

    try {
      await Promise.all([
        this.syncLatestEarthquake(),
        this.syncMagnitudeEarthquakes(),
        this.syncFeltEarthquakes(),
      ]);

      this.logger.log('BMKG sync completed');
    } catch (error) {
      if (error instanceof Error) {
        this.logger.error('Failed to sync from BMKG:', error.message);
      } else {
        this.logger.error('Failed to sync from BMKG:', String(error));
      }
    }
  }

  private async syncLatestEarthquake() {
    const url = this.getBMKGUrl('autogempa.json');
    const response = await this.httpService
      .get<{ Infogempa?: { gempa?: BMKGAutoGempa } }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Infogempa?.gempa) {
      this.logger.warn('No latest earthquake data from BMKG');
      return;
    }

    const eq: BMKGAutoGempa = data.Infogempa.gempa;
    await this.upsertAutoGempa(eq);

    await this.redis.setJson('bmkg:latest', eq, 300);
    this.earthquakeGateway.broadcastLatestEarthquake(eq);

    this.logger.log('Synced latest earthquake from autogempa.json');
  }

  private async syncMagnitudeEarthquakes() {
    const url = this.getBMKGUrl('gempaterkini.json');
    const response = await this.httpService
      .get<{ Infogempa?: { gempa?: BMKGAutoGempa | BMKGAutoGempa[] } }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Infogempa?.gempa) {
      this.logger.warn('No magnitude earthquake data from BMKG');
      return;
    }

    const earthquakes = Array.isArray(data.Infogempa.gempa)
      ? data.Infogempa.gempa
      : [data.Infogempa.gempa];

    for (const eq of earthquakes) {
      await this.upsertGempaTerbaru(eq);
    }

    await this.redis.setJson('bmkg:magnitude', earthquakes, 300);
    this.logger.log(`Synced ${earthquakes.length} magnitude earthquakes`);
  }

  private async syncFeltEarthquakes() {
    const url = this.getBMKGUrl('gempadirasakan.json');
    const response = await this.httpService
      .get<{
        Earthquakes?: { Earthquake?: BMKGGempaItem | BMKGGempaItem[] };
      }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Earthquakes?.Earthquake) {
      this.logger.warn('No felt earthquake data from BMKG');
      return;
    }

    const earthquakes: BMKGGempaItem[] = Array.isArray(
      data.Earthquakes.Earthquake,
    )
      ? data.Earthquakes.Earthquake
      : [data.Earthquakes.Earthquake];

    for (const eq of earthquakes) {
      await this.upsertEarthquake(eq);
    }

    await this.redis.setJson('bmkg:felt', earthquakes, 300);
    this.logger.log(`Synced ${earthquakes.length} felt earthquakes`);
  }

  private async upsertAutoGempa(data: BMKGAutoGempa) {
    const coords = this.parseCoordinates(data.Coordinates);
    const dateTimeStr = data.DateTime || `${data.Tanggal} ${data.Jam}`;

    const existing = await this.prisma.earthquake.findFirst({
      where: { bmkgId: `auto_${data.DateTime}` },
    });

    const eqData = {
      bmkgId: `auto_${data.DateTime}`,
      magnitude: parseFloat(data.Magnitude),
      depth: parseFloat(data.Kedalaman.replace(' km', '')),
      lat: coords.lat,
      lon: coords.lon,
      location: data.Wilayah,
      region: data.Wilayah,
      time: new Date(dateTimeStr),
      dirasakan: data.Felt || null,
      potential: data.Potensi || null,
      shakemapUrl: data.ShakemapUrl || null,
      isLatest: true,
    };

    let currentId = existing?.id;

    if (existing) {
      await this.prisma.earthquake.update({
        where: { id: existing.id },
        data: eqData,
      });
    } else {
      const newEq = await this.prisma.earthquake.create({ data: eqData });
      currentId = newEq.id;
    }

    if (currentId) {
      await this.prisma.earthquake.updateMany({
        where: { NOT: { id: currentId } },
        data: { isLatest: false },
      });
    }
  }

  private async upsertGempaTerbaru(data: BMKGAutoGempa) {
    const coords = this.parseCoordinates(data.Coordinates);
    const dateTimeStr = data.DateTime || `${data.Tanggal} ${data.Jam}`;

    const existing = await this.prisma.earthquake.findFirst({
      where: { bmkgId: `mag_${data.DateTime}` },
    });

    const eqData = {
      bmkgId: `mag_${data.DateTime}`,
      magnitude: parseFloat(data.Magnitude),
      depth: parseFloat(data.Kedalaman.replace(' km', '')),
      lat: coords.lat,
      lon: coords.lon,
      location: data.Wilayah,
      region: data.Wilayah,
      time: new Date(dateTimeStr),
      dirasakan: data.Felt || null,
    };

    if (existing) {
      await this.prisma.earthquake.update({
        where: { id: existing.id },
        data: eqData,
      });
    } else {
      await this.prisma.earthquake.create({ data: eqData });
    }
  }

  private async upsertEarthquake(data: BMKGGempaItem) {
    const existing = await this.prisma.earthquake.findFirst({
      where: {
        lat: parseFloat(data.Lat),
        lon: parseFloat(data.Lon),
        time: new Date(data.DateTime),
      },
    });

    const eqData = {
      magnitude: parseFloat(data.Magnitude),
      depth: parseFloat(data.Depth),
      lat: parseFloat(data.Lat),
      lon: parseFloat(data.Lon),
      location: data.Location || data.Coordinates,
      region: data.Region,
      time: new Date(data.DateTime),
      dirasakan: data.Felt || null,
    };

    if (existing) {
      await this.prisma.earthquake.update({
        where: { id: existing.id },
        data: eqData,
      });
    } else {
      await this.prisma.earthquake.create({
        data: { ...eqData, isLatest: false },
      });
    }
  }

  private parseCoordinates(coordsStr: string): { lat: number; lon: number } {
    if (!coordsStr) return { lat: 0, lon: 0 };

    const parts = coordsStr.split(',');
    if (parts.length >= 2) {
      return {
        lat: parseFloat(parts[0].trim()),
        lon: parseFloat(parts[1].trim()),
      };
    }
    return { lat: 0, lon: 0 };
  }

  async fetchLatestFromBMKG() {
    const cached = await this.redis.getJson<BMKGAutoGempa>('bmkg:latest');
    if (cached) return cached;

    const url = this.getBMKGUrl('autogempa.json');
    const response = await this.httpService
      .get<{ Infogempa?: { gempa?: BMKGAutoGempa } }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Infogempa?.gempa) {
      return null;
    }

    return data.Infogempa.gempa;
  }

  async fetchMagnitudeEarthquakes() {
    const cached = await this.redis.getJson<BMKGAutoGempa[]>('bmkg:magnitude');
    if (cached) return cached;

    const url = this.getBMKGUrl('gempaterkini.json');
    const response = await this.httpService
      .get<{ Infogempa?: { gempa?: BMKGAutoGempa | BMKGAutoGempa[] } }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Infogempa?.gempa) {
      return [];
    }

    const earthquakes = Array.isArray(data.Infogempa.gempa)
      ? data.Infogempa.gempa
      : [data.Infogempa.gempa];

    return earthquakes;
  }

  async fetchFeltEarthquakes() {
    const cached = await this.redis.getJson<BMKGGempaItem[]>('bmkg:felt');
    if (cached) return cached;

    const url = this.getBMKGUrl('gempadirasakan.json');
    const response = await this.httpService
      .get<{
        Earthquakes?: { Earthquake?: BMKGGempaItem | BMKGGempaItem[] };
      }>(url)
      .toPromise();
    const data = response?.data;

    if (!data?.Earthquakes?.Earthquake) {
      return [];
    }

    const earthquakes: BMKGGempaItem[] = Array.isArray(
      data.Earthquakes.Earthquake,
    )
      ? data.Earthquakes.Earthquake
      : [data.Earthquakes.Earthquake];

    return earthquakes;
  }

  async getLatest() {
    const cached = await this.redis.getJson<Earthquake>('bmkg:latest');
    if (cached) return cached;

    const latest = await this.prisma.earthquake.findFirst({
      where: { isLatest: true },
      orderBy: { time: 'desc' },
    });

    if (latest) {
      await this.redis.setJson('bmkg:latest', latest, 300);
    }

    return latest;
  }

  async getAll(params: {
    page?: number;
    limit?: number;
    startDate?: string;
    endDate?: string;
    region?: string;
  }) {
    const { page = 1, limit = 20, startDate, endDate, region } = params;
    const skip = (page - 1) * limit;

    const where: Record<string, any> = {};
    if (startDate || endDate) {
      const timeFilter: { gte?: Date; lte?: Date } = {};
      where.time = timeFilter;
      if (startDate) timeFilter.gte = new Date(startDate);
      if (endDate) timeFilter.lte = new Date(endDate);
    }
    
    if (region) {
      where.OR = [
        { location: { contains: region, mode: 'insensitive' } },
        { region: { contains: region, mode: 'insensitive' } },
      ];
    }

    const [earthquakes, total] = await Promise.all([
      this.prisma.earthquake.findMany({
        where,
        orderBy: { time: 'desc' },
        skip,
        take: limit,
      }),
      this.prisma.earthquake.count({ where }),
    ]);

    return {
      data: earthquakes,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async create(dto: CreateEarthquakeDto) {
    return this.prisma.earthquake.create({
      data: {
        ...dto,
        time: new Date(dto.time),
      },
    });
  }

  async findById(id: number) {
    return this.prisma.earthquake.findUnique({ where: { id } });
  }

  async delete(id: number) {
    return this.prisma.earthquake.delete({ where: { id } });
  }

  async getStatistics() {
    const [total, avgMagnitude, latestEarthquake, recentCount] =
      await Promise.all([
        this.prisma.earthquake.count(),
        this.prisma.earthquake.aggregate({ _avg: { magnitude: true } }),
        this.prisma.earthquake.findFirst({ orderBy: { time: 'desc' } }),
        this.prisma.earthquake.count({
          where: {
            time: {
              gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
            },
          },
        }),
      ]);

    return {
      totalEarthquakes: total,
      averageMagnitude: avgMagnitude._avg.magnitude || 0,
      lastEarthquake: latestEarthquake,
      earthquakesLast30Days: recentCount,
    };
  }
}
