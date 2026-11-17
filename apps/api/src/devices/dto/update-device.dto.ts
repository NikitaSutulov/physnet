import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import type { UpdateDeviceRequest } from '@physnet/shared';

export class UpdateDeviceDto implements UpdateDeviceRequest {
  @ApiPropertyOptional({ example: 'Комутатор ауд. 301' })
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  )
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  name?: string;
}
