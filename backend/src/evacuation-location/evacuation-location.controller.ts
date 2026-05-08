import { Controller, Get, Query } from '@nestjs/common';
import { EvacuationLocationService } from './evacuation-location.service';

@Controller('evacuation-locations')
export class EvacuationLocationController {
  constructor(private readonly service: EvacuationLocationService) {}

  @Get('nearby')
  findNearby(
    @Query('lat') lat: number,
    @Query('lng') lng: number,
    @Query('radius') radius?: number,
    @Query('limit') limit?: number,
  ) {
    return this.service.findNearby({ lat, lng, radius, limit });
  }
}
