import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';
import {
  DEVICE_STATUSES,
  DEVICE_TYPES,
  type DeviceListQuery,
  type DeviceTypeName,
} from '@physnet/shared';

export class ListDevicesQuery implements DeviceListQuery {
  @ApiPropertyOptional({ enum: DEVICE_TYPES })
  @IsOptional()
  @IsIn(DEVICE_TYPES)
  type?: DeviceTypeName;

  @ApiPropertyOptional({ enum: DEVICE_STATUSES })
  @IsOptional()
  @IsIn(DEVICE_STATUSES)
  status?: string;

  @ApiPropertyOptional({ description: 'Name, ONOS id, IP or MAC substring' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  search?: string;
}
