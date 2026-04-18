import { Module } from '@nestjs/common';
import { HazardZoneController } from './hazard-zone.controller';
import { HazardZoneService } from './hazard-zone.service';

@Module({
  controllers: [HazardZoneController],
  providers: [HazardZoneService],
  exports: [HazardZoneService],
})
export class HazardZoneModule {}
