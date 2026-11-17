import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import type { PurgeOfflineDevicesQuery } from '@physnet/shared';

export class PurgeOfflineQuery implements PurgeOfflineDevicesQuery {
  @ApiPropertyOptional({
    description:
      'Also remove devices placed on floor plans, together with their links',
    default: false,
  })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  includePlaced?: boolean;
}
