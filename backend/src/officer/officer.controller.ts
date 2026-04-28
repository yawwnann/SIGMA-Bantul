import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseIntPipe,
  Request,
} from '@nestjs/common';
import { OfficerService } from './officer.service';
import { CreateOfficerDto } from './dto/create-officer.dto';
import { UpdateOfficerDto } from './dto/update-officer.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole, ShelterStatus } from '@prisma/client';

// Admin-only officer management
@Controller('officers')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
export class OfficerController {
  constructor(private officerService: OfficerService) {}

  @Post()
  create(@Body() dto: CreateOfficerDto) {
    return this.officerService.createOfficer(dto);
  }

  @Get()
  findAll() {
    return this.officerService.findAllOfficers();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.officerService.findOfficerById(id);
  }

  @Get(':id/statistics')
  getStatistics(@Param('id', ParseIntPipe) id: number) {
    return this.officerService.getOfficerStatistics(id);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateOfficerDto) {
    return this.officerService.updateOfficer(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.officerService.deleteOfficer(id);
  }
}

// Officer dashboard endpoints (SHELTER_OFFICER role)
@Controller('officer')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SHELTER_OFFICER)
export class OfficerDashboardController {
  constructor(private officerService: OfficerService) {}

  @Get('dashboard')
  async getDashboard(
    @Request() req: { user: { userId: number; role: string } },
  ) {
    try {
      return await this.officerService.getOfficerDashboard(req.user.userId);
    } catch (error) {
      console.error('Error in getDashboard:', error);
      throw error;
    }
  }

  @Get('shelters')
  getMyShelters(@Request() req: { user: { userId: number } }) {
    return this.officerService
      .getOfficerDashboard(req.user.userId)
      .then((d) => d.shelters);
  }

  @Patch('shelters/:id/occupancy')
  updateOccupancy(
    @Param('id', ParseIntPipe) shelterId: number,
    @Body('occupancy', ParseIntPipe) occupancy: number,
    @Request() req: { user: { userId: number } },
  ) {
    return this.officerService.updateOccupancyByOfficer(
      shelterId,
      occupancy,
      req.user.userId,
    );
  }

  @Patch('shelters/:id/condition')
  updateCondition(
    @Param('id', ParseIntPipe) shelterId: number,
    @Body('condition') condition: string,
    @Request() req: { user: { userId: number } },
  ) {
    return this.officerService.updateConditionByOfficer(
      shelterId,
      condition,
      req.user.userId,
    );
  }

  @Patch('shelters/:id/status')
  updateStatus(
    @Param('id', ParseIntPipe) shelterId: number,
    @Body('status') status: ShelterStatus,
    @Request() req: { user: { userId: number } },
  ) {
    return this.officerService.updateStatusByOfficer(
      shelterId,
      status,
      req.user.userId,
    );
  }
}
