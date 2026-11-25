import { ApiProperty } from '@nestjs/swagger';
import type { SyncStatus, SyncSummary } from '@physnet/shared';

export class SyncSummaryDto implements SyncSummary {
  @ApiProperty() devicesCreated!: number;
  @ApiProperty() devicesUpdated!: number;
  @ApiProperty() devicesWentOffline!: number;
  @ApiProperty() portsUpserted!: number;
  @ApiProperty() linksCreated!: number;
  @ApiProperty() linksUpdated!: number;
  @ApiProperty() linksWentDown!: number;
  @ApiProperty({
    description:
      'Cables removed: recabled ports or devices no longer on the plan',
  })
  linksRemoved!: number;
}

export class SyncStatusDto implements SyncStatus {
  @ApiProperty() enabled!: boolean;
  @ApiProperty() intervalMs!: number;
  @ApiProperty() running!: boolean;
  @ApiProperty({ type: Boolean, nullable: true })
  controllerReachable!: boolean | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastRunAt!: string | null;
  @ApiProperty({ type: String, format: 'date-time', nullable: true })
  lastSuccessAt!: string | null;
  @ApiProperty({ type: String, nullable: true }) lastError!: string | null;
  @ApiProperty({ type: SyncSummaryDto, nullable: true })
  lastSummary!: SyncSummaryDto | null;
}
