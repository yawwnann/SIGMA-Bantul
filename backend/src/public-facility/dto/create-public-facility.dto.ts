import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreatePublicFacilityDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  type: string;

  @IsObject()
  @IsNotEmpty()
  geometry: object;

  @IsString()
  @IsOptional()
  address?: string;
}
