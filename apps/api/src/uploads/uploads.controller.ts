import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { UploadsService } from './uploads.service';
import { MAX_DOCUMENT_BYTES, MAX_UPLOAD_BYTES } from './uploads.constants';

const fileInterceptor = () =>
  FileInterceptor('file', { limits: { fileSize: MAX_UPLOAD_BYTES } });

const documentInterceptor = () =>
  FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } });

@ApiTags('uploads')
@ApiBearerAuth()
@Controller('uploads')
export class UploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('logo')
  @UseInterceptors(fileInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود لوگو (تبدیل به WebP + تغییر اندازه)' })
  logo(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.upload('logo', user.id, file);
  }

  @Post('avatar')
  @UseInterceptors(fileInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود تصویر پروفایل (مربع، WebP)' })
  avatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.upload('avatar', user.id, file);
  }

  @Post('gallery')
  @UseInterceptors(fileInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'آپلود تصویر گالری کسب‌وکار (WebP)' })
  gallery(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.upload('gallery', user.id, file);
  }

  @Post('document')
  @UseInterceptors(documentInterceptor())
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'آپلود مدرک/جواز کسب‌وکار (PDF یا تصویر، حداکثر ۵ مگابایت)',
  })
  document(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.uploadDocument(user.id, file);
  }
}
