import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';
import type { UnplacedDevicesQuery as Query } from '@physnet/shared';

export class UnplacedDevicesQuery implements Query {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  floorPlanId!: string;
}
