import { PartialType } from '@nestjs/swagger';

import { CreateBiolinkDto } from './create-biolink.dto';

export class UpdateBiolinkDto extends PartialType(CreateBiolinkDto) {}
