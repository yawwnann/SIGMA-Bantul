import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
} from '@prisma/client';

export class UpdateEvacuationLocationDto {
  @IsString()
  @IsOptional()
  name?: string;

  @IsEnum(EvacuationLocationCategory)
  @IsOptional()
  category?: EvacuationLocationCategory;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsObject()
  @IsOptional()
  geometry?: object;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(EvacuationLocationCondition)
  @IsOptional()
  condition?: EvacuationLocationCondition;

  @IsString()
  @IsOptional()
  facilities?: string;
}