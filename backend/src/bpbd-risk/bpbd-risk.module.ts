import { Module } from '@nestjs/common';
import { BpbdRiskController } from './bpbd-risk.controller';
import { BpbdRiskService } from './bpbd-risk.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';

@Module({
  imports: [PrismaModule, RedisModule],
  controllers: [BpbdRiskController],
  providers: [BpbdRiskService],
  exports: [BpbdRiskService],
})
export class BpbdRiskModule {}
