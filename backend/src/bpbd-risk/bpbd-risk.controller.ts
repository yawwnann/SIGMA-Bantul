import {
  Controller,
  Get,
  Post,
  Param,
  ParseIntPipe,
  UseGuards,
  Logger,
  HttpStatus,
  HttpException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { BpbdRiskService } from './bpbd-risk.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@ApiTags('BPBD Risk')
@Controller('bpbd-risk')
export class BpbdRiskController {
  private readonly logger = new Logger(BpbdRiskController.name);

  constructor(private readonly bpbdRiskService: BpbdRiskService) {}

  @Get('zones')
  @ApiOperation({ summary: 'Get all BPBD risk zones' })
  @ApiResponse({ status: 200, description: 'List of BPBD risk zones' })
  async getZones() {
    this.logger.log('Fetching all BPBD risk zones');
    try {
      const zones = await this.bpbdRiskService.getAllZones();
      return {
        success: true,
        data: zones,
        count: zones.length,
      };
    } catch (error) {
      this.logger.error('Failed to fetch BPBD zones', error.stack);
      throw new HttpException(
        'Failed to fetch BPBD zones',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('zones/:id')
  @ApiOperation({ summary: 'Get BPBD risk zone by ID' })
  @ApiParam({ name: 'id', description: 'Zone ID' })
  @ApiResponse({ status: 200, description: 'BPBD risk zone details' })
  @ApiResponse({ status: 404, description: 'Zone not found' })
  async getZoneById(@Param('id', ParseIntPipe) id: number) {
    this.logger.log(`Fetching BPBD zone with ID: ${id}`);
    try {
      const zone = await this.bpbdRiskService.getZoneById(id);
      if (!zone) {
        throw new HttpException('Zone not found', HttpStatus.NOT_FOUND);
      }
      return {
        success: true,
        data: zone,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Failed to fetch BPBD zone ${id}`, error.stack);
      throw new HttpException(
        'Failed to fetch BPBD zone',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('import')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Import BPBD zones from GeoJSON (Admin only)' })
  @ApiResponse({ status: 200, description: 'Import completed successfully' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async importZones() {
    this.logger.log('Starting BPBD zones import');
    try {
      const result = await this.bpbdRiskService.importGeoJson();
      return {
        success: true,
        message: 'BPBD zones import completed',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to import BPBD zones', error.stack);
      throw new HttpException(
        `Import failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('assign-to-roads')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Assign BPBD risk to roads via spatial join (Admin only)',
  })
  @ApiResponse({
    status: 200,
    description: 'Assignment completed successfully',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden - Admin role required' })
  async assignToRoads() {
    this.logger.log('Starting BPBD risk assignment to roads');
    try {
      const result = await this.bpbdRiskService.assignRiskToRoads();
      return {
        success: true,
        message: 'BPBD risk assignment completed',
        data: result,
      };
    } catch (error) {
      this.logger.error('Failed to assign BPBD risk to roads', error.stack);
      throw new HttpException(
        `Assignment failed: ${error.message}`,
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get BPBD risk statistics' })
  @ApiResponse({ status: 200, description: 'Risk statistics' })
  async getStatistics() {
    this.logger.log('Fetching BPBD risk statistics');
    try {
      const stats = await this.bpbdRiskService.getRoadRiskStatistics();
      return {
        success: true,
        data: stats,
      };
    } catch (error) {
      this.logger.error('Failed to fetch statistics', error.stack);
      throw new HttpException(
        'Failed to fetch statistics',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('validation')
  @ApiOperation({ summary: 'Get BPBD vs frequency validation report' })
  @ApiResponse({ status: 200, description: 'Validation report' })
  async getValidation() {
    this.logger.log('Generating BPBD validation report');
    try {
      const validation = await this.bpbdRiskService.validateBpbdVsFrequency();
      return {
        success: true,
        data: validation,
      };
    } catch (error) {
      this.logger.error('Failed to generate validation report', error.stack);
      throw new HttpException(
        'Failed to generate validation report',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get()
  @ApiOperation({ summary: 'Get BPBD risk GeoJSON data (legacy endpoint)' })
  @ApiResponse({ status: 200, description: 'BPBD risk GeoJSON data' })
  async getRiskData() {
    this.logger.log('Fetching BPBD Risk GeoJSON data');
    try {
      const data = await this.bpbdRiskService.getRiskGeoJson();
      return {
        success: true,
        data,
      };
    } catch (error) {
      this.logger.error('Failed to fetch GeoJSON data', error.stack);
      throw new HttpException(
        'Failed to fetch GeoJSON data',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
