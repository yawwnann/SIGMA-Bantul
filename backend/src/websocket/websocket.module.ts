import { Module } from '@nestjs/common';
import { AppGateway } from './app.gateway';
import { DashboardModule } from '../dashboard/dashboard.module';

@Module({
  imports: [DashboardModule],
  providers: [AppGateway],
  exports: [AppGateway],
})
export class WebsocketModule {}
