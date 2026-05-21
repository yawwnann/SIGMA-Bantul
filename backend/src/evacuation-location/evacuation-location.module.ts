import { Module } from '@nestjs/common';
import { EvacuationLocationController } from './evacuation-location.controller';
import { EvacuationLocationService } from './evacuation-location.service';

@Module({
  controllers: [EvacuationLocationController],
  providers: [EvacuationLocationService],
  exports: [EvacuationLocationService],
})
export class EvacuationLocationModule {}
