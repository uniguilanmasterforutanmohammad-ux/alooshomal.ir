import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { NewsStatus } from '@prisma/client';

import { MODERATOR_SCOPES, ModeratorScope } from '../auth/moderator-scopes';
import { ModeratorScopeGuard } from '../auth/moderator-scope.guard';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import {
  ModeratorContentUpdateDto,
  ModeratorDecisionDto,
} from './dto/moderator-content.dto';
import { ModeratorService } from './moderator.service';

/**
 * Limited «کاربر ادمین» review API. Reachable by super admins and moderators;
 * each endpoint additionally requires the matching content scope via
 * `@RequireScope`, so a moderator only ever sees and acts on the queues the
 * super admin granted them.
 */
@ApiTags('moderator')
@ApiBearerAuth()
@UseGuards(RolesGuard, ModeratorScopeGuard)
@Roles('MODERATOR', 'ADMIN')
@Controller('moderator')
export class ModeratorController {
  constructor(private readonly moderator: ModeratorService) {}

  private async context(user: AuthUser) {
    return this.moderator.resolveContext(user);
  }

  @Get('me')
  @ApiOperation({ summary: 'سطح دسترسی‌های کاربر ادمین جاری' })
  async me(@CurrentUser() user: AuthUser) {
    const context = await this.context(user);
    const overview = await this.moderator.overview(context);
    return {
      id: context.id,
      email: context.email,
      fullName: context.fullName,
      role: context.role,
      scopes: context.scopes,
      scopeMeta: MODERATOR_SCOPES.map((scope) => ({ scope })),
      pending: overview.pending,
    };
  }

  @Get('topics')
  @ApiOperation({ summary: 'موضوع‌های فید (برای فرم ویرایش پست)' })
  topics() {
    return this.moderator.listTopics();
  }

  @Get('news-categories')
  @ApiOperation({ summary: 'دسته‌بندی‌های خبری (برای فرم ویرایش خبر)' })
  newsCategories() {
    return this.moderator.listNewsCategories();
  }

  @Get('queue/:scope')
  @ApiOperation({ summary: 'فهرست اقلام یک صف بررسی' })
  async queue(
    @CurrentUser() user: AuthUser,
    @Param('scope') scope: ModeratorScope,
    @Query('status') status?: NewsStatus,
  ) {
    const context = await this.context(user);
    return this.moderator.list(context, scope, status);
  }

  @Get('item/:scope/:id')
  @ApiOperation({ summary: 'جزئیات کامل یک قلم برای بررسی' })
  async item(
    @CurrentUser() user: AuthUser,
    @Param('scope') scope: ModeratorScope,
    @Param('id') id: string,
  ) {
    const context = await this.context(user);
    return this.moderator.getItem(context, scope, id);
  }

  @Patch('item/:scope/:id')
  @ApiOperation({ summary: 'ویرایش زندهٔ یک قلم توسط کاربر ادمین' })
  async update(
    @CurrentUser() user: AuthUser,
    @Param('scope') scope: ModeratorScope,
    @Param('id') id: string,
    @Body() body: ModeratorContentUpdateDto,
  ) {
    const context = await this.context(user);
    return this.moderator.update(context, scope, id, body);
  }

  @Patch('item/:scope/:id/decide')
  @ApiOperation({ summary: 'تأیید یا رد یک قلم توسط کاربر ادمین' })
  async decide(
    @CurrentUser() user: AuthUser,
    @Param('scope') scope: ModeratorScope,
    @Param('id') id: string,
    @Body() dto: ModeratorDecisionDto,
  ) {
    const context = await this.context(user);
    return this.moderator.decide(context, scope, id, dto.decision, dto.reason);
  }
}
