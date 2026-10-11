import { PartialType } from '@nestjs/swagger';

import { CreateBusinessCardDto } from './create-business-card.dto';

export class UpdateBusinessCardDto extends PartialType(CreateBusinessCardDto) {}
