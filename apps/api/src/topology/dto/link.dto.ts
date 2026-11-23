import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsOptional,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import {
  CABLE_TYPES,
  MAX_WAYPOINTS,
  type CableTypeName,
  type CreateLinkRequest,
  type UpdateLinkRequest,
} from '@physnet/shared';
import { WaypointDto } from './waypoint.dto.js';

export class UpdateLinkDto implements UpdateLinkRequest {
  @ApiPropertyOptional({ enum: CABLE_TYPES })
  @IsOptional()
  @IsIn(CABLE_TYPES)
  cableType?: CableTypeName;

  @ApiPropertyOptional({ type: [WaypointDto], maxItems: MAX_WAYPOINTS })
  @IsOptional()
  @IsArray()
  @ArrayMaxSize(MAX_WAYPOINTS)
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints?: WaypointDto[];
}

export class CreateLinkDto extends UpdateLinkDto implements CreateLinkRequest {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  sourcePortId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  destinationPortId!: string;
}
