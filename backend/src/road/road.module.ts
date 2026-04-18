import { Module } from '@nestjs/common';
import { RoadController } from './road.controller';
import { RoadService } from './road.service';
import { RedisModule } from '../redis/redis.module';
import { SimpleDijkstraService } from './simple-dijkstra.service';

@Module({
  imports: [RedisModule],
  controllers: [RoadController],
  providers: [RoadService, SimpleDijkstraService],
  exports: [RoadService],
})
export class RoadModule {}
