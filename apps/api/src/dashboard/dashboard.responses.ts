import { ApiProperty } from '@nestjs/swagger';
import type { DashboardStats, DeviceTypeName } from '@physnet/shared';

class DeviceCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() offline!: number;
  @ApiProperty({ description: 'Not placed on any floor plan' })
  unplaced!: number;
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'number' },
    example: { SWITCH: 7, HOST: 8, ROUTER: 0, ACCESS_POINT: 0, OTHER: 0 },
  })
  byType!: Record<DeviceTypeName, number>;
}

class PortCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() up!: number;
}

class LinkCountsDto {
  @ApiProperty() total!: number;
  @ApiProperty() down!: number;
}

class ControllerStateDto {
  @ApiProperty() enabled!: boolean;
  @ApiProperty({ type: Boolean, nullable: true })
  controllerReachable!: boolean | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSuccessAt!: string | null;
}

export class DashboardStatsDto implements DashboardStats {
  @ApiProperty({ type: DeviceCountsDto }) devices!: DeviceCountsDto;
  @ApiProperty({ type: PortCountsDto }) ports!: PortCountsDto;
  @ApiProperty({ type: LinkCountsDto }) links!: LinkCountsDto;
  @ApiProperty() floorPlans!: number;
  @ApiProperty() buildings!: number;
  @ApiProperty({ type: ControllerStateDto }) controller!: ControllerStateDto;
}
