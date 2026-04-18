import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { EarthquakeController } from './earthquake.controller';
import { EarthquakeService } from './earthquake.service';
import { EarthquakeGateway } from './earthquake.gateway';

@Module({
  imports: [HttpModule],
  controllers: [EarthquakeController],
  providers: [EarthquakeService, EarthquakeGateway],
  exports: [EarthquakeService],
})
export class EarthquakeModule {}
