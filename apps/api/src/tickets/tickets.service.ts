import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { NotificationType, TicketPriority, TicketStatus } from '@prisma/client';

import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { ListTicketsDto } from './dto/list-tickets.dto';
import { ReplyTicketDto } from './dto/reply-ticket.dto';

const ticketInclude = {
  user: { select: { id: true, email: true, fullName: true } },
  messages: {
    orderBy: { createdAt: 'asc' as const },
    include: { author: { select: { id: true, email: true, fullName: true, role: true } } },
  },
};

@Injectable()
export class TicketsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Create a ticket on behalf of the authenticated user. */
  async create(userId: string, dto: CreateTicketDto) {
    const ticket = await this.prisma.ticket.create({
      data: {
        subject: dto.subject,
        message: dto.message,
        priority: dto.priority ?? TicketPriority.NORMAL,
        status: TicketStatus.OPEN,
        userId,
        messages: dto.message
          ? {
              create: {
                body: dto.message,
                authorId: userId,
                isStaff: false,
              },
            }
          : undefined,
      },
      include: ticketInclude,
    });

    await this.notifications.notifyAdmins({
      category: 'TICKET',
      title: 'تیکت پشتیبانی جدید',
      body: `تیکت «${ticket.subject}» ثبت شد.`,
      type: NotificationType.INFO,
      link: '/admin?section=tickets',
      actorId: userId,
    });

    return ticket;
  }

  /** Tickets belonging to the current user. */
  async findMine(userId: string, query: ListTicketsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = { userId, ...(query.status ? { status: query.status } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: { _count: { select: { messages: true } } },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, meta: this.meta(page, limit, total) };
  }

  async findMineById(userId: string, id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('تیکت یافت نشد');
    }
    return ticket;
  }

  /** Add a message to a ticket owned by the user. */
  async reply(userId: string, id: string, dto: ReplyTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket || ticket.userId !== userId) {
      throw new NotFoundException('تیکت یافت نشد');
    }
    if (ticket.status === TicketStatus.CLOSED) {
      throw new ForbiddenException('این تیکت بسته شده است؛ لطفاً تیکت جدیدی ثبت کنید');
    }
    await this.prisma.ticketMessage.create({
      data: { ticketId: id, authorId: userId, body: dto.message, isStaff: false },
    });
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: { status: TicketStatus.OPEN, updatedAt: new Date() },
      include: ticketInclude,
    });

    await this.notifications.notifyAdmins({
      category: 'TICKET',
      title: 'پاسخ کاربر در تیکت',
      body: `کاربر به تیکت «${ticket.subject}» پاسخ داد.`,
      type: NotificationType.INFO,
      link: '/admin?section=tickets',
      actorId: userId,
    });

    return updated;
  }

  /** Admin: all tickets with optional status filter. */
  async findAll(query: ListTicketsDto) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const where = query.status ? { status: query.status } : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.ticket.findMany({
        where,
        orderBy: { updatedAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
        include: {
          user: { select: { id: true, email: true, fullName: true } },
          _count: { select: { messages: true } },
        },
      }),
      this.prisma.ticket.count({ where }),
    ]);

    return { items, meta: this.meta(page, limit, total) };
  }

  async findById(id: string) {
    const ticket = await this.prisma.ticket.findUnique({
      where: { id },
      include: ticketInclude,
    });
    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد');
    }
    return ticket;
  }

  /** Admin: reply to a ticket and move it to "in progress". */
  async staffReply(adminId: string, id: string, dto: ReplyTicketDto) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد');
    }
    await this.prisma.ticketMessage.create({
      data: { ticketId: id, authorId: adminId, body: dto.message, isStaff: true },
    });
    const updated = await this.prisma.ticket.update({
      where: { id },
      data: {
        status: ticket.status === TicketStatus.CLOSED ? TicketStatus.OPEN : TicketStatus.IN_PROGRESS,
        updatedAt: new Date(),
      },
      include: ticketInclude,
    });

    if (ticket.userId) {
      await this.notifications.notify({
        userId: ticket.userId,
        type: NotificationType.INFO,
        title: 'پاسخ جدید در تیکت شما',
        body: `پشتیبانی به تیکت «${ticket.subject}» پاسخ داد.`,
        link: '/dashboard/tickets',
        actorId: adminId,
      });
    }

    return updated;
  }

  async updateStatus(id: string, status: TicketStatus) {
    const ticket = await this.prisma.ticket.findUnique({ where: { id } });
    if (!ticket) {
      throw new NotFoundException('تیکت یافت نشد');
    }
    const updated = await this.prisma.ticket.update({ where: { id }, data: { status } });
    if (ticket.userId && ticket.status !== status) {
      const labels: Record<TicketStatus, string> = {
        OPEN: 'باز',
        IN_PROGRESS: 'در حال بررسی',
        CLOSED: 'بسته',
      };
      await this.notifications.notify({
        userId: ticket.userId,
        type: status === TicketStatus.CLOSED ? NotificationType.SUCCESS : NotificationType.INFO,
        title: 'وضعیت تیکت شما تغییر کرد',
        body: `وضعیت تیکت «${ticket.subject}» به «${labels[status]}» تغییر یافت.`,
        link: '/dashboard/tickets',
      });
    }
    return updated;
  }

  async summaryForUser(userId: string) {
    const [open, inProgress, closed, total] = await this.prisma.$transaction([
      this.prisma.ticket.count({ where: { userId, status: TicketStatus.OPEN } }),
      this.prisma.ticket.count({ where: { userId, status: TicketStatus.IN_PROGRESS } }),
      this.prisma.ticket.count({ where: { userId, status: TicketStatus.CLOSED } }),
      this.prisma.ticket.count({ where: { userId } }),
    ]);
    return { open, inProgress, closed, total };
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
