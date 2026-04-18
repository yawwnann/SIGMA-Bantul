import { Controller, Get, Logger } from '@nestjs/common';
import { BpbdRiskService } from './bpbd-risk.service';

@Controller('bpbd-risk')
export class BpbdRiskController {
  private readonly logger = new Logger(BpbdRiskController.name);

  constructor(private readonly bpbdRiskService: BpbdRiskService) {}

  @Get()
  async getRiskData() {
    this.logger.log('Fetching BPBD Risk GeoJSON data');
    const data = await this.bpbdRiskService.getRiskGeoJson();
    return {
      success: true,
      data,
    };
  }
}
