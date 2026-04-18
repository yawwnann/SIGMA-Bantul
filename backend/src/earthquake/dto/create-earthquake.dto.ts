import { IsNumber, IsOptional, IsString, IsBoolean } from 'class-validator';

export class CreateEarthquakeDto {
  @IsString()
  @IsOptional()
  bmkgId?: string;

  @IsNumber()
  magnitude: number;

  @IsNumber()
  depth: number;

  @IsNumber()
  lat: number;

  @IsNumber()
  lon: number;

  @IsString()
  location: string;

  @IsString()
  region: string;

  @IsString()
  time: string;

  @IsString()
  @IsOptional()
  dirasakan?: string;

  @IsString()
  @IsOptional()
  potential?: string;

  @IsString()
  @IsOptional()
  shakemapUrl?: string;

  @IsBoolean()
  @IsOptional()
  isLatest?: boolean;
}
