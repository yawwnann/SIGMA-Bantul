import { Injectable, Logger, InternalServerErrorException } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class BpbdRiskService {
  private readonly logger = new Logger(BpbdRiskService.name);
  private cachedGeoJson: any = null;

  async getRiskGeoJson(): Promise<any> {
    if (this.cachedGeoJson) {
      return this.cachedGeoJson;
    }

    try {
      const geoJsonPath = path.join(
        process.cwd(),
        'Data',
        'GeoJSon',
        'Data Wilayah dengan tingkat resiko gempa.geojson',
      );
      
      this.logger.log(`Reading BPBD Risk Data from: ${geoJsonPath}`);
      const fileData = await fs.promises.readFile(geoJsonPath, 'utf-8');
      const parsedData = JSON.parse(fileData);
      
      // Cache memory
      this.cachedGeoJson = parsedData;
      return parsedData;
    } catch (error) {
      this.logger.error('Failed to load BPBD Risk GeoJSON', error.stack);
      throw new InternalServerErrorException('Gagal memuat data risiko BPBD');
    }
  }
}
