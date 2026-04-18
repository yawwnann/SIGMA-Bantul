import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { HttpModule } from '@nestjs/axios';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AppGateway } from './websocket/app.gateway';

import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { AuthModule } from './auth/auth.module';
import { EarthquakeModule } from './earthquake/earthquake.module';
import { HazardZoneModule } from './hazard-zone/hazard-zone.module';
import { ShelterModule } from './shelter/shelter.module';
import { RoadModule } from './road/road.module';
import { EvacuationModule } from './evacuation/evacuation.module';
import { PublicFacilityModule } from './public-facility/public-facility.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { WebsocketModule } from './websocket/websocket.module';
import { EarthquakeAnalysisModule } from './earthquake-analysis/earthquake-analysis.module';
import { BpbdRiskModule } from './bpbd-risk/bpbd-risk.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    ScheduleModule.forRoot(),
    HttpModule,
    PrismaModule,
    RedisModule,
    AuthModule,
    EarthquakeModule,
    HazardZoneModule,
    ShelterModule,
    RoadModule,
    EvacuationModule,
    PublicFacilityModule,
    DashboardModule,
    WebsocketModule,
    EarthquakeAnalysisModule,
    BpbdRiskModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    AppGateway,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
