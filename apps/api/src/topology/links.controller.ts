import {
  Body,
  Controller,
  Delete,
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
import type { TopologyLink } from '@physnet/shared';
import { SocketId } from '../realtime/socket-id.decorator.js';
import { CreateLinkDto, UpdateLinkDto } from './dto/link.dto.js';
import { LinksService } from './links.service.js';
import { ApiAuth } from '../common/decorators/api-auth.decorator.js';
import { TopologyLinkDto } from '../topology/dto/topology.responses.js';

@ApiTags('topology')
@ApiAuth()
@Controller()
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @ApiOperation({ summary: 'Draw a cable between two ports on a floor plan' })
  @ApiCreatedResponse({ type: TopologyLinkDto })
  @Post('floor-plans/:id/links')
  create(
    @Param('id', ParseUUIDPipe) floorPlanId: string,
    @Body() dto: CreateLinkDto,
    @SocketId() origin?: string,
  ): Promise<TopologyLink> {
    return this.links.create(floorPlanId, dto, origin);
  }

  @ApiOperation({ summary: 'Change the cable type or waypoints of a link' })
  @ApiOkResponse({ type: TopologyLinkDto })
  @Patch('links/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
    @SocketId() origin?: string,
  ): Promise<TopologyLink> {
    return this.links.update(id, dto, origin);
  }

  @ApiOperation({
    summary:
      'Delete a hand-drawn link (links discovered by ONOS cannot be deleted)',
  })
  @ApiNoContentResponse()
  @Delete('links/:id')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @SocketId() origin?: string,
  ): Promise<void> {
    return this.links.remove(id, origin);
  }
}
