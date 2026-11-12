import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { Observable, Subscription } from 'rxjs';

import { StreamTicketService } from '../auth/stream-ticket.service';
import { AuthUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ListSupportConversationsDto } from './dto/list-support-conversations.dto';
import { SendSupportMessageDto } from './dto/send-support-message.dto';
import { UpdateSupportSmsDto } from './dto/update-support-sms.dto';
import { UpdateSupportConversationDto } from './dto/update-support-conversation.dto';
import {
  SupportChatEventsService,
  SupportChatSignal,
} from './support-chat-events.service';
import { SupportChatService } from './support-chat.service';

/**
 * Pipe the in-process chat event stream to the browser as SSE. A comment line
 * every 25s keeps intermediate proxies from closing the idle connection.
 */
function openSseStream(
  res: Response,
  req: Request,
  events: Observable<SupportChatSignal>,
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

  send(`data: ${JSON.stringify({ type: 'ready' })}\n\n`);
  const sub = events.subscribe((signal) => {
    send(`data: ${JSON.stringify(signal)}\n\n`);
  });
  const ping = setInterval(() => send(': ping\n\n'), 25_000);

  req.on('close', () => {
    clearInterval(ping);
    sub.unsubscribe();
  });
  return sub;
}

@ApiTags('support-chat')
@ApiBearerAuth()
@Controller('support/chat')
export class SupportChatController {
  constructor(
    private readonly chat: SupportChatService,
    private readonly events: SupportChatEventsService,
    private readonly tickets: StreamTicketService,
  ) {}

  @Get('me')
  @ApiOperation({ summary: 'گفتگوی پشتیبانی جاری من (باز یا آخرین گفتگو)' })
  current(@CurrentUser() user: AuthUser) {
    return this.chat.currentForUser(user.id);
  }

  @Get('me/conversations')
  @ApiOperation({ summary: 'تاریخچه‌ی گفتگوهای پشتیبانی من' })
  history(
    @CurrentUser() user: AuthUser,
    @Query() query: ListSupportConversationsDto,
  ) {
    return this.chat.historyForUser(user.id, query);
  }

  @Get('me/conversations/:id')
  @ApiOperation({ summary: 'جزئیات یک گفتگوی پشتیبانی من' })
  detail(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.findForUser(user.id, id);
  }

  @Post('me/messages')
  @ApiOperation({ summary: 'ارسال پیام پشتیبانی (ایجاد خودکار گفتگو در صورت نیاز)' })
  send(@CurrentUser() user: AuthUser, @Body() dto: SendSupportMessageDto) {
    return this.chat.sendUserMessage(user.id, dto);
  }

  @Post('me/read')
  @ApiOperation({ summary: 'خواندن پیام‌های گفتگوی باز جاری' })
  readCurrent(@CurrentUser() user: AuthUser) {
    return this.chat.markUserRead(user.id);
  }

  @Post('me/conversations/:id/read')
  @ApiOperation({ summary: 'خواندن پیام‌های یک گفتگوی من' })
  read(@CurrentUser() user: AuthUser, @Param('id') id: string) {
    return this.chat.markUserRead(user.id, id);
  }

  @Post('me/close')
  @ApiOperation({ summary: 'بستن گفتگوی پشتیبانی جاری' })
  close(@CurrentUser() user: AuthUser) {
    return this.chat.closeForUser(user.id);
  }

  @Get('me/unread-count')
  @ApiOperation({ summary: 'تعداد پیام‌های خوانده‌نشده‌ی پشتیبانی من' })
  unread(@CurrentUser() user: AuthUser) {
    return this.chat.unreadForUser(user.id);
  }

  @Get('me/stream-ticket')
  @ApiOperation({ summary: 'صدور تیکت یک‌بارمصرف برای جریان زنده‌ی گفتگو' })
  streamTicket(@CurrentUser() user: AuthUser) {
    return this.tickets.issue(user.id, false);
  }

  @Get('me/stream')
  @ApiOperation({ summary: 'جریان زنده‌ی پیام‌های پشتیبانی من (SSE)' })
  @Public()
  async stream(
    @Query('ticket') ticket: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const grant = ticket ? await this.tickets.consume(ticket) : null;
    if (!grant || grant.admin) {
      res.status(401).json({ message: 'تیکت جریان نامعتبر است' });
      return;
    }
    openSseStream(res, req, this.events.forUser(grant.userId));
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(RolesGuard)
@Roles('ADMIN')
@Controller('admin/support/chat')
export class AdminSupportChatController {
  constructor(
    private readonly chat: SupportChatService,
    private readonly events: SupportChatEventsService,
    private readonly tickets: StreamTicketService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'فهرست گفتگوهای پشتیبانی آنلاین (مدیر)' })
  list(@Query() query: ListSupportConversationsDto) {
    return this.chat.listForAdmin(query);
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'تعداد پیام‌های خوانده‌نشده و گفتگوهای باز (مدیر)' })
  unread() {
    return this.chat.unreadForAdmin();
  }

  @Get('sms-settings')
  @ApiOperation({
    summary: 'تنظیمات پیامک هشدار پیام جدید پشتیبانی (شماره و فعال‌بودن)',
  })
  smsSettings() {
    return this.chat.getSmsSettings();
  }

  @Patch('sms-settings')
  @ApiOperation({
    summary:
      'ذخیره‌ی شماره‌ی خط ادمین و سوئیچ پیامک هشدار پشتیبانی (خالی = شماره‌ی حساب ادمین)',
  })
  updateSmsSettings(@Body() dto: UpdateSupportSmsDto) {
    return this.chat.updateSmsSettings(dto);
  }

  @Get('stream-ticket')
  @ApiOperation({ summary: 'صدور تیکت یک‌بارمصرف برای جریان زنده‌ی صندوق پشتیبانی' })
  streamTicket(@CurrentUser() admin: AuthUser) {
    return this.tickets.issue(admin.id, true);
  }

  @Get('stream')
  @ApiOperation({ summary: 'جریان زنده‌ی صندوق پشتیبانی (SSE، مدیر)' })
  @Public()
  async stream(
    @Query('ticket') ticket: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    const grant = ticket ? await this.tickets.consume(ticket) : null;
    if (!grant || !grant.admin) {
      res.status(401).json({ message: 'تیکت جریان نامعتبر است' });
      return;
    }
    openSseStream(res, req, this.events.forAdmins());
  }

  @Get(':id')
  @ApiOperation({ summary: 'جزئیات یک گفتگوی پشتیبانی (مدیر)' })
  detail(@Param('id') id: string) {
    return this.chat.findForAdmin(id);
  }

  @Post(':id/messages')
  @ApiOperation({ summary: 'پاسخ مدیر در گفتگوی پشتیبانی' })
  reply(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: SendSupportMessageDto,
  ) {
    return this.chat.sendStaffMessage(admin.id, id, dto);
  }

  @Post(':id/read')
  @ApiOperation({ summary: 'خواندن پیام‌های کاربر در یک گفتگو (مدیر)' })
  read(@Param('id') id: string) {
    return this.chat.markStaffRead(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'تغییر وضعیت یا واگذاری گفتگوی پشتیبانی (مدیر)' })
  update(
    @CurrentUser() admin: AuthUser,
    @Param('id') id: string,
    @Body() dto: UpdateSupportConversationDto,
  ) {
    return this.chat.updateForAdmin(admin.id, id, dto);
  }
}
