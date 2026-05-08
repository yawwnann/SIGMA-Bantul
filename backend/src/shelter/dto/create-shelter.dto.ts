import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ShelterCategory, ShelterCondition } from '@prisma/client';

export class CreateShelterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsEnum(ShelterCategory)
  category: ShelterCategory;

  @IsNumber()
  @IsOptional()
  capacity?: number;

  @IsObject()
  @IsNotEmpty()
  geometry: object;

  @IsString()
  @IsOptional()
  address?: string;

  @IsEnum(ShelterCondition)
  condition: ShelterCondition;

  @IsString()
  @IsOptional()
  facilities?: string;
}
