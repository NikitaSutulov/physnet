import { ApiProperty, getSchemaPath } from '@nestjs/swagger';
import {
  INTENT_TYPES,
  type IntentState,
  type IntentType,
  type PolicyPayload,
  type RoutingPolicyResponse,
} from '@physnet/shared';
import { HostToHostDto, PointToPointDto } from './policy.dto.js';

const INTENT_STATES: IntentState[] = [
  'INSTALLED',
  'INSTALLING',
  'COMPILING',
  'RECOMPILING',
  'WITHDRAWING',
  'WITHDRAWN',
  'FAILED',
  'CORRUPT',
  'NOT_APPLIED',
  'MISSING',
  'UNKNOWN',
];

class PolicyCreatorDto {
  @ApiProperty() firstName!: string;
  @ApiProperty() lastName!: string;
}

export class RoutingPolicyResponseDto implements RoutingPolicyResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'physnet-5f0c…',
    description: 'Key of the intent in ONOS while the policy is applied',
  })
  intentKey!: string | null;
  @ApiProperty({ enum: INTENT_TYPES }) intentType!: IntentType;
  @ApiProperty({
    oneOf: [
      { $ref: getSchemaPath(HostToHostDto) },
      { $ref: getSchemaPath(PointToPointDto) },
    ],
  })
  payload!: PolicyPayload;
  @ApiProperty() isApplied!: boolean;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ type: PolicyCreatorDto }) creator!: PolicyCreatorDto;
  @ApiProperty({
    enum: INTENT_STATES,
    description:
      'Live state from ONOS: NOT_APPLIED for a template, MISSING when ONOS ' +
      'lost the intent, UNKNOWN when the controller is unreachable',
  })
  state!: IntentState;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}
