import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
  Body,
} from '@nestjs/common';
import { EarthquakeService } from './earthquake.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateEarthquakeDto } from './dto/create-earthquake.dto';

@Controller('earthquakes')
export class EarthquakeController {
  constructor(private earthquakeService: EarthquakeService) {}

  @Get('latest')
  async getLatest() {
    return this.earthquakeService.getLatest();
  }

  @Get('latest-bmkg')
  async getLatestBMKG() {
    return this.earthquakeService.fetchLatestFromBMKG();
  }

  @Get('magnitude')
  async getMagnitudeEarthquakes() {
    return this.earthquakeService.fetchMagnitudeEarthquakes();
  }

  @Get('felt')
  async getFeltEarthquakes() {
    return this.earthquakeService.fetchFeltEarthquakes();
  }

  @Get()
  async getAll(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('region') region?: string,
  ) {
    return this.earthquakeService.getAll({ page, limit, startDate, endDate, region });
  }

  @Get('statistics')
  async getStatistics() {
    return this.earthquakeService.getStatistics();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.earthquakeService.findById(id);
  }

  @Post('sync')
  @UseGuards(JwtAuthGuard)
  async syncFromBMKG() {
    return this.earthquakeService.syncFromBMKG();
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateEarthquakeDto) {
    return this.earthquakeService.create(dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.earthquakeService.delete(id);
  }
}
