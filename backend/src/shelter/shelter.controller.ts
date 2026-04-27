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
import { ShelterService } from './shelter.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateShelterDto } from './dto/create-shelter.dto';
import { ShelterCondition } from '@prisma/client';

@Controller('shelters')
export class ShelterController {
  constructor(private shelterService: ShelterService) {}

  @Get()
  async findAll(@Query('condition') condition?: ShelterCondition) {
    return this.shelterService.findAll({ condition });
  }

  @Get('nearby')
  async getNearby(
    @Query('lat') lat: string,
    @Query('lon') lon: string,
    @Query('radius') radius?: string,
  ) {
    return this.shelterService.getNearby(
      parseFloat(lat),
      parseFloat(lon),
      radius ? parseFloat(radius) : 10,
    );
  }

  @Get('statistics')
  async getStatistics() {
    return this.shelterService.getStatistics();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.shelterService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateShelterDto) {
    return this.shelterService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateShelterDto,
  ) {
    return this.shelterService.update(id, dto);
  }

  @Put(':id/occupancy')
  @UseGuards(JwtAuthGuard)
  async updateOccupancy(
    @Param('id', ParseIntPipe) id: number,
    @Body('occupancy', ParseIntPipe) occupancy: number,
  ) {
    return this.shelterService.updateOccupancy(id, occupancy);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.shelterService.delete(id);
  }

  @Put(':id/assign')
  @UseGuards(JwtAuthGuard)
  async assignOfficer(
    @Param('id', ParseIntPipe) id: number,
    @Body('officerId', ParseIntPipe) officerId: number,
  ) {
    return this.shelterService.assignOfficer(id, officerId);
  }

  @Delete(':id/assign')
  @UseGuards(JwtAuthGuard)
  async unassignOfficer(@Param('id', ParseIntPipe) id: number) {
    return this.shelterService.unassignOfficer(id);
  }
}
