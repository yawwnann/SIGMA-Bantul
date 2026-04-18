import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsEnum,
  IsOptional,
  IsObject,
} from 'class-validator';
import { ShelterCondition } from '@prisma/client';

export class CreateShelterDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsNumber()
  capacity: number;

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
