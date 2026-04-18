import { Module } from '@nestjs/common';
import { BpbdRiskController } from './bpbd-risk.controller';
import { BpbdRiskService } from './bpbd-risk.service';

@Module({
  controllers: [BpbdRiskController],
  providers: [BpbdRiskService],
})
export class BpbdRiskModule {}
