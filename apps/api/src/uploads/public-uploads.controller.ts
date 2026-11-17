import {
  Controller,
  Ip,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Public } from '../common/decorators/public.decorator';
import { MAX_DOCUMENT_BYTES } from './uploads.constants';
import { UploadsService } from './uploads.service';

@ApiTags('uploads')
@Public()
@Controller('public/uploads')
export class PublicUploadsController {
  constructor(private readonly uploads: UploadsService) {}

  @Post('receipt')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: MAX_DOCUMENT_BYTES } }),
  )
  @ApiConsumes('multipart/form-data')
  @ApiOperation({
    summary: 'آپلود رسید کارت به کارت توسط مشتری (تصویر یا PDF، حداکثر ۵ مگابایت)',
  })
  receipt(
    @Ip() ip: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.uploads.uploadReceipt(`receipt:${ip || 'unknown'}`, file);
  }
}
