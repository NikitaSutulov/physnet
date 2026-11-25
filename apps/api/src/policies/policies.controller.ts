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
import { ApiBearerAuth, ApiExtraModels, ApiTags } from '@nestjs/swagger';
import type { JwtPayload, RoutingPolicyResponse } from '@physnet/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import {
  CreatePolicyDto,
  HostToHostDto,
  PointToPointDto,
  UpdatePolicyDto,
} from './dto/policy.dto.js';
import { PoliciesService } from './policies.service.js';

@ApiTags('policies')
@ApiBearerAuth()
@ApiExtraModels(HostToHostDto, PointToPointDto)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @Get()
  findAll(): Promise<RoutingPolicyResponse[]> {
    return this.policies.findAll();
  }

  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.findOne(id);
  }

  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreatePolicyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.create(dto, user.sub);
  }

  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.policies.remove(id);
  }

  @Post(':id/apply')
  @Roles('ADMIN')
  @HttpCode(200)
  apply(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.apply(id);
  }

  @Post(':id/withdraw')
  @Roles('ADMIN')
  @HttpCode(200)
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.withdraw(id);
  }
}
