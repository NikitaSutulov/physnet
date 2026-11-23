import { ApiProperty } from '@nestjs/swagger';
import { IsNumber, Min } from 'class-validator';
import type { Waypoint } from '@physnet/shared';

export class WaypointDto implements Waypoint {
  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  x!: number;

  @ApiProperty()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  y!: number;
}
