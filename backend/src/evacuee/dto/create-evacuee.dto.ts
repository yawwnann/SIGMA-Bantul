import { IsString, IsInt, IsEnum, IsOptional, Min, Max } from 'class-validator';
import { EvacueeGender } from '@prisma/client';

export class CreateEvacueeDto {
  @IsInt()
  shelterId: number;

  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  nik?: string;

  @IsEnum(EvacueeGender)
  gender: EvacueeGender;

  @IsInt()
  @Min(0)
  @Max(150)
  age: number;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsInt()
  @Min(1)
  familySize: number;

  @IsOptional()
  @IsString()
  specialNeeds?: string;

  @IsOptional()
  @IsString()
  medicalCondition?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
