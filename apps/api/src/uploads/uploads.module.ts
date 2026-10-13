import { Module } from '@nestjs/common';

import { ImageService } from './image.service';
import { StorageService } from './storage.service';
import { UploadsController } from './uploads.controller';
import { UploadsService } from './uploads.service';

@Module({
  controllers: [UploadsController],
  providers: [StorageService, ImageService, UploadsService],
  exports: [UploadsService, StorageService],
})
export class UploadsModule {}
