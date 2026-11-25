import { ApiProperty } from '@nestjs/swagger';
import {
  DEVICE_TYPES,
  type DevicePort,
  type NetworkDeviceWithPorts,
  type OfflineDevicesSummary,
  type PlanRef,
  type PurgeOfflineDevicesResult,
  type UnplacedDevice,
} from '@physnet/shared';

export class DevicePortDto implements DevicePort {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) deviceId!: string;
  @ApiProperty({ example: '1' }) portNumber!: string;
  @ApiProperty({ type: String, nullable: true }) macAddress!: string | null;
  @ApiProperty({ type: String, nullable: true }) ipAddress!: string | null;
  @ApiProperty({ type: Number, nullable: true }) speedMbps!: number | null;
  @ApiProperty({ description: 'Administrative state' }) isEnabled!: boolean;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class NetworkDeviceDto implements NetworkDeviceWithPorts {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'of:0000000000000001' }) onosDeviceId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ enum: DEVICE_TYPES }) deviceType!: string;
  @ApiProperty({ type: String, nullable: true }) ipAddress!: string | null;
  @ApiProperty({ type: String, nullable: true }) macAddress!: string | null;
  @ApiProperty({ enum: ['ACTIVE', 'OFFLINE'] }) status!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
  @ApiProperty({ type: [DevicePortDto] }) ports!: DevicePortDto[];
}

export class OfflineDevicesSummaryDto implements OfflineDevicesSummary {
  @ApiProperty() total!: number;
  @ApiProperty({ description: 'Placed on at least one floor plan' })
  placed!: number;
}

export class PurgeOfflineDevicesResultDto implements PurgeOfflineDevicesResult {
  @ApiProperty() deleted!: number;
  @ApiProperty() keptPlaced!: number;
}

export class PlanRefDto implements PlanRef {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Поверх 3' }) title!: string;
  @ApiProperty({ example: 'Корпус 18' }) building!: string;
  @ApiProperty({ example: 3 }) floorLevel!: number;
}

export class UnplacedDeviceDto
  extends NetworkDeviceDto
  implements UnplacedDevice
{
  @ApiProperty({
    type: [PlanRefDto],
    description: 'Other plans the device is already placed on',
  })
  placedOn!: PlanRefDto[];
}
