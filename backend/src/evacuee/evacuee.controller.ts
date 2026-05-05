import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseIntPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { EvacueeService } from './evacuee.service';
import { CreateEvacueeDto } from './dto/create-evacuee.dto';
import { UpdateEvacueeDto } from './dto/update-evacuee.dto';
import { EvacueeStatus } from '@prisma/client';

@Controller('evacuees')
@UseGuards(JwtAuthGuard, RolesGuard)
export class EvacueeController {
  constructor(private evacueeService: EvacueeService) {}

  @Post()
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async create(@Body() dto: CreateEvacueeDto, @Request() req) {
    return this.evacueeService.create(dto, req.user.userId);
  }

  @Get()
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async findAll(
    @Query('shelterId') shelterId?: string,
    @Query('status') status?: EvacueeStatus,
  ) {
    return this.evacueeService.findAll(
      shelterId ? parseInt(shelterId) : undefined,
      status,
    );
  }

  @Get('stats/:shelterId')
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async getStats(@Param('shelterId', ParseIntPipe) shelterId: number) {
    return this.evacueeService.getStatsByShelterId(shelterId);
  }

  @Get(':id')
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.evacueeService.findOne(id);
  }

  @Put(':id')
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateEvacueeDto,
  ) {
    return this.evacueeService.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN', 'SHELTER_OFFICER')
  async delete(@Param('id', ParseIntPipe) id: number) {
    return this.evacueeService.delete(id);
  }
}
