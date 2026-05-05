import { Module } from '@nestjs/common';
import { EvacueeController } from './evacuee.controller';
import { EvacueeService } from './evacuee.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [EvacueeController],
  providers: [EvacueeService],
  exports: [EvacueeService],
})
export class EvacueeModule {}
