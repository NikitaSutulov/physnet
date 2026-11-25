import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  SYSTEM_EVENT_TYPES,
  type SystemEvent,
  type SystemEventSeverity,
  type SystemEventType,
} from '@physnet/shared';

export class SystemEventDto implements SystemEvent {
  @ApiProperty() id!: string;
  @ApiProperty({ enum: SYSTEM_EVENT_TYPES }) type!: SystemEventType;
  @ApiProperty({ enum: ['info', 'warning', 'critical'] })
  severity!: SystemEventSeverity;
  @ApiProperty({ example: 'Лінія s1/1 ↔ s2/3 розірвана' }) message!: string;
  @ApiProperty({ format: 'date-time' }) occurredAt!: string;
  @ApiPropertyOptional({ format: 'uuid' }) deviceId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) portId?: string;
  @ApiPropertyOptional({ format: 'uuid' }) linkId?: string;
  @ApiPropertyOptional({ type: [String] }) floorPlanIds?: string[];
  @ApiPropertyOptional({ type: 'object', additionalProperties: true })
  data?: Record<string, unknown>;
}
