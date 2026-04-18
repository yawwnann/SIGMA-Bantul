import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';
import { HazardLevel } from '@prisma/client';

export class CreateHazardZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(HazardLevel)
  level: HazardLevel;

  @IsObject()
  @IsNotEmpty()
  geometry: object;

  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  area?: number;
}
