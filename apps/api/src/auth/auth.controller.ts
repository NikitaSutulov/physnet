import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { AuthUser, JwtPayload, LoginResponse } from '@physnet/shared';
import { AuthService } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { Public } from '../common/decorators/public.decorator.js';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { AuthUserDto, LoginResponseDto } from '../auth/dto/auth.responses.js';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @ApiOperation({
    summary: 'Log in with email and password; returns a JWT access token',
  })
  @ApiOkResponse({ type: LoginResponseDto })
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto): Promise<LoginResponse> {
    return this.auth.login(dto.email, dto.password);
  }

  @ApiAuth()
  @ApiOperation({ summary: 'Profile of the current user' })
  @ApiOkResponse({ type: AuthUserDto })
  @Get('me')
  me(@CurrentUser() user: JwtPayload): Promise<AuthUser> {
    return this.auth.me(user.sub);
  }
}
