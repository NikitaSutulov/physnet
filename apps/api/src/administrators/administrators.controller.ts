import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import type { AuthUser } from '@physnet/shared';
import { AdministratorsService } from './administrators.service.js';
import { CreateAdministratorDto } from './dto/create-administrator.dto.js';
import { UpdateAdministratorDto } from './dto/update-administrator.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { AuthUserDto } from '../auth/dto/auth.responses.js';

@ApiTags('administrators')
@ApiAuth()
@Roles('ADMIN')
@Controller('administrators')
export class AdministratorsController {
  constructor(private readonly admins: AdministratorsService) {}

  @ApiOperation({ summary: 'List administrators' })
  @ApiOkResponse({ type: [AuthUserDto] })
  @Get()
  findAll(): Promise<AuthUser[]> {
    return this.admins.findAll();
  }

  @ApiOperation({ summary: 'Get an administrator' })
  @ApiOkResponse({ type: AuthUserDto })
  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuthUser> {
    return this.admins.findOne(id);
  }

  @ApiOperation({ summary: 'Create an administrator' })
  @ApiCreatedResponse({ type: AuthUserDto })
  @Post()
  create(@Body() dto: CreateAdministratorDto): Promise<AuthUser> {
    return this.admins.create(dto);
  }

  @ApiOperation({ summary: 'Update an administrator (name, role, password)' })
  @ApiOkResponse({ type: AuthUserDto })
  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdministratorDto,
  ): Promise<AuthUser> {
    return this.admins.update(id, dto);
  }

  @ApiOperation({ summary: 'Delete an administrator' })
  @ApiNoContentResponse()
  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.admins.remove(id);
  }
}
