import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

const trim = ({ value }: { value: unknown }) =>
  typeof value === 'string' ? value.trim() : value;

export class CreateFloorPlanDto {
  @ApiProperty({ example: 'Корпус 18, поверх 3' })
  @Transform(trim)
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @ApiPropertyOptional({ example: 'Корпус 18', default: '' })
  @IsOptional()
  @Transform(trim)
  @IsString()
  @MaxLength(255)
  building?: string;

  @ApiPropertyOptional({ example: 3, default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(-10)
  @Max(200)
  floorLevel?: number;

  @ApiPropertyOptional({
    example: 1,
    default: 1,
    description: 'Base canvas scale coefficient',
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @IsPositive()
  @Max(100)
  scale?: number;
}
