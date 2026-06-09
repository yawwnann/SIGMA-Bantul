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
  BadRequestException,
} from '@nestjs/common';
import { EvacuationLocationService } from './evacuation-location.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateEvacuationLocationDto } from './dto/create-evacuation-location.dto';
import { UpdateEvacuationLocationDto } from './dto/update-evacuation-location.dto';
import { BantulBoundaryService } from '../common/services/bantul-boundary.service';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
} from '@prisma/client';

@Controller('evacuation-locations')
export class EvacuationLocationController {
  constructor(
    private evacuationLocationService: EvacuationLocationService,
    private bantulBoundary: BantulBoundaryService,
  ) {}

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
    const latNum = parseFloat(lat);
    const lonNum = parseFloat(lon);
    // Validate coordinates are within Bantul
    await this.bantulBoundary.validateOrThrow(latNum, lonNum);
    return this.evacuationLocationService.getNearby(
      latNum,
      lonNum,
      radius ? parseFloat(radius) : 3,
      limit ? parseInt(limit) : 10,
    );
  }

  @Get('statistics')
  async getStatistics() {
    return this.evacuationLocationService.getStatistics();
  }

  @Post(':id/navigate')
  async startNavigation(
    @Param('id', ParseIntPipe) id: number,
    @Body('deviceId') deviceId: string,
  ) {
    if (!deviceId) throw new BadRequestException('deviceId is required');
    return this.evacuationLocationService.startNavigation(id, deviceId);
  }

  @Delete(':id/navigate')
  async stopNavigation(
    @Param('id', ParseIntPipe) id: number,
    @Body('deviceId') deviceId: string,
  ) {
    if (!deviceId) throw new BadRequestException('deviceId is required');
    return this.evacuationLocationService.stopNavigation(id, deviceId);
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
    @Body() dto: UpdateEvacuationLocationDto,
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
