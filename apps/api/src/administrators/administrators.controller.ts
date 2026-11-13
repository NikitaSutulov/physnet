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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { AuthUser } from '@physnet/shared';
import { AdministratorsService } from './administrators.service.js';
import { CreateAdministratorDto } from './dto/create-administrator.dto.js';
import { UpdateAdministratorDto } from './dto/update-administrator.dto.js';
import { Roles } from '../common/decorators/roles.decorator.js';

@ApiTags('administrators')
@ApiBearerAuth()
@Roles('ADMIN')
@Controller('administrators')
export class AdministratorsController {
  constructor(private readonly admins: AdministratorsService) {}

  @Get()
  findAll(): Promise<AuthUser[]> {
    return this.admins.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<AuthUser> {
    return this.admins.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAdministratorDto): Promise<AuthUser> {
    return this.admins.create(dto);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateAdministratorDto,
  ): Promise<AuthUser> {
    return this.admins.update(id, dto);
  }

  @Delete(':id')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.admins.remove(id);
  }
}
