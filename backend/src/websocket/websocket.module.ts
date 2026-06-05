import { Module, Global } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { WebsocketService } from './websocket.service';
import { DashboardModule } from '../dashboard/dashboard.module';
import { OfficerModule } from '../officer/officer.module';
import { EvacueeModule } from '../evacuee/evacuee.module';
import { PrismaModule } from '../prisma/prisma.module';

@Global()
@Module({
  imports: [DashboardModule, PrismaModule],
  providers: [AppGateway, WebsocketService],
  exports: [AppGateway, WebsocketService],
})
export class WebsocketModule {}
