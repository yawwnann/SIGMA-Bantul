import { IsOptional, IsString, MinLength, ValidateIf } from 'class-validator';

export class UpdateOfficerDto {
  @IsOptional()
  @IsString()
  name?: string;

  @ValidateIf((o) => o.password !== undefined && o.password !== null && o.password !== '')
  @IsString({ message: 'Password harus berupa string' })
  @MinLength(6, { message: 'Password minimal 6 karakter' })
  password?: string;

  @IsOptional()
  @IsString()
  phone?: string;
}
