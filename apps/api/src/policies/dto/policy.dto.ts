import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  INTENT_TYPES,
  IP_PROTOCOLS,
  type IntentType,
  type IpProtocol,
} from '@physnet/shared';

const IPV4_OCTET = '(25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]?\\d)';
const IPV4_CIDR = new RegExp(
  `^(${IPV4_OCTET}\\.){3}${IPV4_OCTET}(/(3[0-2]|[12]?\\d))?$`,
);

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

class PriorityDto {
  @ApiPropertyOptional({ minimum: 1, maximum: 65535, default: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  priority?: number;
}

export class PolicyPayloadDto extends PriorityDto {
  @ApiProperty({ enum: INTENT_TYPES })
  @IsIn(INTENT_TYPES)
  type!: IntentType;
}

export class HostToHostDto extends PolicyPayloadDto {
  @ApiProperty({ enum: ['HostToHostIntent'] })
  @IsIn(['HostToHostIntent'])
  declare type: 'HostToHostIntent';

  @ApiProperty({ description: 'ONOS host id, e.g. 8A:6E:BA:3F:4A:73/None' })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  one!: string;

  @ApiProperty()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  two!: string;
}

export class ConnectPointDto {
  @ApiProperty({ description: 'ONOS device id, e.g. of:0000000000000001' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  device!: string;

  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(/^\d+$/, { message: 'port must be a port number' })
  port!: string;
}

export class TrafficSelectorDto {
  @ApiPropertyOptional({ example: '10.0.0.1/32' })
  @IsOptional()
  @Matches(IPV4_CIDR, { message: 'ipSrc must be an IPv4 address or CIDR' })
  ipSrc?: string;

  @ApiPropertyOptional({ example: '10.0.0.0/24' })
  @IsOptional()
  @Matches(IPV4_CIDR, { message: 'ipDst must be an IPv4 address or CIDR' })
  ipDst?: string;

  @ApiPropertyOptional({ enum: IP_PROTOCOLS })
  @IsOptional()
  @IsIn(IP_PROTOCOLS)
  protocol?: IpProtocol;

  @ApiPropertyOptional({ minimum: 1, maximum: 65535 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  dstPort?: number;
}

export class PointToPointDto extends PolicyPayloadDto {
  @ApiProperty({ enum: ['PointToPointIntent'] })
  @IsIn(['PointToPointIntent'])
  declare type: 'PointToPointIntent';

  @ApiProperty({ type: ConnectPointDto })
  @ValidateNested()
  @Type(() => ConnectPointDto)
  ingressPoint!: ConnectPointDto;

  @ApiProperty({ type: ConnectPointDto })
  @ValidateNested()
  @Type(() => ConnectPointDto)
  egressPoint!: ConnectPointDto;

  @ApiPropertyOptional({ type: TrafficSelectorDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => TrafficSelectorDto)
  selector?: TrafficSelectorDto;
}

export type PolicyPayloadInput = HostToHostDto | PointToPointDto;

const payloadType = {
  discriminator: {
    property: 'type',
    subTypes: [
      { value: HostToHostDto, name: 'HostToHostIntent' },
      { value: PointToPointDto, name: 'PointToPointIntent' },
    ],
  },
  keepDiscriminatorProperty: true,
};

export class CreatePolicyDto {
  @ApiProperty({ maxLength: 255 })
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name!: string;

  @ApiProperty({
    oneOf: [
      { $ref: '#/components/schemas/HostToHostDto' },
      { $ref: '#/components/schemas/PointToPointDto' },
    ],
  })
  @ValidateNested()
  @Type(() => PolicyPayloadDto, payloadType)
  payload!: PolicyPayloadInput;
}

export class UpdatePolicyDto {
  @ApiPropertyOptional({ maxLength: 255 })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @ValidateNested()
  @Type(() => PolicyPayloadDto, payloadType)
  payload?: PolicyPayloadInput;
}
