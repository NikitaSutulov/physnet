import { ApiProperty } from '@nestjs/swagger';
import type { BuildingFloors, FloorPlanResponse } from '@physnet/shared';

export class FloorPlanResponseDto implements FloorPlanResponse {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ example: 'Поверх 1' }) title!: string;
  @ApiProperty({ example: 'Корпус 18' }) building!: string;
  @ApiProperty({ example: 1 }) floorLevel!: number;
  @ApiProperty({ description: 'Presigned Garage (S3) URL of the image' })
  imageUrl!: string;
  @ApiProperty({ format: 'date-time' }) imageUrlExpiresAt!: string;
  @ApiProperty({ example: 1 }) scale!: number;
  @ApiProperty({ description: 'Image width, px' }) width!: number;
  @ApiProperty({ description: 'Image height, px' }) height!: number;
  @ApiProperty({ format: 'uuid' }) createdBy!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ format: 'date-time' }) updatedAt!: string;
}

export class FloorSummaryDto {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty() title!: string;
  @ApiProperty() floorLevel!: number;
}

export class BuildingFloorsDto implements BuildingFloors {
  @ApiProperty({ example: 'Корпус 18' }) building!: string;
  @ApiProperty({ type: [FloorSummaryDto] }) floors!: FloorSummaryDto[];
}
