import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';

export class GoogleDriveSettingsDto {
  @ApiPropertyOptional({ example: '1234567890-abc.apps.googleusercontent.com' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  clientId?: string;

  @ApiPropertyOptional({ description: 'Client secret اپلیکیشن Google' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  clientSecret?: string;

  @ApiPropertyOptional({ description: 'Refresh token با دسترسی drive.file' })
  @IsOptional()
  @IsString()
  @MaxLength(2000)
  refreshToken?: string;

  @ApiPropertyOptional({ description: 'شناسه‌ی پوشه‌ی مقصد در Google Drive' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  folderId?: string;
}

export class S3DestinationSettingsDto {
  @ApiPropertyOptional({ example: 's3.example.com' })
  @IsOptional()
  @IsString()
  @MaxLength(300)
  endpoint?: string;

  @ApiPropertyOptional({ example: 443 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  useSSL?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  accessKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  secretKey?: string;

  @ApiPropertyOptional({ example: 'alooshomal-backups' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bucket?: string;

  @ApiPropertyOptional({ example: 'eu-central-1' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  region?: string;

  @ApiPropertyOptional({ example: 'alooshomal' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  prefix?: string;
}

export class WebdavSettingsDto {
  @ApiPropertyOptional({ example: 'https://cloud.example.com/remote.php/dav/files/user' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  baseUrl?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(200)
  username?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(300)
  password?: string;

  @ApiPropertyOptional({ example: 'alooshomal-backups' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  folder?: string;
}

export class UpdateBackupSettingsDto {
  @ApiPropertyOptional({ example: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  retention?: number;

  @ApiPropertyOptional({ type: GoogleDriveSettingsDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => GoogleDriveSettingsDto)
  googleDrive?: GoogleDriveSettingsDto | null;

  @ApiPropertyOptional({ type: S3DestinationSettingsDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => S3DestinationSettingsDto)
  s3?: S3DestinationSettingsDto | null;

  @ApiPropertyOptional({ type: WebdavSettingsDto, nullable: true })
  @IsOptional()
  @ValidateNested()
  @Type(() => WebdavSettingsDto)
  webdav?: WebdavSettingsDto | null;
}
