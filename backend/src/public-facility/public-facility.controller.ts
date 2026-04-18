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
import { PublicFacilityService } from './public-facility.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CreatePublicFacilityDto } from './dto/create-public-facility.dto';

@Controller('public-facilities')
export class PublicFacilityController {
  constructor(private publicFacilityService: PublicFacilityService) {}

  @Get()
  async findAll(@Query('type') type?: string) {
    return this.publicFacilityService.findAll(type);
  }

  @Get('statistics')
  async getStatistics() {
    return this.publicFacilityService.getStatistics();
  }

  @Get(':id')
  async findById(@Param('id', ParseIntPipe) id: number) {
    return this.publicFacilityService.findById(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Body() dto: CreatePublicFacilityDto) {
    return this.publicFacilityService.create(dto);
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CreatePublicFacilityDto,
  ) {
    return this.publicFacilityService.update(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.publicFacilityService.delete(id);
  }
}
