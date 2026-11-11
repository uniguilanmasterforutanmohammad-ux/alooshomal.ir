import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  NotificationType,
  Prisma,
  SupportChatSender,
  SupportChatStatus,
} from '@prisma/client';

import { ActivityService } from '../activity/activity.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { ListSupportConversationsDto } from './dto/list-support-conversations.dto';
import { SendSupportMessageDto } from './dto/send-support-message.dto';
import { UpdateSupportConversationDto } from './dto/update-support-conversation.dto';
import { SupportChatEventsService } from './support-chat-events.service';

const WELCOME_MESSAGE =
  'سلام! به پشتیبانی آنلاین شمالی کارت خوش آمدید. پیام خود را بنویسید؛ همکاران ما در اولین فرصت پاسخ می‌دهند.';

const senderSelect = {
  id: true,
  fullName: true,
  email: true,
  role: true,
} as const;

const messageInclude = { sender: { select: senderSelect } } as const;

const conversationInclude = {
  user: {
    select: { id: true, email: true, phone: true, fullName: true, role: true },
  },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: messageInclude,
  },
} as const;

const listInclude = {
  user: {
    select: { id: true, email: true, phone: true, fullName: true, role: true },
  },
  assignedTo: { select: { id: true, fullName: true, email: true } },
  messages: {
    orderBy: { createdAt: 'desc' as const },
    take: 1,
    include: messageInclude,
  },
  _count: { select: { messages: true } },
} as const;

