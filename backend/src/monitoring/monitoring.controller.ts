import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { MonitoringService } from './monitoring.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('monitoring')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN')
export class MonitoringController {
  constructor(private readonly monitoringService: MonitoringService) {}

  @Get('health')
  async getHealth() {
    return this.monitoringService.getSystemHealth();
  }

  @Get('metrics')
  async getMetrics(@Query('minutes') minutes?: string) {
    const mins = minutes ? parseInt(minutes, 10) : 30;
    return this.monitoringService.getDetailedMetrics();
  }

  @Get('performance')
  async getPerformance(@Query('minutes') minutes?: string) {
    const mins = minutes ? parseInt(minutes, 10) : 30;
    return this.monitoringService.getPerformanceMetrics(mins);
  }

  @Get('redis')
  async getRedisStats() {
    return this.monitoringService.getRedisStats();
  }

  @Get('database')
  async getDatabaseStats() {
    return this.monitoringService.getDatabaseStats();
  }

  @Get('users')
  async getUserAccessStats() {
    return this.monitoringService.getUserAccessStats();
  }
}
