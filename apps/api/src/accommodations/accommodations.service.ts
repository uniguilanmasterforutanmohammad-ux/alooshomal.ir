import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'node:crypto';

import { NotificationType, type AccommodationChannel } from '@prisma/client';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { paypingReturnBaseUrl } from '../common/app-url';
import { safeFetch } from '../common/outbound-url';
import { PaymentSimulatorService } from '../payping/payment-simulator.service';
import { PaypingService } from '../payping/payping.service';
import { NotificationsService } from '../notifications/notifications.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AddAccommodationPhotoDto } from './dto/add-photo.dto';
import {
  CreateAccommodationDto,
  AccommodationStatus,
} from './dto/create-accommodation.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCalendarBlockDto } from './dto/create-block.dto';
import { UpdateAccommodationAiSettingsDto } from './dto/accommodation-ai-settings.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';
import type { PublicAccommodationListDto } from './dto/public-accommodation-list.dto';
import { buildIcalCalendar, parseIcalEvents } from './ical';
import {
  isJabamaStayUrl,
  JabamaCalendarService,
} from './jabama-calendar.service';

const PROPERTY_INCLUDE = {
  photos: { orderBy: { sortOrder: 'asc' as const } },
  city: { select: { id: true, name: true } },
  _count: { select: { bookings: true } },
};

