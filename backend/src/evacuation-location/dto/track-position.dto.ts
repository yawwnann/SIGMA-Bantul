import { IsString, IsNotEmpty, IsNumber, IsOptional } from 'class-validator';

export class TrackPositionDto {
  @IsString()
  @IsNotEmpty()
  deviceId: string;

  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;

  @IsNumber()
  @IsOptional()
  heading?: number;

  @IsNumber()
  @IsOptional()
  speed?: number;

  @IsNumber()
  @IsOptional()
  accuracy?: number;
}
