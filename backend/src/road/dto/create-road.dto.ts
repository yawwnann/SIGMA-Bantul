import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  IsObject,
  IsNumber,
} from 'class-validator';
import { RoadType, RoadCondition, RoadVulnerability } from '@prisma/client';

export class CreateRoadDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsObject()
  @IsNotEmpty()
  geometry: object;

  @IsEnum(RoadType)
  type: RoadType;

  @IsEnum(RoadCondition)
  condition: RoadCondition;

  @IsEnum(RoadVulnerability)
  vulnerability: RoadVulnerability;

  @IsNumber()
  @IsOptional()
  length?: number;
}
