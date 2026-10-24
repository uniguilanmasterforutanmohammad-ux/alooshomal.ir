import { ApiPropertyOptional } from '@nestjs/swagger';
import { ModerationDecision, NewsStatus } from '@prisma/client';
import {
  IsEmail,
  IsEnum,
  IsHexColor,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';

/** Approve / reject payload shared by every moderator review queue. */
export class ModeratorDecisionDto {
  @ApiPropertyOptional({ enum: ModerationDecision })
  @IsEnum(ModerationDecision)
  decision!: ModerationDecision;

  @ApiPropertyOptional({ example: 'اطلاعات تماس ناقص است' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

/**
 * Permissive, whitelisted edit payload for a moderator. It carries the union
 * of the editable fields across every content type; the service picks only the
 * fields relevant to the scope being edited. Declaring it as a real DTO (rather
 * than a raw `Record`) means the global `ValidationPipe` still strips unknown
 * keys and validates lengths/formats before anything reaches Prisma.
 */
export class ModeratorContentUpdateDto {
  // shared profile-style fields (biolink / business card)
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  fullName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  jobTitle?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(120)
  company?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  bio?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true })
  website?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  address?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  avatarUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl({ require_protocol: true, require_tld: false })
  logoUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  linkedin?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  instagram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  telegram?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  twitter?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  whatsapp?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsHexColor()
  primaryColor?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  template?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  cityId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  businessId?: string;

  // news fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(600)
  summary?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  categoryId?: string;

  // feed / news body
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(5000)
  body?: string;

  // feed topic
  @ApiPropertyOptional({ nullable: true })
  @IsOptional()
  @IsString()
  topicId?: string | null;

  // moderator may set the moderation status while editing (news editor sends it)
  @ApiPropertyOptional({ enum: NewsStatus })
  @IsOptional()
  @IsEnum(NewsStatus)
  status?: NewsStatus;
}
