import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { BusinessModuleGuard } from '../business-modules/business-module.guard';
import { RequireModule } from '../business-modules/require-module.decorator';
import {
  AuthUser,
  CurrentUser,
} from '../common/decorators/current-user.decorator';
import { CreatePropertyFileDto, UpdatePropertyFileDto } from './dto/realestate.dto';
import { RealEstateService } from './realestate.service';

@ApiTags('real-estate')
@ApiBearerAuth()
@UseGuards(BusinessModuleGuard)
@RequireModule('propertyFiles')
@Controller('property-files')
export class PropertyFilesController {
  constructor(private readonly realEstate: RealEstateService) {}

  @Get()
  @ApiOperation({ summary: 'فهرست فایل‌های ملکی (فیلتر وضعیت/نوع معامله/جستجو)' })
  list(
    @CurrentUser() user: AuthUser,
    @Query('status') status?: string,
    @Query('dealType') dealType?: string,
    @Query('neighborhood') neighborhood?: string,
    @Query('q') q?: string,
  ) {
    return this.realEstate.listPropertyFiles(user.id, { status, dealType, neighborhood, q });
  }

  @Post()
  @ApiOperation({ summary: 'ثبت فایل ملکی جدید' })
  create(@CurrentUser() user: AuthUser, @Body() dto: CreatePropertyFileDto) {
    return this.realEstate.createPropertyFile(user.id, dto);
  }

  @Get('duplicates')
  @ApiOperation({ summary: 'بررسی فایل تکراری بر اساس شماره مالک یا نشانی' })
  duplicates(
    @CurrentUser() user: AuthUser,
    @Query('ownerPhone') ownerPhone?: string,
    @Query('address') address?: string,
    @Query('excludeId') excludeId?: string,
  ) {
    return this.realEstate.findDuplicates(user.id, { ownerPhone, address, excludeId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات فایل ملکی همراه بازدیدها و قراردادها' })
  find(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.getPropertyFile(user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش فایل ملکی (شامل تأیید/استعلام)' })
  update(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdatePropertyFileDto,
  ) {
    return this.realEstate.updatePropertyFile(user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف فایل ملکی' })
  remove(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.removePropertyFile(user.id, id);
  }

  @Get(':id/matches')
  @ApiOperation({ summary: 'تقاضاهای فعال متناسب با این فایل' })
  matches(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.matchLeadsForProperty(user.id, id);
  }

  @Post(':id/merge/:duplicateId')
  @ApiOperation({ summary: 'ادغام فایل تکراری در فایل اصلی با حفظ سابقه' })
  merge(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Param('duplicateId') duplicateId: string,
  ) {
    return this.realEstate.mergePropertyFiles(user.id, id, duplicateId);
  }

  @Get(':id/public-link')
  @ApiOperation({ summary: 'وضعیت انتشار و توکن لینک عمومی آگهی' })
  publicLink(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.publicLink(user.id, id);
  }

  @Post(':id/publish')
  @ApiOperation({ summary: 'انتشار عمومی آگهی و ساخت لینک اختصاصی' })
  publish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.publishProperty(user.id, id);
  }

  @Post(':id/unpublish')
  @ApiOperation({ summary: 'لغو انتشار عمومی آگهی' })
  unpublish(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.realEstate.unpublishProperty(user.id, id);
  }
}
