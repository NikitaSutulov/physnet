import { PartialType } from '@nestjs/swagger';
import { CreateAdministratorDto } from './create-administrator.dto.js';

export class UpdateAdministratorDto extends PartialType(
  CreateAdministratorDto,
) {}
