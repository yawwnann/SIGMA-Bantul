import { Module } from '@nestjs/common';
import { OfficerService } from './officer.service';
import {
  OfficerController,
  OfficerDashboardController,
} from './officer.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [OfficerController, OfficerDashboardController],
  providers: [OfficerService],
  exports: [OfficerService],
})
export class OfficerModule {}
