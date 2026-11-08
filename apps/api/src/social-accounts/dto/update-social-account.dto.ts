import { PartialType } from '@nestjs/swagger';

import { CreateSocialAccountDto } from './create-social-account.dto';

/**
 * Same shape as create, every field optional. Leaving `password` out keeps the
 * stored secret untouched; sending a new one rotates it and stamps
 * `lastRotatedAt`.
 */
export class UpdateSocialAccountDto extends PartialType(CreateSocialAccountDto) {}
