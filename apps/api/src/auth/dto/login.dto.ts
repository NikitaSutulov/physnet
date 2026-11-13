import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';
import type { LoginRequest } from '@physnet/shared';

export class LoginDto implements LoginRequest {
  @ApiProperty({ example: 'admin@physnet.local' })
  @IsEmail()
  @MaxLength(255)
  email: string;

  @ApiProperty({ example: 'changeme123' })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  password: string;
}
