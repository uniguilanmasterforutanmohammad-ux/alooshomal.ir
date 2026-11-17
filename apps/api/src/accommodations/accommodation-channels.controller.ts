import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { AccommodationChannelsService } from './accommodation-channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { SyncChannelDto } from './dto/sync-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@ApiTags('accommodations')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('accommodationChannels')
@Controller('accommodation-channels')
export class AccommodationChannelsController {
  constructor(private readonly channels: AccommodationChannelsService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست کانال‌های رزرو کسب‌وکار' })
  list(@CurrentUser() user: AuthUser) {
    return this.channels.list(user.id);
  }

  @Post()
  @ApiOperation({ summary: 'افزودن کانال رزرو (بوکینگ، جاباما، اینستاگرام و …)' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreateChannelDto) {
    return this.channels.create(user.id, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش کانال رزرو' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channels.update(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف کانال رزرو' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.channels.remove(user.id, id);
  }

  @Post(':id/sync')
  @ApiOperation({
    summary: 'همگام‌سازی تقویم کانال از فید iCal (ایجاد/حذف خودکار مسدودی‌ها)',
  })
  sync(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: SyncChannelDto,
  ) {
    return this.channels.sync(user.id, id, dto.propertyId);
  }
}
