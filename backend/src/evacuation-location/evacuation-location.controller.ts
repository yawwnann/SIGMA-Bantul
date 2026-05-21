import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { EvacuationLocationService } from './evacuation-location.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateEvacuationLocationDto } from './dto/create-evacuation-location.dto';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
} from '@prisma/client';

@Controller('evacuation-locations')
export class EvacuationLocationController {
  constructor(private evacuationLocationService: EvacuationLocationService) {}

  @Get()
  async findAll(
    @Query('condition') condition?: EvacuationLocationCondition,
    @Query('category') category?: EvacuationLocationCategory,
  ) {
    return this.evacuationLocationService.findAll({ condition, category });
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius?: string,
    @Query('limit') limit?: string,
  ) {
    return this.evacuationLocationService.getNearby(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : 3,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('statistics')
  async getStatistics() {
    return this.evacuationLocationService.getStatistics();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.evacuationLocationService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateEvacuationLocationDto) {
    return this.evacuationLocationService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateEvacuationLocationDto,
  ) {
    return this.evacuationLocationService.update(id, dto);
  }

  @Put(':id/occupancy')
  @UseGuards(JwtAuthGuard)
  async updateOccupancy(
    @Param('id', ParseIntPipe) id: number,
    @Body('occupancy', ParseIntPipe) occupancy: number,
  ) {
    return this.evacuationLocationService.updateOccupancy(id, occupancy);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.evacuationLocationService.delete(id);
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard)
  async assignOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Body('officerId', ParseIntPipe) officerId: number,
  ) {
    return this.evacuationLocationService.assignOfficer(id, officerId);
  }

  @Delete(':id/assign')
  @UseGuards(JwtAuthGuard)
  async unassignOfficer(@Param('id', ParseIntPipe) id: number) {
    return this.evacuationLocationService.unassignOfficer(id);
  }
}
