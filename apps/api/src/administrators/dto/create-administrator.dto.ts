import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

export const ADMIN_ROLES = ['ADMIN', 'OPERATOR'] as const;

export class CreateAdministratorDto {
  @ApiProperty()
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  firstName: string;

  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(100)
  lastName: string;

  @ApiPropertyOptional({ enum: ADMIN_ROLES, default: 'ADMIN' })
  @IsOptional()
  @IsIn(ADMIN_ROLES)
  role?: (typeof ADMIN_ROLES)[number];
}
