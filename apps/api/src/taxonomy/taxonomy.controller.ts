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

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTaxonomyRequestDto } from './dto/create-taxonomy-request.dto';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { SearchNeighborhoodDto } from './dto/search-neighborhood.dto';
import { SearchTaxonomyNodeDto } from './dto/search-taxonomy-node.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomyService } from './taxonomy.service';

// ---- public read endpoints (used by the biolink form) ----

@ApiTags('taxonomy')
@Controller('cities')
export class CitiesController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary:
      'فهرست شهرهای فعال؛ شهرهای اصلی (تنکابن، خرم‌آباد، شیرود، رامسر) همیشه اول و به همین ترتیب می‌آیند',
  })
  list() {
    return this.taxonomy.list('city', true);
  }
}

@ApiTags('taxonomy')
@Controller('businesses')
export class BusinessesController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'فهرست کسب‌وکارهای فعال' })
  list() {
    return this.taxonomy.list('business', true);
  }
}

@ApiTags('taxonomy')
@Controller('business-taxonomy')
export class BusinessTaxonomyController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Public()
  @Get('search')
  @ApiOperation({
    summary:
      'جست‌وجوی «زیرشاخه» و در صورت نبود نتیجه «زیردسته» برای کادر جست‌وجوی فرم ساخت بیولینک/کارت ویزیت/کسب‌وکار',
  })
  search(@Query() query: SearchTaxonomyNodeDto) {
    return this.taxonomy.searchNodes(query);
  }

  @Public()
  @Get('neighborhoods')
  @ApiOperation({
    summary:
      'پیشنهادهای «محله» برای کادر جست‌وجوی محله؛ مقدار آزاد است و کاربر می‌تواند عبارت تازه هم وارد کند',
  })
  neighborhoods(@Query() query: SearchNeighborhoodDto) {
    return this.taxonomy.searchNeighborhoods(query);
  }

  @Post('requests')
  @ApiBearerAuth()
  @ApiOperation({
    summary:
      'ثبت عبارتی که در کادر زیردسته/زیرشاخه یافت نشد؛ برای مدیران ارسال می‌شود و به کاربر «سایر» نمایش داده می‌شود',
  })
  request(@CurrentUser() user: AuthUser, @Body() dto: CreateTaxonomyRequestDto) {
    return this.taxonomy.requestNode(user, dto);
  }
}

// ---- admin management endpoints ----

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/cities')
export class AdminCitiesController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get()
  @ApiOperation({ summary: 'مدیریت شهرها — فهرست کامل' })
  list() {
    return this.taxonomy.list('city');
  }

  @Post()
  @ApiOperation({ summary: 'افزودن شهر' })
  create(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomy.create('city', dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش یا فعال/غیرفعال کردن شهر' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomy.update('city', id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف شهر' })
  remove(@Param('id') id: string) {
    return this.taxonomy.remove('city', id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/businesses')
export class AdminBusinessesController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Get()
  @ApiOperation({ summary: 'مدیریت کسب‌وکارها — فهرست کامل' })
  list() {
    return this.taxonomy.list('business');
  }

  @Post()
  @ApiOperation({ summary: 'افزودن کسب‌وکار' })
  create(@Body() dto: CreateTaxonomyDto) {
    return this.taxonomy.create('business', dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش یا فعال/غیرفعال کردن کسب‌وکار' })
  update(@Param('id') id: string, @Body() dto: UpdateTaxonomyDto) {
    return this.taxonomy.update('business', id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف کسب‌وکار' })
  remove(@Param('id') id: string) {
    return this.taxonomy.remove('business', id);
  }
}
