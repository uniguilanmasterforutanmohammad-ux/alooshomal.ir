import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { AccommodationsService } from './accommodations.service';
import { UpdateAccommodationAiSettingsDto } from './dto/accommodation-ai-settings.dto';

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/accommodations')
export class AdminAccommodationsController {
  constructor(private readonly accommodations: AccommodationsService) {}

  @Get('settings')
  @ApiOperation({
    summary: 'تنظیمات ماژول اقامتگاه: تعرفه‌ی ایمپورت هوش مصنوعی از جاباما',
  })
  settings() {
    return this.accommodations.getAiImportSettings();
  }

  @Patch('settings')
  @ApiOperation({
    summary: 'ذخیره‌ی تنظیمات ماژول اقامتگاه (تعرفه و حداقل تصاویر ایمپورت)',
  })
  updateSettings(@Body() dto: UpdateAccommodationAiSettingsDto) {
    return this.accommodations.updateAiImportSettings(dto);
  }
}
