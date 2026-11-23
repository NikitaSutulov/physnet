import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, Min } from 'class-validator';
import type { UpdatePositionRequest } from '@physnet/shared';

export class UpdatePositionDto implements UpdatePositionRequest {
  @ApiProperty({ description: 'Plan pixels from the left edge, 0…width' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  x!: number;

  @ApiProperty({ description: 'Plan pixels from the top edge, 0…height' })
  @IsNumber({ allowNaN: false, allowInfinity: false })
  @Min(0)
  y!: number;

  @ApiPropertyOptional({
    description: 'Degrees; any value is normalised to [0, 360)',
    default: 0,
  })
  @IsOptional()
  @IsNumber({ allowNaN: false, allowInfinity: false })
  rotation?: number;
}
