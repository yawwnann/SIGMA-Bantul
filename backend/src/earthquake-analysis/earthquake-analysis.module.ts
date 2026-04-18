import { Module } from '@nestjs/common';
import { EarthquakeAnalysisController } from './earthquake-analysis.controller';
import { EarthquakeAnalysisService } from './earthquake-analysis.service';
import { FrequencyAnalysisService } from './frequency-analysis.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [EarthquakeAnalysisController],
  providers: [EarthquakeAnalysisService, FrequencyAnalysisService],
  exports: [EarthquakeAnalysisService],
})
export class EarthquakeAnalysisModule {}
