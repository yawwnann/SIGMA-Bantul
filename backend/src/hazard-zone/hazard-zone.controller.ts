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
import { HazardZoneService } from './hazard-zone.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreateHazardZoneDto } from './dto/create-hazard-zone.dto';
import { HazardLevel } from '@prisma/client';

@Controller('hazard-zones')
export class HazardZoneController {
  constructor(private hazardZoneService: HazardZoneService) {}

  @Get()
  async findAll(@Query('level') level?: HazardLevel) {
    return this.hazardZoneService.findAll({ level });
  }

  @Get('statistics')
  async getStatistics() {
    return this.hazardZoneService.getStatistics();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.hazardZoneService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreateHazardZoneDto) {
    return this.hazardZoneService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreateHazardZoneDto,
  ) {
    return this.hazardZoneService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.hazardZoneService.delete(id);
  }
}
