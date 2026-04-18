import { IsNumber, IsEnum, IsOptional } from 'class-validator';
import { RouteType } from '@prisma/client';

export class CalculateRouteDto {
  @IsNumber()
  startLat: number;

  @IsNumber()
  startLon: number;

  @IsNumber()
  endLat: number;

  @IsNumber()
  endLon: number;

  @IsEnum(RouteType)
  @IsOptional()
  type?: RouteType;

  @IsNumber()
  @IsOptional()
  maxResults?: number;
}
