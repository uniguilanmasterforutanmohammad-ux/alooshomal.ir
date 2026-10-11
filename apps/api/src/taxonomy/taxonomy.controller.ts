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

import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { CreateTaxonomyDto } from './dto/create-taxonomy.dto';
import { UpdateTaxonomyDto } from './dto/update-taxonomy.dto';
import { TaxonomyService } from './taxonomy.service';

// ---- public read endpoints (used by the biolink form) ----

@ApiTags('taxonomy')
@Controller('cities')
export class CitiesController {
  constructor(private readonly taxonomy: TaxonomyService) {}

  @Public()
  @Get()
  @ApiOperation({ summary: 'فهرست شهرهای فعال' })
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
