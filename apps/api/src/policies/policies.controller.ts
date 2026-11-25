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
  ApiExtraModels,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
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
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { RoutingPolicyResponseDto } from '../policies/dto/policy.responses.js';

@ApiTags('policies')
@ApiAuth()
@ApiExtraModels(HostToHostDto, PointToPointDto)
@Controller('policies')
export class PoliciesController {
  constructor(private readonly policies: PoliciesService) {}

  @ApiOperation({
    summary: 'List routing policies with their live intent state',
  })
  @ApiOkResponse({ type: [RoutingPolicyResponseDto] })
  @Get()
  findAll(): Promise<RoutingPolicyResponse[]> {
    return this.policies.findAll();
  }

  @ApiOperation({ summary: 'Get a routing policy' })
  @ApiOkResponse({ type: RoutingPolicyResponseDto })
  @Get(':id')
  findOne(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.findOne(id);
  }

  @ApiOperation({ summary: 'Create a routing policy (not applied yet)' })
  @ApiCreatedResponse({ type: RoutingPolicyResponseDto })
  @Post()
  @Roles('ADMIN')
  create(
    @Body() dto: CreatePolicyDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.create(dto, user.sub);
  }

  @ApiOperation({
    summary: 'Update a routing policy (only while it is not applied)',
  })
  @ApiOkResponse({ type: RoutingPolicyResponseDto })
  @Patch(':id')
  @Roles('ADMIN')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdatePolicyDto,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.update(id, dto);
  }

  @ApiOperation({
    summary: 'Delete a routing policy (withdraws its intent first)',
  })
  @ApiNoContentResponse()
  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.policies.remove(id);
  }

  @ApiOperation({ summary: 'Apply a policy: submit it to ONOS as an intent' })
  @ApiOkResponse({ type: RoutingPolicyResponseDto })
  @Post(':id/apply')
  @Roles('ADMIN')
  @HttpCode(200)
  apply(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.apply(id);
  }

  @ApiOperation({ summary: 'Withdraw the intent of a policy from ONOS' })
  @ApiOkResponse({ type: RoutingPolicyResponseDto })
  @Post(':id/withdraw')
  @Roles('ADMIN')
  @HttpCode(200)
  withdraw(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<RoutingPolicyResponse> {
    return this.policies.withdraw(id);
  }
}
