import { Module } from '@nestjs/common';
import { EvacuationLocationController } from './evacuation-location.controller';
import { EvacuationLocationService } from './evacuation-location.service';
import { WebsocketModule } from '../websocket/websocket.module';

@Module({
  imports: [WebsocketModule],
  controllers: [EvacuationLocationController],
  providers: [EvacuationLocationService],
  exports: [EvacuationLocationService],
})
export class EvacuationLocationModule {}
