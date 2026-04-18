import { IsDateString, IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class FrequencyQueryDto {
  @ApiProperty({
    description: 'Start date for analysis (ISO 8601)',
    example: '2023-01-01T00:00:00Z',
  })
  @IsDateString()
  start_date: string;

  @ApiProperty({
    description: 'End date for analysis (ISO 8601)',
    example: '2024-01-01T00:00:00Z',
  })
  @IsDateString()
  end_date: string;

  @ApiProperty({
    description: 'Grid size in kilometers',
    example: 5,
    default: 5,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(2)
  @Max(20)
  grid_size?: number = 5;

  @ApiProperty({
    description: 'Minimum magnitude filter',
    example: 3.0,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  @Max(10)
  min_magnitude?: number = 0;

  @ApiProperty({
    description: 'Maximum depth filter in kilometers',
    example: 100,
    required: false,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0)
  max_depth?: number;
}