@Injectable()
export class AccommodationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly payping: PaypingService,
    private readonly simulator: PaymentSimulatorService,
    private readonly jabamaCalendar: JabamaCalendarService,
    private readonly notifications: NotificationsService,
  ) {}

  private async workspaceId(userId: string): Promise<string> {
    return this.modules.getWorkspaceId(userId);
  }

  private async uniqueSlug(base: string): Promise<string> {
    const cleaned =
      base
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80) || 'accommodation';
    let candidate = cleaned;
    for (let index = 2; index < 1000; index += 1) {
      const exists = await this.prisma.accommodationProperty.findUnique({
        where: { slug: candidate },
        select: { id: true },
      });
      if (!exists) return candidate;
      candidate = `${cleaned}-${index}`;
    }
    return `${cleaned}-${Date.now()}`;
  }

  private publishedAt(status: string, current: Date | null): Date | null {
    if (status !== 'PUBLISHED') return current;
    return current ?? new Date();
  }

  async listMine(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.accommodationProperty.findMany({
      where: { workspaceId },
      include: PROPERTY_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(userId: string, dto: CreateAccommodationDto) {
    const workspaceId = await this.workspaceId(userId);
    const slug = await this.uniqueSlug(dto.slug || dto.title);
    const status: AccommodationStatus = dto.status ?? 'DRAFT';
    return this.prisma.accommodationProperty.create({
      data: {
        workspaceId,
        slug,
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType ?? 'APARTMENT',
        cityId: dto.cityId,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        maxGuests: dto.maxGuests ?? 2,
        bedrooms: dto.bedrooms ?? 1,
        beds: dto.beds ?? 1,
        bathrooms: dto.bathrooms ?? 1,
        areaSize: dto.areaSize,
        basePrice: dto.basePrice ?? 0,
        depositAmount: dto.depositAmount ?? 0,
        currency: dto.currency ?? 'IRR',
        minNights: dto.minNights ?? 1,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        amenities: dto.amenities ?? [],
        rules: dto.rules ?? [],
        instantBooking: dto.instantBooking ?? false,
        rating: dto.rating,
        reviewsCount: dto.reviewsCount ?? 0,
        externalSource: dto.externalSource,
        externalUrl: dto.externalUrl,
        externalRef: dto.externalRef,
        status,
        publishedAt: this.publishedAt(status, null),
      },
      include: PROPERTY_INCLUDE,
    });
  }

  async findMine(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { id, workspaceId },
      include: {
        ...PROPERTY_INCLUDE,
        blocks: { orderBy: { startDate: 'asc' } },
        bookings: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { customer: true, channel: true },
        },
      },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    return property;
  }

  async update(userId: string, id: string, dto: UpdateAccommodationDto) {
    const workspaceId = await this.workspaceId(userId);
    const current = await this.prisma.accommodationProperty.findFirst({
      where: { id, workspaceId },
    });
    if (!current) throw new NotFoundException('اقامتگاه پیدا نشد');

    const slug =
      dto.slug && dto.slug !== current.slug
        ? await this.uniqueSlug(dto.slug)
        : undefined;
    const status = dto.status ?? current.status;
    return this.prisma.accommodationProperty.update({
      where: { id },
      data: {
        ...(slug ? { slug } : {}),
        title: dto.title,
        description: dto.description,
        propertyType: dto.propertyType,
        cityId: dto.cityId,
        address: dto.address,
        latitude: dto.latitude,
        longitude: dto.longitude,
        maxGuests: dto.maxGuests,
        bedrooms: dto.bedrooms,
        beds: dto.beds,
        bathrooms: dto.bathrooms,
        areaSize: dto.areaSize,
        basePrice: dto.basePrice,
        depositAmount: dto.depositAmount,
        currency: dto.currency,
        minNights: dto.minNights,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        amenities: dto.amenities,
        rules: dto.rules,
        instantBooking: dto.instantBooking,
        rating: dto.rating,
        reviewsCount: dto.reviewsCount,
        externalSource: dto.externalSource,
        externalUrl: dto.externalUrl,
        externalRef: dto.externalRef,
        status,
        publishedAt: this.publishedAt(status, current.publishedAt),
      },
      include: PROPERTY_INCLUDE,
    });
  }

  async remove(userId: string, id: string) {
    const workspaceId = await this.workspaceId(userId);
    const current = await this.prisma.accommodationProperty.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });
    if (!current) throw new NotFoundException('اقامتگاه پیدا نشد');
    await this.prisma.accommodationProperty.delete({ where: { id } });
    return { id };
  }

  async addPhoto(userId: string, propertyId: string, dto: AddAccommodationPhotoDto) {
    await this.assertOwnedProperty(userId, propertyId);
    return this.prisma.$transaction(async (tx) => {
      if (dto.isCover) {
        await tx.accommodationPhoto.updateMany({
          where: { propertyId },
          data: { isCover: false },
        });
      }
      return tx.accommodationPhoto.create({
        data: {
          propertyId,
          url: dto.url,
          caption: dto.caption,
          sortOrder: dto.sortOrder ?? 0,
          isCover: dto.isCover ?? false,
        },
      });
    });
  }

  async removePhoto(userId: string, propertyId: string, photoId: string) {
    await this.assertOwnedProperty(userId, propertyId);
    const photo = await this.prisma.accommodationPhoto.findFirst({
      where: { id: photoId, propertyId },
    });
    if (!photo) throw new NotFoundException('تصویر پیدا نشد');
    await this.prisma.accommodationPhoto.delete({ where: { id: photoId } });
    return { id: photoId };
  }

  async listBookings(userId: string, status?: string) {
    const workspaceId = await this.workspaceId(userId);
    return this.prisma.accommodationBookingRequest.findMany({
      where: { workspaceId, ...(status ? { status } : {}) },
      include: {
        property: { select: { id: true, title: true, slug: true } },
        customer: true,
        channel: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * One range for the whole workspace: every property plus the bookings and
   * blocks that overlap it. The panel renders this as a single month grid so
   * the host sees direct bookings, manual blocks and channel blocks together.
   */
  async calendarOverview(userId: string, from?: string, to?: string) {
    const workspaceId = await this.workspaceId(userId);
    const range = this.resolveCalendarRange(from, to);
    const properties = await this.prisma.accommodationProperty.findMany({
      where: { workspaceId },
      select: {
        id: true,
        title: true,
        slug: true,
        propertyType: true,
        basePrice: true,
        status: true,
        instantBooking: true,
      },
      orderBy: { createdAt: 'desc' },
    });
    const propertyIds = properties.map((property) => property.id);
    const [blocks, bookings] = await Promise.all([
      propertyIds.length
        ? this.prisma.accommodationCalendarBlock.findMany({
            where: {
              propertyId: { in: propertyIds },
              startDate: { lt: range.to },
              endDate: { gt: range.from },
            },
            orderBy: { startDate: 'asc' },
          })
        : Promise.resolve([]),
      this.prisma.accommodationBookingRequest.findMany({
        where: {
          workspaceId,
          status: { in: ['PENDING', 'CONFIRMED'] },
          checkIn: { lt: range.to },
          checkOut: { gt: range.from },
        },
        include: { channel: { select: { id: true, name: true } } },
        orderBy: { checkIn: 'asc' },
      }),
    ]);
    return {
      from: this.toDateOnly(range.from),
      to: this.toDateOnly(range.to),
      properties,
      blocks,
      bookings,
    };
  }

  private resolveCalendarRange(from?: string, to?: string) {
    const now = new Date();
    const defaultFrom = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
    );
    const defaultTo = new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 2, 1),
    );
    const start = from ? this.parseDateOnly(from) : defaultFrom;
    const end = to ? this.parseDateOnly(to) : defaultTo;
    if (!start || !end) {
      throw new BadRequestException('بازه‌ی تقویم معتبر نیست');
    }
    if (end <= start) {
      throw new BadRequestException('پایان بازه باید بعد از شروع باشد');
    }
    if (end.getTime() - start.getTime() > 370 * 86_400_000) {
      throw new BadRequestException('بازه‌ی تقویم حداکثر یک سال است');
    }
    return { from: start, to: end };
  }

  private parseDateOnly(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (!match) return null;
    const date = new Date(
      Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
    );
    return Number.isNaN(date.getTime()) ? null : date;
  }

  private toDateOnly(date: Date): string {
    return date.toISOString().slice(0, 10);
  }

  async updateBookingStatus(userId: string, bookingId: string, status: string) {
    const workspaceId = await this.workspaceId(userId);
    const booking = await this.prisma.accommodationBookingRequest.findFirst({
      where: { id: bookingId, workspaceId },
    });
    if (!booking) throw new NotFoundException('درخواست رزرو پیدا نشد');
    return this.prisma.accommodationBookingRequest.update({
      where: { id: bookingId },
      data: { status },
      include: { property: { select: { id: true, title: true, slug: true } } },
    });
  }

  async createManualBooking(userId: string, propertyId: string, dto: CreateBookingDto) {
    const property = await this.assertOwnedProperty(userId, propertyId);
    this.assertDates(dto.checkIn, dto.checkOut);
    const customer = await this.upsertCustomer(
      property.workspaceId,
      dto.guestName,
      dto.guestPhone,
      dto.guestEmail,
      'MANUAL',
    );
    return this.prisma.accommodationBookingRequest.create({
      data: {
        workspaceId: property.workspaceId,
        propertyId,
        customerId: customer?.id,
        channelId: dto.channelId,
        guestName: dto.guestName,
        guestPhone: dto.guestPhone,
        guestEmail: dto.guestEmail,
        checkIn: new Date(dto.checkIn),
        checkOut: new Date(dto.checkOut),
        guests: dto.guests ?? 1,
        message: dto.message,
        source: 'MANUAL',
        status: 'CONFIRMED',
      },
      include: { customer: true, property: true },
    });
  }

  async listBlocks(userId: string, propertyId: string) {
    await this.assertOwnedProperty(userId, propertyId);
    return this.prisma.accommodationCalendarBlock.findMany({
      where: { propertyId },
      orderBy: { startDate: 'asc' },
    });
  }

  async createBlock(
    userId: string,
    propertyId: string,
    dto: CreateCalendarBlockDto,
  ) {
    await this.assertOwnedProperty(userId, propertyId);
    this.assertDates(dto.startDate, dto.endDate);
    return this.prisma.accommodationCalendarBlock.create({
      data: {
        propertyId,
        startDate: new Date(dto.startDate),
        endDate: new Date(dto.endDate),
        reason: dto.reason,
      },
    });
  }

  async removeBlock(userId: string, propertyId: string, blockId: string) {
    await this.assertOwnedProperty(userId, propertyId);
    const block = await this.prisma.accommodationCalendarBlock.findFirst({
      where: { id: blockId, propertyId },
    });
    if (!block) throw new NotFoundException('بازه‌ی مسدود پیدا نشد');
    await this.prisma.accommodationCalendarBlock.delete({ where: { id: blockId } });
    return { id: blockId };
  }

  // ---- public side ----

  async publicList(query: PublicAccommodationListDto) {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const minPrice = this.toPositiveInt(query.minPrice);
    const maxPrice = this.toPositiveInt(query.maxPrice);
    const guests = this.toPositiveInt(query.guests);
    const range = this.availabilityRange(query.checkIn, query.checkOut);
    const orderBy =
      query.sort === 'price-asc'
        ? { basePrice: 'asc' as const }
        : query.sort === 'price-desc'
          ? { basePrice: 'desc' as const }
          : { publishedAt: 'desc' as const };
    return this.prisma.accommodationProperty.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query.cityId ? { cityId: query.cityId } : {}),
        ...(query.type ? { propertyType: query.type } : {}),
        ...(guests ? { maxGuests: { gte: guests } } : {}),
        ...(minPrice !== undefined || maxPrice !== undefined
          ? { basePrice: { gte: minPrice ?? 0, lte: maxPrice ?? 2_147_483_647 } }
          : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
                { address: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
        ...(range
          ? {
              blocks: {
                none: {
                  startDate: { lt: range.checkOut },
                  endDate: { gt: range.checkIn },
                },
              },
              bookings: {
                none: {
                  status: { in: ['PENDING', 'CONFIRMED'] },
                  checkIn: { lt: range.checkOut },
                  checkOut: { gt: range.checkIn },
                },
              },
            }
          : {}),
      },
      include: PROPERTY_INCLUDE,
      orderBy,
      take: 60,
    });
  }

  /**
   * Filter options for the `/stay` directory: the cities and property types
   * that actually have a published accommodation, so the selects never show a
   * dead option.
   */
  async publicFacets() {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const rows = await this.prisma.accommodationProperty.findMany({
      where: { status: 'PUBLISHED' },
      select: {
        propertyType: true,
        city: { select: { id: true, name: true } },
      },
    });
    const cities = new Map<string, string>();
    const types = new Set<string>();
    for (const row of rows) {
      if (row.city) cities.set(row.city.id, row.city.name);
      if (row.propertyType) types.add(row.propertyType);
    }
    return {
      cities: [...cities].map(([id, name]) => ({ id, name })),
      types: [...types].sort(),
    };
  }

  /** Coerce a possibly-string query value into a non-negative integer. */
  private toPositiveInt(value: unknown): number | undefined {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
  }

  /**
   * Parse the optional `checkIn`/`checkOut` pair for the public directory.
   * Only a complete, ordered pair narrows the result; a lone or invalid date
   * is ignored so the directory still renders.
   */
  private availabilityRange(
    checkIn?: string,
    checkOut?: string,
  ): { checkIn: Date; checkOut: Date } | null {
    if (!checkIn || !checkOut) return null;
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (
      Number.isNaN(start.getTime()) ||
      Number.isNaN(end.getTime()) ||
      end <= start
    ) {
      return null;
    }
    return { checkIn: start, checkOut: end };
  }

  async publicFind(slug: string) {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        ...PROPERTY_INCLUDE,
        workspace: {
          select: {
            id: true,
            name: true,
            publicSlug: true,
            channels: {
              where: { isActive: true },
              orderBy: { sortOrder: 'asc' },
              select: {
                id: true,
                name: true,
                kind: true,
                url: true,
              },
            },
          },
        },
        blocks: { orderBy: { startDate: 'asc' } },
      },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    return property;
  }

  async createPublicBooking(slug: string, dto: CreateBookingDto) {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { slug, status: 'PUBLISHED' },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    this.assertDates(dto.checkIn, dto.checkOut);

    const checkIn = new Date(dto.checkIn);
    const checkOut = new Date(dto.checkOut);
    const overlapBlock = await this.prisma.accommodationCalendarBlock.findFirst({
      where: {
        propertyId: property.id,
        startDate: { lt: checkOut },
        endDate: { gt: checkIn },
      },
    });
    if (overlapBlock) {
      throw new ConflictException('این بازه توسط مالک مسدود شده است');
    }
    const overlapBooking = await this.prisma.accommodationBookingRequest.findFirst({
      where: {
        propertyId: property.id,
        status: { in: ['PENDING', 'CONFIRMED'] },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (overlapBooking) {
      throw new ConflictException('این بازه قبلاً درخواست/رزرو شده است');
    }

    const customer = await this.upsertCustomer(
      property.workspaceId,
      dto.guestName,
      dto.guestPhone,
      dto.guestEmail,
      'PUBLIC_BOOKING',
    );
    const nights = Math.max(
      1,
      Math.ceil((checkOut.getTime() - checkIn.getTime()) / 86_400_000),
    );
    const booking = await this.prisma.$transaction(async (tx) => {
      const booking = await tx.accommodationBookingRequest.create({
        data: {
          workspaceId: property.workspaceId,
          propertyId: property.id,
          customerId: customer?.id,
          guestName: dto.guestName,
          guestPhone: dto.guestPhone,
          guestEmail: dto.guestEmail,
          checkIn,
          checkOut,
          guests: dto.guests ?? 1,
          message: dto.message,
          source: 'DIRECT',
          status: property.instantBooking ? 'CONFIRMED' : 'PENDING',
          totalAmount: property.basePrice ? property.basePrice * nights : null,
          depositAmount: property.depositAmount,
          depositStatus: property.depositAmount > 0 ? 'PENDING' : 'NONE',
        },
      });
      if (customer) {
        await tx.crmInteraction.create({
          data: {
            workspaceId: property.workspaceId,
            customerId: customer.id,
            kind: 'BOOKING',
            note: `درخواست رزرو «${property.title}» از ${dto.checkIn} تا ${dto.checkOut}`,
          },
        });
      }
      return booking;
    });
    await this.notifyOwnerOfBooking(property, booking);
    return booking;
  }

  /** Best-effort in-app notification so the host hears about a new request. */
  private async notifyOwnerOfBooking(
    property: { workspaceId: string; title: string },
    booking: {
      id: string;
      guestName: string;
      checkIn: Date;
      checkOut: Date;
      status: string;
    },
  ) {
    try {
      const workspace = await this.prisma.businessWorkspace.findUnique({
        where: { id: property.workspaceId },
        select: { ownerId: true },
      });
      if (!workspace?.ownerId) return;
      const confirmed = booking.status === 'CONFIRMED';
      await this.notifications.notify({
        userId: workspace.ownerId,
        type: confirmed ? NotificationType.SUCCESS : NotificationType.INFO,
        title: confirmed ? 'رزرو جدید (تأیید خودکار)' : 'درخواست رزرو جدید',
        body: `${booking.guestName} برای «${property.title}» از ${this.toDateOnly(
          booking.checkIn,
        )} تا ${this.toDateOnly(booking.checkOut)}`,
        link: '/dashboard/business/bookings',
      });
    } catch {
      // Notification failure must never break the booking itself.
    }
  }

  // ---- calendar (iCal / OTA sync) ----

  /** Public iCal feed of one property: blocked ranges + active bookings. */
  async publicCalendar(slug: string): Promise<string> {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { slug, status: 'PUBLISHED' },
      include: {
        blocks: true,
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        },
      },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    return this.buildCalendar(property);
  }

  /** Owner download of the same feed (works for drafts too). */
  async ownerCalendar(userId: string, propertyId: string): Promise<string> {
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { id: propertyId, workspaceId: await this.workspaceId(userId) },
      include: {
        blocks: true,
        bookings: {
          where: { status: { in: ['PENDING', 'CONFIRMED'] } },
        },
      },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    return this.buildCalendar(property);
  }

  private buildCalendar(property: {
    id: string;
    title: string;
    blocks: Array<{ id: string; startDate: Date; endDate: Date; reason: string | null }>;
    bookings: Array<{
      id: string;
      checkIn: Date;
      checkOut: Date;
      guestName: string;
      status: string;
    }>;
  }): string {
    const blocks = [
      ...property.blocks.map((block) => ({
        uid: `block-${block.id}@alooshomal`,
        start: block.startDate,
        end: block.endDate,
        summary: block.reason ? `مسدود: ${block.reason}` : 'مسدود',
      })),
      ...property.bookings.map((booking) => ({
        uid: `booking-${booking.id}@alooshomal`,
        start: booking.checkIn,
        end: booking.checkOut,
        summary:
          booking.status === 'CONFIRMED'
            ? `رزرو ${booking.guestName}`
            : `درخواست رزرو ${booking.guestName}`,
      })),
    ];
    return buildIcalCalendar(property.title, blocks);
  }

  /**
   * Pull a channel's iCal feed into the local calendar. Events become
   * `ICAL`-sourced blocks keyed by their UID, so repeated syncs are idempotent
   * and cancellations on the channel remove the local block.
   */
  async syncChannel(userId: string, channelId: string, propertyId?: string) {
    const workspaceId = await this.workspaceId(userId);
    const channel = await this.prisma.accommodationChannel.findFirst({
      where: { id: channelId, workspaceId },
    });
    if (!channel) throw new NotFoundException('کانال رزرو پیدا نشد');
    return this.syncChannelRecord(channel, propertyId);
  }

  /** Sync every active channel of the workspace, collecting per-channel errors. */
  async syncAllChannels(userId: string) {
    const workspaceId = await this.workspaceId(userId);
    const channels = await this.prisma.accommodationChannel.findMany({
      where: { workspaceId, isActive: true, icalUrl: { not: null } },
      orderBy: { sortOrder: 'asc' },
    });
    const results: Array<{
      channelId: string;
      name: string;
      ok: boolean;
      synced: number;
      error?: string;
    }> = [];
    let synced = 0;
    for (const channel of channels) {
      try {
        const result = await this.syncChannelRecord(channel);
        synced += result.synced;
        results.push({
          channelId: channel.id,
          name: channel.name,
          ok: true,
          synced: result.synced,
        });
      } catch (error) {
        results.push({
          channelId: channel.id,
          name: channel.name,
          ok: false,
          synced: 0,
          error:
            error instanceof Error
              ? error.message.slice(0, 200)
              : 'خطای همگام‌سازی',
        });
      }
    }
    return { channels: results.length, synced, results };
  }

  /**
   * Background sweep: sync every active channel whose last sync is older than
   * `intervalMinutes`. Used by the periodic job so the calendar stays fresh
   * without the host pressing «همگام‌سازی».
   */
  async syncDueChannels(intervalMinutes: number) {
    const threshold = new Date(Date.now() - intervalMinutes * 60_000);
    const channels = await this.prisma.accommodationChannel.findMany({
      where: {
        isActive: true,
        icalUrl: { not: null },
        OR: [{ lastSyncedAt: null }, { lastSyncedAt: { lt: threshold } }],
      },
      take: 50,
    });
    let synced = 0;
    let failed = 0;
    for (const channel of channels) {
      try {
        const result = await this.syncChannelRecord(channel);
        synced += result.synced;
      } catch {
        failed += 1;
      }
    }
    return { channels: channels.length, synced, failed };
  }

  private async syncChannelRecord(
    channel: AccommodationChannel,
    propertyId?: string,
  ) {
    const workspaceId = channel.workspaceId;
    if (!channel.icalUrl) {
      throw new BadRequestException('برای این کانال آدرس iCal ثبت نشده است');
    }
    let text: string;
    try {
      if (isJabamaStayUrl(channel.icalUrl)) {
        text = await this.jabamaCalendar.toIcal(channel.icalUrl);
      } else {
        const response = await safeFetch(channel.icalUrl, {
          headers: { accept: 'text/calendar, text/plain, */*' },
          signal: AbortSignal.timeout(15_000),
        });
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}`);
        }
        text = await response.text();
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message.slice(0, 300) : 'خطای دریافت فید';
      await this.prisma.accommodationChannel.update({
        where: { id: channel.id },
        data: {
          lastSyncedAt: new Date(),
          lastSyncStatus: 'FAILED',
          lastSyncError: message,
        },
      });
      throw new BadRequestException(`دریافت تقویم کانال ناموفق بود: ${message}`);
    }

    const events = parseIcalEvents(text);
    const property = propertyId
      ? await this.prisma.accommodationProperty.findFirst({
          where: { id: propertyId, workspaceId },
          select: { id: true },
        })
      : await this.prisma.accommodationProperty.findFirst({
          where: { workspaceId },
          orderBy: { createdAt: 'asc' },
          select: { id: true },
        });
    if (!property) {
      if (propertyId) {
        throw new NotFoundException('اقامتگاه انتخاب‌شده پیدا نشد');
      }
      throw new BadRequestException(
        'ابتدا یک اقامتگاه ثبت کنید تا تقویم کانال به آن متصل شود',
      );
    }
    const prefix = `channel-${channel.id}:`;
    const uids = events.map((event) => `${prefix}${event.uid}`);
    await this.prisma.$transaction(async (tx) => {
      await tx.accommodationCalendarBlock.deleteMany({
        where: {
          propertyId: property.id,
          source: 'ICAL',
          externalId: {
            startsWith: prefix,
            ...(uids.length ? { notIn: uids } : {}),
          },
        },
      });
      for (const event of events) {
        const externalId = `${prefix}${event.uid}`;
        await tx.accommodationCalendarBlock.upsert({
          where: {
            propertyId_externalId: {
              propertyId: property.id,
              externalId,
            },
          },
          update: {
            startDate: event.start,
            endDate: event.end,
            reason: event.summary ?? channel.name,
          },
          create: {
            propertyId: property.id,
            startDate: event.start,
            endDate: event.end,
            reason: event.summary ?? channel.name,
            source: 'ICAL',
            externalId,
          },
        });
      }
    });
    await this.prisma.accommodationChannel.update({
      where: { id: channel.id },
      data: {
        lastSyncedAt: new Date(),
        lastSyncStatus: 'OK',
        lastSyncError: null,
      },
    });
    return { synced: events.length, propertyId: property.id };
  }

  // ---- deposits ----

  /** Start an online deposit payment for a public booking request. */
  async startDepositPayment(slug: string, bookingId: string) {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const booking = await this.prisma.accommodationBookingRequest.findFirst({
      where: { id: bookingId, property: { slug, status: 'PUBLISHED' } },
      include: { property: { select: { title: true } } },
    });
    if (!booking) throw new NotFoundException('درخواست رزرو پیدا نشد');
    if (booking.depositAmount <= 0) {
      throw new BadRequestException('برای این رزرو ودیعه‌ای تعیین نشده است');
    }
    if (booking.depositStatus === 'PAID') {
      throw new ConflictException('ودیعه‌ی این رزرو قبلاً پرداخت شده است');
    }
    const clientRefId = booking.depositClientRefId ?? randomBytes(16).toString('hex');
    const returnUrl = `${paypingReturnBaseUrl()}/api/public/accommodations/deposits/callback`;
    let result: { paymentCode?: string; url?: string } | null = null;
    try {
      result = this.simulator.isEnabled
        ? this.simulator.createPayment({
            amount: booking.depositAmount,
            returnUrl,
            clientRefId,
            description: `ودیعه رزرو ${booking.property.title}`,
          })
        : ((await this.payping.createPayment({
            amount: booking.depositAmount,
            returnUrl,
            payerIdentity: booking.guestPhone,
            payerName: booking.guestName,
            description: `ودیعه رزرو ${booking.property.title}`,
            clientRefId,
            isReversible: false,
          })) as { paymentCode?: string; url?: string } | null);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'ساخت پرداخت ناموفق بود',
      );
    }
    if (!result?.paymentCode || !result?.url) {
      throw new BadRequestException('ساخت پرداخت ودیعه ناموفق بود');
    }
    await this.prisma.accommodationBookingRequest.update({
      where: { id: booking.id },
      data: {
        depositClientRefId: clientRefId,
        depositPaymentCode: result.paymentCode,
        depositStatus: 'PENDING',
      },
    });
    return {
      amount: booking.depositAmount,
      paymentCode: result.paymentCode,
      url: result.url,
    };
  }

  async handleDepositCallback(params: {
    paymentCode?: string;
    refId?: string;
    clientRefId?: string;
    status?: number;
  }) {
    const paymentCode = params.paymentCode?.trim() || undefined;
    const clientRefId = params.clientRefId?.trim() || undefined;
    const booking = paymentCode
      ? await this.prisma.accommodationBookingRequest.findUnique({
          where: { depositPaymentCode: paymentCode },
        })
      : clientRefId
        ? await this.prisma.accommodationBookingRequest.findUnique({
            where: { depositClientRefId: clientRefId },
          })
        : null;
    const base = `${paypingReturnBaseUrl()}/stay`;
    if (!booking) return { redirectUrl: `${base}?deposit=failed` };
    if (booking.depositStatus === 'PAID') {
      return { redirectUrl: `${base}?deposit=success` };
    }
    if (params.status === 0) {
      return { redirectUrl: `${base}?deposit=failed` };
    }
    if (!params.refId || !booking.depositPaymentCode) {
      return { redirectUrl: `${base}?deposit=failed` };
    }
    const paymentRefId = Number(params.refId);
    if (!Number.isFinite(paymentRefId)) {
      return { redirectUrl: `${base}?deposit=failed` };
    }
    try {
      if (this.simulator.handles(booking.depositPaymentCode)) {
        this.simulator.verifyPayment({
          paymentCode: booking.depositPaymentCode,
          amount: booking.depositAmount,
          clientRefId: booking.depositClientRefId,
        });
      } else {
        // PayPing's `/v3/pay/verify` requires `paymentRefId` and the original
        // `amount`; `refId` alone is rejected and failed a paid deposit.
        await this.payping.verifyPayment({
          paymentRefId,
          paymentCode: booking.depositPaymentCode,
          amount: booking.depositAmount,
        });
      }
    } catch (error) {
      const upstreamStatus = (error as { paypingStatus?: number }).paypingStatus;
      const status =
        upstreamStatus ??
        (error instanceof HttpException ? error.getStatus() : 500);
      // 409 = PayPing code 110 (already verified): treat as paid.
      if (status !== 409) {
        return { redirectUrl: `${base}?deposit=failed` };
      }
    }
    await this.prisma.accommodationBookingRequest.update({
      where: { id: booking.id },
      data: { depositStatus: 'PAID', depositPaidAt: new Date() },
    });
    return { redirectUrl: `${base}?deposit=success` };
  }

  async setDepositStatus(userId: string, bookingId: string, status: string) {
    const workspaceId = await this.workspaceId(userId);
    const booking = await this.prisma.accommodationBookingRequest.findFirst({
      where: { id: bookingId, workspaceId },
    });
    if (!booking) throw new NotFoundException('درخواست رزرو پیدا نشد');
    return this.prisma.accommodationBookingRequest.update({
      where: { id: bookingId },
      data: {
        depositStatus: status,
        depositPaidAt: status === 'PAID' ? new Date() : null,
      },
    });
  }

  // ---- «ورود خودکار از جاباما» pricing (admin) ----

  async getAiImportSettings() {
    const [pricePer1k, minPrice, minImages] = await Promise.all([
      this.settings.getAccommodationAiImportPricePer1k(),
      this.settings.getAccommodationAiImportMinPrice(),
      this.settings.getAccommodationAiImportMinImages(),
    ]);
    return { pricePer1k, minPrice, minImages };
  }

  async updateAiImportSettings(dto: UpdateAccommodationAiSettingsDto) {
    const [pricePer1k, minPrice, minImages] = await Promise.all([
      dto.aiPricePer1k !== undefined
        ? this.settings.setAccommodationAiImportPricePer1k(dto.aiPricePer1k)
        : this.settings.getAccommodationAiImportPricePer1k(),
      dto.aiMinPrice !== undefined
        ? this.settings.setAccommodationAiImportMinPrice(dto.aiMinPrice)
        : this.settings.getAccommodationAiImportMinPrice(),
      dto.aiMinImages !== undefined
        ? this.settings.setAccommodationAiImportMinImages(dto.aiMinImages)
        : this.settings.getAccommodationAiImportMinImages(),
    ]);
    return { pricePer1k, minPrice, minImages };
  }

  private async assertOwnedProperty(userId: string, propertyId: string) {
    const workspaceId = await this.workspaceId(userId);
    const property = await this.prisma.accommodationProperty.findFirst({
      where: { id: propertyId, workspaceId },
    });
    if (!property) throw new NotFoundException('اقامتگاه پیدا نشد');
    return property;
  }

  private assertDates(checkIn: string, checkOut: string): void {
    const start = new Date(checkIn);
    const end = new Date(checkOut);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      throw new BadRequestException('تاریخ ورود/خروج معتبر نیست');
    }
    if (end <= start) {
      throw new BadRequestException('تاریخ خروج باید بعد از تاریخ ورود باشد');
    }
  }

  private async upsertCustomer(
    workspaceId: string,
    fullName: string,
    phone: string,
    email: string | undefined,
    source: string,
  ) {
    const existing = await this.prisma.crmCustomer.findFirst({
      where: { workspaceId, phone },
    });
    if (existing) {
      return this.prisma.crmCustomer.update({
        where: { id: existing.id },
        data: {
          fullName,
          email: email ?? existing.email,
          lastInteractionAt: new Date(),
        },
      });
    }
    return this.prisma.crmCustomer.create({
      data: {
        workspaceId,
        fullName,
        phone,
        email,
        source,
        lastInteractionAt: new Date(),
      },
    });
  }
}
