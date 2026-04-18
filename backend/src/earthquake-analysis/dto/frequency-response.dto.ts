import { ApiProperty } from '@nestjs/swagger';

export class GridCellDto {
  @ApiProperty({ description: 'Unique grid cell identifier' })
  grid_id: string;

  @ApiProperty({ description: 'Number of earthquakes in this cell' })
  count: number;

  @ApiProperty({
    description: 'Frequency level',
    enum: ['low', 'medium', 'high'],
  })
  level: 'low' | 'medium' | 'high';

  @ApiProperty({ description: 'Center coordinates of the grid cell' })
  center: {
    lat: number;
    lon: number;
  };

  @ApiProperty({ description: 'GeoJSON geometry of the grid cell' })
  geometry: any;
}

export class AnalysisStatisticsDto {
  @ApiProperty({ description: 'Number of low frequency grids' })
  low_count: number;

  @ApiProperty({ description: 'Number of medium frequency grids' })
  medium_count: number;

  @ApiProperty({ description: 'Number of high frequency grids' })
  high_count: number;
}

export class AnalysisMetadataDto {
  @ApiProperty({ description: 'Analysis start date' })
  start_date: string;

  @ApiProperty({ description: 'Analysis end date' })
  end_date: string;

  @ApiProperty({ description: 'Grid size in kilometers' })
  grid_size: number;

  @ApiProperty({ description: 'Total number of grid cells' })
  total_grids: number;

  @ApiProperty({ description: 'Total earthquakes analyzed' })
  total_earthquakes: number;
}

export class FrequencyResponseDto {
  @ApiProperty({ description: 'Analysis metadata' })
  metadata: AnalysisMetadataDto;

  @ApiProperty({
    description: 'Grid cells with frequency data',
    type: [GridCellDto],
  })
  grids: GridCellDto[];

  @ApiProperty({ description: 'Statistical summary' })
  statistics: AnalysisStatisticsDto;
}
