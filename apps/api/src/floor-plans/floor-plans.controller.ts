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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import {
  FLOOR_PLAN_MAX_BYTES,
  type BuildingFloors,
  type FloorPlanResponse,
  type JwtPayload,
} from '@physnet/shared';
import { CurrentUser } from '../common/decorators/current-user.decorator.js';
import { Roles } from '../common/decorators/roles.decorator.js';
import { CreateFloorPlanDto } from './dto/create-floor-plan.dto.js';
import { ListFloorPlansQuery } from './dto/list-floor-plans.query.js';
import { UpdateFloorPlanDto } from './dto/update-floor-plan.dto.js';
import {
  FloorPlanFilePipe,
  type ValidatedFloorPlanFile,
} from './floor-plan-file.pipe.js';
import { FloorPlansService } from './floor-plans.service.js';

@ApiTags('floor-plans')
@ApiBearerAuth()
@Controller('floor-plans')
export class FloorPlansController {
  constructor(private readonly plans: FloorPlansService) {}

  @Post()
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['file', 'title'],
      properties: {
        file: { type: 'string', format: 'binary' },
        title: { type: 'string' },
        building: { type: 'string' },
        floorLevel: { type: 'integer' },
        scale: { type: 'number' },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: FLOOR_PLAN_MAX_BYTES, files: 1 },
    }),
  )
  create(
    @UploadedFile(FloorPlanFilePipe) file: ValidatedFloorPlanFile,
    @Body() dto: CreateFloorPlanDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<FloorPlanResponse> {
    return this.plans.create(dto, file, user.sub);
  }

  @Get()
  findAll(@Query() query: ListFloorPlansQuery): Promise<FloorPlanResponse[]> {
    return this.plans.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<FloorPlanResponse> {
    return this.plans.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateFloorPlanDto,
  ): Promise<FloorPlanResponse> {
    return this.plans.update(id, dto);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @HttpCode(204)
  remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    return this.plans.remove(id);
  }
}

@ApiTags('floor-plans')
@ApiBearerAuth()
@Controller('buildings')
export class BuildingsController {
  constructor(private readonly plans: FloorPlansService) {}

  @Get()
  findAll(): Promise<BuildingFloors[]> {
    return this.plans.buildings();
  }
}
