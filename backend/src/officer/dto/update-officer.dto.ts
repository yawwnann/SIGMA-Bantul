import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateOfficerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
