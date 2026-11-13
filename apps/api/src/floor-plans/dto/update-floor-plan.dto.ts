import { PartialType } from '@nestjs/swagger';
import type { UpdateFloorPlanRequest } from '@physnet/shared';
import { CreateFloorPlanDto } from './create-floor-plan.dto.js';

export class UpdateFloorPlanDto
  extends PartialType(CreateFloorPlanDto)
  implements UpdateFloorPlanRequest {}
