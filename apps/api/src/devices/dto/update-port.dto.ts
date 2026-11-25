import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';
import type { UpdatePortRequest } from '@physnet/shared';

export class UpdatePortDto implements UpdatePortRequest {
  @ApiProperty({ description: 'Administrative state of the port' })
  @IsBoolean()
  isEnabled!: boolean;
}
