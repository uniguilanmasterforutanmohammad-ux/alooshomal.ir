import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationDecision } from '@prisma/client';
import { IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

export class ModerateBusinessCardDto {
  @ApiProperty({ enum: ModerationDecision, example: ModerationDecision.APPROVED })
  @IsEnum(ModerationDecision)
  decision!: ModerationDecision;

  @ApiPropertyOptional({ example: 'اطلاعات تماس ناقص است' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}
