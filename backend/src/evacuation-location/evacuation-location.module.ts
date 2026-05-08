import { Module } from '@nestjs/common';
import { EvacuationLocationController } from './evacuation-location.controller';
import { EvacuationLocationRepository } from './evacuation-location.repository';
import { EvacuationLocationService } from './evacuation-location.service';

@Module({
  controllers: [EvacuationLocationController],
  providers: [EvacuationLocationRepository, EvacuationLocationService],
})
export class EvacuationLocationModule {}
