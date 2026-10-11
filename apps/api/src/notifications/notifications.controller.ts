import { Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsService } from './notifications.service';

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get('mine')
  @ApiOperation({ summary: 'اعلانات من' })
  mine(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.notifications.listForUser(user.id, limit ? Number(limit) : 30);
  }

  @Get('mine/unread-count')
  @ApiOperation({ summary: 'تعداد اعلانات خوانده‌نشده من' })
  async unread(@CurrentUser() user: AuthUser) {
    return { unread: await this.notifications.unreadCountForUser(user.id) };
  }

  @Patch('mine/:id/read')
  @ApiOperation({ summary: 'خواندن یک اعلان' })
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.notifications.markRead(id, { userId: user.id });
  }

  @Patch('mine/read-all')
  @ApiOperation({ summary: 'خواندن همه اعلانات من' })
  readAll(@CurrentUser() user: AuthUser) {
    return this.notifications.markAllRead({ userId: user.id });
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(private readonly notifications: NotificationsService) {}

  @Get()
  @ApiOperation({ summary: 'اعلانات مدیران' })
  admin(@Query('limit') limit?: string) {
    return this.notifications.listForAdmin(limit ? Number(limit) : 50);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد اعلانات خوانده‌نشده مدیران' })
  async unread() {
    const result = await this.notifications.listForAdmin(1);
    return { unread: result.unread };
  }

  @Patch(':id/read')
  @ApiOperation({ summary: 'خواندن یک اعلان مدیر' })
  read(@Param('id') id: string) {
    return this.notifications.markRead(id, { admin: true });
  }

  @Patch('read-all')
  @ApiOperation({ summary: 'خواندن همه اعلانات مدیران' })
  readAll() {
    return this.notifications.markAllRead({ admin: true });
  }
}
