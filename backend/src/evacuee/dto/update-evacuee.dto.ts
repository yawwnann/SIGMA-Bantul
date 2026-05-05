import {
  IsString,
  IsInt,
  IsEnum,
  IsOptional,
  Min,
  Max,
  IsDateString,
} from 'class-validator';
import { EvacueeGender, EvacueeStatus } from '@prisma/client';

export class UpdateEvacueeDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  nik?: string;

  @IsOptional()
  @IsEnum(EvacueeGender)
  gender?: EvacueeGender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(150)
  age?: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  familySize?: number;

  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @IsOptional()
  @IsString()
  medicalCondition?: string;

  @IsOptional()
  @IsEnum(EvacueeStatus)
  status?: EvacueeStatus;

  @IsOptional()
  @IsDateString()
  checkOutDate?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
