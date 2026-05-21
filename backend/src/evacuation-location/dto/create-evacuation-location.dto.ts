import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import {
  EvacuationLocationCategory,
  EvacuationLocationCondition,
} from '@prisma/client';

export class CreateEvacuationLocationDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(EvacuationLocationCategory)
  category: EvacuationLocationCategory;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsObject()
  @IsNotEmpty()
  geometry: object;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(EvacuationLocationCondition)
  condition: EvacuationLocationCondition;

  @IsString()
  @IsOptional()
  facilities?: string;
}
