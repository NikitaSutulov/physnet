import { ApiProperty } from '@nestjs/swagger';
import type { AuthUser, LoginResponse } from '@physnet/shared';

export class AuthUserDto implements AuthUser {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'admin@physnet.local' }) email!: string;
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
  @ApiProperty({ example: 'ADMIN', description: 'ADMIN or OPERATOR' })
  role!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class LoginResponseDto implements LoginResponse {
  @ApiProperty({ description: 'JWT for the Authorization: Bearer header' })
  accessToken!: string;
  @ApiProperty({ format: 'date-time' }) expiresAt!: string;
  @ApiProperty({ type: AuthUserDto }) user!: AuthUserDto;
}