@Injectable()
export class SupportChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly events: SupportChatEventsService,
    private readonly notifications: NotificationsService,
    private readonly activity: ActivityService,
  ) {}

  /** The open conversation, or the most recent one when the user has none open. */
  async currentForUser(userId: string) {
    const open = await this.prisma.supportConversation.findFirst({
      where: { userId, status: SupportChatStatus.OPEN },
      orderBy: { lastMessageAt: 'desc' },
      include: conversationInclude,
    });
    if (open) return open;

    return this.prisma.supportConversation.findFirst({
      where: { userId },
      orderBy: { lastMessageAt: 'desc' },
      include: conversationInclude,
    });
  }

  async historyForUser(userId: string, query: ListSupportConversationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where: Prisma.SupportConversationWhereInput = { userId };
    if (query.status) where.status = query.status;

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: listInclude,
      }),
      this.prisma.supportConversation.count({ where }),
    ]);

    return { items, meta: this.meta(page, limit, total) };
  }

  async findForUser(userId: string, id: string) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
      include: conversationInclude,
    });
    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('گفتگو یافت نشد');
    }
    return conversation;
  }

  /**
   * Send a user message. When the user has no open conversation (or targets a
   * closed one) a conversation is created/reopened, so the support button works
   * with a single action and never dead-ends on a closed thread.
   */
  async sendUserMessage(userId: string, dto: SendSupportMessageDto) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('متن پیام خالی است');

    let conversation = dto.conversationId
      ? await this.prisma.supportConversation.findUnique({
          where: { id: dto.conversationId },
        })
      : await this.prisma.supportConversation.findFirst({
          where: { userId, status: SupportChatStatus.OPEN },
          orderBy: { lastMessageAt: 'desc' },
        });

    if (conversation && conversation.userId !== userId) {
      throw new ForbiddenException('این گفتگو متعلق به شما نیست');
    }

    let created = false;
    if (!conversation) {
      conversation = await this.prisma.supportConversation.create({
        data: { userId, status: SupportChatStatus.OPEN },
      });
      created = true;
      await this.prisma.supportMessage.create({
        data: {
          conversationId: conversation.id,
          senderRole: SupportChatSender.SYSTEM,
          body: WELCOME_MESSAGE,
        },
      });
    }
    // Alert the team on the first unread message of a burst; later messages
    // only bump the counter so the bell does not turn into a firehose.
    const shouldNotifyAdmins = created || conversation.staffUnread === 0;

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: conversation.id,
        senderId: userId,
        senderRole: SupportChatSender.USER,
        body,
      },
      include: messageInclude,
    });

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversation.id },
      data: {
        status: SupportChatStatus.OPEN,
        lastMessageAt: new Date(),
        lastMessagePreview: this.preview(body),
        staffUnread: { increment: 1 },
        userUnread: 0,
      },
      include: conversationInclude,
    });

    this.emitMessage(updated, message);
    if (shouldNotifyAdmins) {
      void this.notifications.notifyAdmins({
        category: 'TICKET',
        title: 'گفتگوی پشتیبانی جدید',
        body: `${updated.user?.fullName ?? updated.user?.email ?? 'یک کاربر'}: ${this.preview(body)}`,
        type: NotificationType.INFO,
        link: '/admin?section=support-chat',
        actorId: userId,
      });
    }
    if (created) {
      void this.activity.log({
        action: 'SUPPORT_CHAT_STARTED',
        summary: 'آغاز گفتگوی پشتیبانی آنلاین',
        entityType: 'SUPPORT_CHAT',
        entityId: updated.id,
      });
    }

    return { conversation: updated, message };
  }

  async sendStaffMessage(adminId: string, id: string, dto: SendSupportMessageDto) {
    const body = dto.body.trim();
    if (!body) throw new BadRequestException('متن پیام خالی است');

    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد');
    const shouldNotifyUser = conversation.userUnread === 0;

    const message = await this.prisma.supportMessage.create({
      data: {
        conversationId: id,
        senderId: adminId,
        senderRole: SupportChatSender.STAFF,
        body,
      },
      include: messageInclude,
    });

    const updated = await this.prisma.supportConversation.update({
      where: { id },
      data: {
        status: SupportChatStatus.OPEN,
        lastMessageAt: new Date(),
        lastMessagePreview: this.preview(body),
        userUnread: { increment: 1 },
        staffUnread: 0,
      },
      include: conversationInclude,
    });

    this.emitMessage(updated, message);
    if (shouldNotifyUser) {
      void this.notifications.notify({
        userId: updated.userId,
        title: 'پاسخ پشتیبانی',
        body: this.preview(body),
        type: NotificationType.INFO,
        link: '/dashboard/support',
        actorId: adminId,
      });
    }
    void this.activity.log({
      action: 'SUPPORT_CHAT_REPLIED',
      summary: 'پاسخ مدیر در گفتگوی پشتیبانی آنلاین',
      entityType: 'SUPPORT_CHAT',
      entityId: updated.id,
    });

    return { conversation: updated, message };
  }

  /** Mark every staff message in a conversation as read by the user. */
  async markUserRead(userId: string, conversationId?: string) {
    const conversation = conversationId
      ? await this.prisma.supportConversation.findUnique({
          where: { id: conversationId },
        })
      : await this.prisma.supportConversation.findFirst({
          where: { userId, status: SupportChatStatus.OPEN },
          orderBy: { lastMessageAt: 'desc' },
        });

    if (!conversation || conversation.userId !== userId) {
      throw new NotFoundException('گفتگو یافت نشد');
    }

    await this.prisma.$transaction([
      this.prisma.supportMessage.updateMany({
        where: {
          conversationId: conversation.id,
          senderRole: SupportChatSender.STAFF,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
      this.prisma.supportConversation.update({
        where: { id: conversation.id },
        data: { userUnread: 0 },
      }),
    ]);

    this.emitRead(conversation.userId, conversation.id);
    return { ok: true, userUnread: 0 };
  }

  /** Mark every user message in a conversation as read by staff. */
  async markStaffRead(id: string) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد');

    await this.prisma.$transaction([
      this.prisma.supportMessage.updateMany({
        where: {
          conversationId: id,
          senderRole: SupportChatSender.USER,
          readAt: null,
        },
        data: { readAt: new Date() },
      }),
      this.prisma.supportConversation.update({
        where: { id },
        data: { staffUnread: 0 },
      }),
    ]);

    this.emitRead(conversation.userId, id);
    return { ok: true, staffUnread: 0 };
  }

  async closeForUser(userId: string) {
    const conversation = await this.prisma.supportConversation.findFirst({
      where: { userId, status: SupportChatStatus.OPEN },
      orderBy: { lastMessageAt: 'desc' },
    });
    if (!conversation) throw new NotFoundException('گفتگوی بازی وجود ندارد');

    const updated = await this.prisma.supportConversation.update({
      where: { id: conversation.id },
      data: { status: SupportChatStatus.CLOSED },
      include: conversationInclude,
    });
    this.emitStatus(updated);
    return updated;
  }

  async listForAdmin(query: ListSupportConversationsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 30;
    const where: Prisma.SupportConversationWhereInput = {};
    if (query.status) where.status = query.status;
    if (query.q?.trim()) {
      const q = query.q.trim();
      where.OR = [
        { user: { fullName: { contains: q, mode: 'insensitive' } } },
        { user: { email: { contains: q, mode: 'insensitive' } } },
        { user: { phone: { contains: q } } },
        { messages: { some: { body: { contains: q, mode: 'insensitive' } } } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.supportConversation.findMany({
        where,
        orderBy: { lastMessageAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: listInclude,
      }),
      this.prisma.supportConversation.count({ where }),
    ]);

    return { items, meta: this.meta(page, limit, total) };
  }

  async findForAdmin(id: string) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
      include: conversationInclude,
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد');
    return conversation;
  }

  async unreadForAdmin() {
    const [aggregate, open] = await this.prisma.$transaction([
      this.prisma.supportConversation.aggregate({
        where: { status: SupportChatStatus.OPEN },
        _sum: { staffUnread: true },
      }),
      this.prisma.supportConversation.count({
        where: { status: SupportChatStatus.OPEN },
      }),
    ]);
    return { unread: aggregate._sum.staffUnread ?? 0, open };
  }

  async unreadForUser(userId: string) {
    const aggregate = await this.prisma.supportConversation.aggregate({
      where: { userId, status: SupportChatStatus.OPEN },
      _sum: { userUnread: true },
    });
    return { unread: aggregate._sum.userUnread ?? 0 };
  }

  async updateForAdmin(
    adminId: string,
    id: string,
    dto: UpdateSupportConversationDto,
  ) {
    const conversation = await this.prisma.supportConversation.findUnique({
      where: { id },
    });
    if (!conversation) throw new NotFoundException('گفتگو یافت نشد');

    const updated = await this.prisma.supportConversation.update({
      where: { id },
      data: {
        ...(dto.status ? { status: dto.status } : {}),
        ...(dto.assignToMe ? { assignedToId: adminId } : {}),
      },
      include: conversationInclude,
    });
    this.emitStatus(updated);
    return updated;
  }

  private preview(body: string): string {
    const oneLine = body.replace(/\s+/g, ' ').trim();
    return oneLine.length > 120 ? `${oneLine.slice(0, 117)}…` : oneLine;
  }

  private emitMessage(
    conversation: {
      id: string;
      userId: string;
      userUnread: number;
      staffUnread: number;
    },
    message: unknown,
  ) {
    this.events.emit({
      audience: 'USER',
      userId: conversation.userId,
      type: 'message',
      conversationId: conversation.id,
      message,
      userUnread: conversation.userUnread,
      staffUnread: conversation.staffUnread,
    });
    this.events.emit({
      audience: 'ADMIN',
      type: 'message',
      conversationId: conversation.id,
      message,
      userUnread: conversation.userUnread,
      staffUnread: conversation.staffUnread,
    });
  }

  private emitRead(userId: string, conversationId: string) {
    this.events.emit({
      audience: 'USER',
      userId,
      type: 'read',
      conversationId,
    });
    this.events.emit({
      audience: 'ADMIN',
      type: 'read',
      conversationId,
    });
  }

  private emitStatus(conversation: { id: string; userId: string }) {
    this.events.emit({
      audience: 'USER',
      userId: conversation.userId,
      type: 'status',
      conversationId: conversation.id,
    });
    this.events.emit({
      audience: 'ADMIN',
      type: 'status',
      conversationId: conversation.id,
    });
  }

  private meta(page: number, limit: number, total: number) {
    const totalPages = Math.max(1, Math.ceil(total / limit));
    return {
      page,
      limit,
      total,
      totalPages,
      hasNext: page < totalPages,
      hasPrev: page > 1,
    };
  }
}
