import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { EarthquakeAnalysisService } from './earthquake-analysis.service';
import { FrequencyQueryDto } from './dto/frequency-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';

@ApiTags('Earthquake Analysis')
@Controller('analysis')
export class EarthquakeAnalysisController {
  constructor(
    private readonly earthquakeAnalysisService: EarthquakeAnalysisService,
  ) {}

  @Get('frequency')
  @ApiOperation({ summary: 'Get earthquake frequency analysis by grid' })
  @ApiResponse({ status: 200, description: 'Frequency analysis data' })
  async getFrequencyAnalysis(@Query() query: FrequencyQueryDto) {
    const data =
      await this.earthquakeAnalysisService.getFrequencyAnalysis(query);
    return {
      success: true,
      data,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get earthquake statistics' })
  @ApiResponse({ status: 200, description: 'Statistics data' })
  async getStatistics(
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    const data = await this.earthquakeAnalysisService.getStatistics(
      startDate,
      endDate,
    );
    return {
      success: true,
      data,
    };
  }

  @Get('bantul-boundary')
  @ApiOperation({ summary: 'Get Bantul administrative boundary GeoJSON' })
  @ApiResponse({ status: 200, description: 'Bantul boundary GeoJSON' })
  async getBantulBoundary() {
    const data = await this.earthquakeAnalysisService.getBantulBoundary();
    return {
      success: true,
      data,
    };
  }
}
