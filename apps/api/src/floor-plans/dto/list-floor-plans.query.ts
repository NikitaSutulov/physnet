import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import type { FloorPlanListQuery } from '@physnet/shared';

export class ListFloorPlansQuery implements FloorPlanListQuery {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(255)
  building?: string;

  @ApiPropertyOptional({ description: 'Case-insensitive title search' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
