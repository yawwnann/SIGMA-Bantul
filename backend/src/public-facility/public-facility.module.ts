import { Module } from '@nestjs/common';
import { PublicFacilityController } from './public-facility.controller';
import { PublicFacilityService } from './public-facility.service';

@Module({
  controllers: [PublicFacilityController],
  providers: [PublicFacilityService],
  exports: [PublicFacilityService],
})
export class PublicFacilityModule {}
