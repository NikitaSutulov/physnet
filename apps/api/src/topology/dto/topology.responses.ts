import { ApiProperty } from '@nestjs/swagger';
import {
  CABLE_TYPES,
  type DevicePosition,
  type LinkEndpoint,
  type PlacedDevice,
  type TopologyLink,
  type TopologyResponse,
} from '@physnet/shared';
import { NetworkDeviceDto } from '../../devices/dto/device.responses.js';
import { WaypointDto } from './waypoint.dto.js';

export class DevicePositionDto implements DevicePosition {
  @ApiProperty({ description: 'Plan coordinates, px' }) x!: number;
  @ApiProperty() y!: number;
  @ApiProperty({ minimum: 0, maximum: 359, description: 'Degrees' })
  rotation!: number;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class PlacedDeviceDto extends NetworkDeviceDto implements PlacedDevice {
  @ApiProperty({ type: DevicePositionDto }) position!: DevicePositionDto;
}

export class LinkEndpointDto implements LinkEndpoint {
  @ApiProperty({ format: 'uuid' }) portId!: string;
  @ApiProperty({ example: '1' }) portNumber!: string;
  @ApiProperty({ format: 'uuid' }) deviceId!: string;
}

export class TopologyLinkDto implements TopologyLink {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'null for a cable drawn by hand',
  })
  onosLinkId!: string | null;
  @ApiProperty({ format: 'uuid' }) floorPlanId!: string;
  @ApiProperty({ type: LinkEndpointDto }) source!: LinkEndpointDto;
  @ApiProperty({ type: LinkEndpointDto }) destination!: LinkEndpointDto;
  @ApiProperty({ type: [WaypointDto] }) waypoints!: WaypointDto[];
  @ApiProperty({ enum: CABLE_TYPES }) cableType!: string;
  @ApiProperty({ enum: ['ACTIVE', 'DOWN'] }) status!: string;
}

export class TopologyResponseDto implements TopologyResponse {
  @ApiProperty({ format: 'uuid' }) floorPlanId!: string;
  @ApiProperty({ type: [PlacedDeviceDto] }) devices!: PlacedDeviceDto[];
  @ApiProperty({ type: [TopologyLinkDto] }) links!: TopologyLinkDto[];
}
