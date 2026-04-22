import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { EvacuationService, RouteScore } from './evacuation.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CalculateRouteDto } from './dto/calculate-route.dto';
import { RouteType } from '@prisma/client';

@Controller('routes')
export class EvacuationController {
  constructor(private evacuationService: EvacuationService) {}

  @Post('recommendation')
  async calculateRoute(@Body() dto: CalculateRouteDto): Promise<RouteScore[]> {
    return this.evacuationService.calculateWeightedOverlay(
      dto.startLat,
      dto.startLon,
      dto.endLat,
      dto.endLon,
      dto.type || RouteType.PRIMARY,
      dto.maxResults || 5,
    );
  }

  @Get('recommended')
  async getRecommendedRoutes(
    @Query('type') type?: RouteType,
    @Query('limit') limit?: string,
  ) {
    return this.evacuationService.getRecommendedRoutes({
      type,
      limit: limit ? parseInt(limit) : 10,
    });
  }

  @Get('nearest-shelter')
  async getNearestShelter(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('limit') limit?: string,
  ) {
    return this.evacuationService.getNearestShelter(
      parseFloat(lat),
      parseFloat(lon),
      limit ? parseInt(limit) : 5,
    );
  }

  @Get('weights')
  getWeights() {
    return this.evacuationService.getWeights();
  }

  @Post('weights')
  @UseGuards(JwtAuthGuard)
  updateWeights(
    @Body()
    weights: {
      hazard?: number;
      roadCondition?: number;
      distance?: number;
    },
  ) {
    return this.evacuationService.updateWeights(weights);
  }

  @Get('statistics')
  async getStatistics() {
    return this.evacuationService.getEvacuationStatistics();
  }
}
