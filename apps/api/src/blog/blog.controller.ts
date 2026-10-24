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
import { BlogService } from './blog.service';
import {
  CreateBlogCategoryDto,
  CreateBlogPostDto,
  ListBlogQueryDto,
  UpdateBlogPostDto,
} from './dto/blog.dto';

// ---------------------------------------------------------------------------
//  Public «بلاگ»
// ---------------------------------------------------------------------------

@ApiTags('blog')
@Controller('blog')
export class BlogPublicController {
  constructor(private readonly blog: BlogService) {}

  @Public()
  @Get('public')
  @ApiOperation({ summary: 'لیست مطالب منتشرشده بلاگ با جست‌وجو و فیلتر' })
  list(@Query() query: ListBlogQueryDto) {
    return this.blog.publicList(query);
  }

  @Public()
  @Get('public/latest')
  @ApiOperation({ summary: 'جدیدترین مطالب بلاگ (برای صفحه اصلی)' })
  latest(@Query('limit') limit?: string) {
    return this.blog.publicLatest(limit ? Number(limit) : undefined);
  }

  @Public()
  @Get('public/categories')
  @ApiOperation({ summary: 'دسته‌بندی‌های فعال بلاگ' })
  categories() {
    return this.blog.publicCategories();
  }

  @Public()
  @Get('public/:slug')
  @ApiOperation({ summary: 'جزئیات یک مطلب بلاگ با نامک' })
  detail(@Param('slug') slug: string) {
    return this.blog.publicBySlug(slug);
  }
}

// ---------------------------------------------------------------------------
//  Admin «بلاگ»
// ---------------------------------------------------------------------------

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/blog')
export class AdminBlogController {
  constructor(private readonly blog: BlogService) {}

  @Get()
  @ApiOperation({ summary: 'همه مطالب بلاگ (مدیر)' })
  list(@Query() query: ListBlogQueryDto) {
    return this.blog.adminList(query);
  }

  // Static routes before the `:id` route so they never get captured by it.
  @Get('categories')
  @ApiOperation({ summary: 'مدیریت دسته‌بندی‌های بلاگ' })
  categories() {
    return this.blog.listCategories(false);
  }

  @Post('categories')
  @ApiOperation({ summary: 'افزودن دسته‌بندی بلاگ' })
  createCategory(@Body() dto: CreateBlogCategoryDto) {
    return this.blog.createCategory(dto);
  }

  @Patch('categories/:id')
  @ApiOperation({ summary: 'ویرایش دسته‌بندی بلاگ' })
  updateCategory(
    @Param('id') id: string,
    @Body() data: { name?: string; isActive?: boolean },
  ) {
    return this.blog.updateCategory(id, data);
  }

  @Delete('categories/:id')
  @ApiOperation({ summary: 'حذف دسته‌بندی بلاگ' })
  removeCategory(@Param('id') id: string) {
    return this.blog.removeCategory(id);
  }

  @Post()
  @ApiOperation({ summary: 'ثبت مطلب بلاگ جدید' })
  create(@CurrentUser() admin: AuthUser, @Body() dto: CreateBlogPostDto) {
    return this.blog.create(admin.id, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک مطلب بلاگ (مدیر)' })
  detail(@Param('id') id: string) {
    return this.blog.adminById(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'ویرایش مطلب بلاگ' })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateBlogPostDto,
  ) {
    return this.blog.update(admin.id, id, dto);
  }

  @Patch(':id/publish')
  @ApiOperation({ summary: 'انتشار یا برداشتن مطلب بلاگ' })
  publish(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body('isPublished') isPublished: boolean,
  ) {
    return this.blog.setPublished(admin.id, id, Boolean(isPublished));
  }

  @Delete(':id')
  @ApiOperation({ summary: 'حذف مطلب بلاگ' })
  remove(@Param('id') id: string) {
    return this.blog.remove(id);
  }
}
