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
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { TopologyLink } from '@physnet/shared';
import { SocketId } from '../realtime/socket-id.decorator.js';
import { CreateLinkDto, UpdateLinkDto } from './dto/link.dto.js';
import { LinksService } from './links.service.js';

@ApiTags('topology')
@ApiBearerAuth()
@Controller()
export class LinksController {
  constructor(private readonly links: LinksService) {}

  @Post('floor-plans/:id/links')
  create(
    @Param('id', ParseUUIDPipe) floorPlanId: string,
    @Body() dto: CreateLinkDto,
    @SocketId() origin?: string,
  ): Promise<TopologyLink> {
    return this.links.create(floorPlanId, dto, origin);
  }

  @Patch('links/:id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateLinkDto,
    @SocketId() origin?: string,
  ): Promise<TopologyLink> {
    return this.links.update(id, dto, origin);
  }

  @Delete('links/:id')
  @HttpCode(204)
  remove(
    @Param('id', ParseUUIDPipe) id: string,
    @SocketId() origin?: string,
  ): Promise<void> {
    return this.links.remove(id, origin);
  }
}
