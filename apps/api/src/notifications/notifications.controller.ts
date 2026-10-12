import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Subscription } from 'rxjs';

import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { NotificationsEventsService } from './notifications-events.service';
import { NotificationsService } from './notifications.service';

/**
 * Stream `data: {"unread": n}` whenever something new lands, so the bell badge
 * updates the moment an event happens — no full-page refresh and no polling.
 * A comment line every 25s keeps intermediate proxies from closing the stream.
 */
function openSseStream(
  res: Response,
  req: Request,
  events: import('rxjs').Observable<import('./notifications-events.service').NotificationSignal>,
  countUnread: () => Promise<number>,
): Subscription {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  const send = (payload: string) => {
    try {
      res.write(payload);
    } catch {
      /* client vanished */
    }
  };

  void countUnread().then((unread) => send(`data: ${JSON.stringify({ unread })}\n\n`));

  const sub = events.subscribe(() => {
    void countUnread().then((unread) => send(`data: ${JSON.stringify({ unread })}\n\n`));
  });

  const ping = setInterval(() => send(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(ping);
    sub.unsubscribe();
  });
  return sub;
}

@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: NotificationsEventsService,
  ) {}

  @Get('mine')
  @ApiOperation({ summary: 'اعلانات خوانده‌نشده‌ی من (برای زنگ اعلان)' })
  mine(@CurrentUser() user: AuthUser, @Query('limit') limit?: string) {
    return this.notifications.listForUser(user.id, limit ? Number(limit) : 30);
  }

  @Get('mine/page')
  @ApiOperation({ summary: 'تاریخچه‌ی کامل اعلانات من (خوانده + خوانده‌نشده)' })
  minePage(
    @CurrentUser() user: AuthUser,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.notifications.pageForUser(
      user.id,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
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

  @Get('mine/stream')
  @ApiOperation({ summary: 'جریان زنده اعلانات من (SSE)' })
  stream(@CurrentUser() user: AuthUser, @Req() req: Request, @Res() res: Response) {
    openSseStream(res, req, this.events.forUser(user.id), () =>
      this.notifications.unreadCountForUser(user.id),
    );
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/notifications')
export class AdminNotificationsController {
  constructor(
    private readonly notifications: NotificationsService,
    private readonly events: NotificationsEventsService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'اعلانات خوانده‌نشده‌ی مدیران (برای زنگ اعلان)' })
  admin(@Query('limit') limit?: string) {
    return this.notifications.listForAdmin(limit ? Number(limit) : 50);
  }

  @Get('page')
  @ApiOperation({ summary: 'تاریخچه‌ی کامل اعلانات مدیران (خوانده + خوانده‌نشده)' })
  adminPage(@Query('page') page?: string, @Query('limit') limit?: string) {
    return this.notifications.pageForAdmin(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
    );
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

  @Get('stream')
  @ApiOperation({ summary: 'جریان زنده اعلانات مدیران (SSE)' })
  stream(@Req() req: Request, @Res() res: Response) {
    openSseStream(res, req, this.events.forAdmins(), async () => {
      const result = await this.notifications.listForAdmin(1);
      return result.unread;
    });
  }
}
