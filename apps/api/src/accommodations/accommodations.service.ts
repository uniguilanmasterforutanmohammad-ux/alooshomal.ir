import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { AddAccommodationPhotoDto } from './dto/add-photo.dto';
import {
  CreateAccommodationDto,
  AccommodationStatus,
} from './dto/create-accommodation.dto';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CreateCalendarBlockDto } from './dto/create-block.dto';
import { UpdateAccommodationDto } from './dto/update-accommodation.dto';

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
        basePrice: dto.basePrice ?? 0,
        currency: dto.currency ?? 'IRR',
        minNights: dto.minNights ?? 1,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        amenities: dto.amenities ?? [],
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
        basePrice: dto.basePrice,
        currency: dto.currency,
        minNights: dto.minNights,
        checkInTime: dto.checkInTime,
        checkOutTime: dto.checkOutTime,
        amenities: dto.amenities,
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

  async publicList(query: { q?: string; cityId?: string }) {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    return this.prisma.accommodationProperty.findMany({
      where: {
        status: 'PUBLISHED',
        ...(query.cityId ? { cityId: query.cityId } : {}),
        ...(query.q
          ? {
              OR: [
                { title: { contains: query.q, mode: 'insensitive' } },
                { description: { contains: query.q, mode: 'insensitive' } },
                { address: { contains: query.q, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      include: PROPERTY_INCLUDE,
      orderBy: { publishedAt: 'desc' },
      take: 60,
    });
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
    return this.prisma.$transaction(async (tx) => {
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
          status: 'PENDING',
          totalAmount: property.basePrice ? property.basePrice * nights : null,
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
