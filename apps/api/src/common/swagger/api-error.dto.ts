import { ApiProperty } from '@nestjs/swagger';
import type { ApiError } from '@physnet/shared';

export class ApiErrorDto implements ApiError {
  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Not Found' })
  error!: string;

  @ApiProperty({
    oneOf: [{ type: 'string' }, { type: 'array', items: { type: 'string' } }],
    example: 'Floor plan not found',
  })
  message!: string | string[];

  @ApiProperty({ example: '/api/floor-plans/…' })
  path!: string;

  @ApiProperty({ format: 'date-time' })
  timestamp!: string;
}
