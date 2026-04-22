import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
  ParseFloatPipe,
} from '@nestjs/common';
import { RoadService } from './road.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateRoadDto } from './dto/create-road.dto';
import { RoadCondition, RoadType } from '@prisma/client';

@Controller('roads')
export class RoadController {
  constructor(private roadService: RoadService) {}

  @Get()
  async findAll(
    @Query('page', new ParseIntPipe({ optional: true })) page?: number,
    @Query('limit', new ParseIntPipe({ optional: true })) limit?: number,
    @Query('condition') condition?: RoadCondition | 'all',
    @Query('type') type?: RoadType | 'all',
    @Query('search') search?: string,
  ) {
    return this.roadService.findAll({
      condition,
      type,
      page: isNaN(page) ? parseInt(page as any) || 1 : page,
      limit: isNaN(limit) ? parseInt(limit as any) || 20 : limit,
      search,
    });
  }

  @Get('statistics')
  async getStatistics() {
    return this.roadService.getStatistics();
  }

  /**
   * Manually invalidate road-network cache.
   * Call this after running db:import-roads or db:enrich-roads.
   *
   * Example: POST /roads/invalidate-cache
   */
  @Post('invalidate-cache')
  async invalidateCache() {
    const deletedKeys = await this.roadService.invalidateRoadCache();
    return {
      success: true,
      message: `Invalidated ${deletedKeys} cache keys. Next request will fetch fresh data from database.`,
    };
  }

  /**
   * Get road network as GeoJSON for map overlay
   * Optional bounds parameter to filter roads within specific area
   *
   * Example: GET /roads/network?minLat=-8.0&maxLat=-7.8&minLon=110.2&maxLon=110.5
   */
  @Get('network')
  async getRoadNetwork(
    @Query('minLat', new ParseFloatPipe({ optional: true })) minLat?: number,
    @Query('maxLat', new ParseFloatPipe({ optional: true })) maxLat?: number,
    @Query('minLon', new ParseFloatPipe({ optional: true })) minLon?: number,
    @Query('maxLon', new ParseFloatPipe({ optional: true })) maxLon?: number,
  ) {
    const bounds =
      minLat && maxLat && minLon && maxLon
        ? { minLat, maxLat, minLon, maxLon }
        : undefined;

    return this.roadService.getRoadNetwork(bounds);
  }

  /**
   * Calculate shortest route between two points using Dijkstra
   *
   * Example: GET /roads/route?startLat=-7.888&startLon=110.33&endLat=-7.92&endLon=110.35
   */
  @Get('route')
  async calculateRoute(
    @Query('startLat', ParseFloatPipe) startLat: number,
    @Query('startLon', ParseFloatPipe) startLon: number,
    @Query('endLat', ParseFloatPipe) endLat: number,
    @Query('endLon', ParseFloatPipe) endLon: number,
  ) {
    return this.roadService.calculateRoute(startLat, startLon, endLat, endLon);
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.roadService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateRoadDto) {
    return this.roadService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateRoadDto,
  ) {
    return this.roadService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.roadService.delete(id);
  }
}
