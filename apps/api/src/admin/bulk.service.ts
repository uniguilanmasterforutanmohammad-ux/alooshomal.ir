import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { ActivityService } from '../activity/activity.service';
import { appUrl } from '../common/app-url';
import { MAIN_CITY_ORDER } from '../common/cities';
import { FacetsCacheService } from '../common/facets-cache.service';
import { PrismaService } from '../prisma/prisma.service';

export type BulkKind = 'BIOLINK' | 'BUSINESS_CARD';

export interface BulkImportResult {
  kind: BulkKind;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface BusinessBatchImportResult {
  batchId: string;
  label: string;
  imported: number;
  skipped: number;
  errors: string[];
}

export interface TaxonomyCityImportResult {
  citiesCreated: number;
  neighborhoodsCreated: number;
  skipped: number;
  errors: string[];
}

export interface TaxonomyBusinessImportResult {
  categoriesCreated: number;
  subCategoriesCreated: number;
  subSubCategoriesCreated: number;
  skipped: number;
  errors: string[];
}

/**
 * Maps the Persian and English column headers accepted in the import file to
 * the fields we store. The first matching header wins.
 */
const COLUMN_ALIASES: Record<string, string> = {
  'نام': 'fullName',
  'نام و نام خانوادگی': 'fullName',
  fullname: 'fullName',
  name: 'fullName',
  'عنوان شغلی': 'jobTitle',
  jobtitle: 'jobTitle',
  'شرکت': 'company',
  company: 'company',
  'شهر': 'city',
  city: 'city',
  'کسب و کار': 'business',
  'نوع کسب و کار': 'business',
  business: 'business',
  'تلفن': 'phone',
  phone: 'phone',
  'ایمیل': 'email',
  email: 'email',
  'وبسایت': 'website',
  website: 'website',
  'آدرس': 'address',
  address: 'address',
  bio: 'bio',
  'درباره من': 'bio',
};

/**
 * Extra headers accepted by the business-card importer on top of the generic
 * aliases. It also understands the raw Behtarino JSON keys (`category`,
 * `listed_city`, `city_name`, `main_tag`, `neighborhood`, …), so the scraped
 * file can be uploaded as-is from the admin panel.
 */
const BUSINESS_COLUMN_ALIASES: Record<string, string> = {
  ...COLUMN_ALIASES,
  'نام کسب و کار': 'fullName',
  'نام کسب‌وکار': 'fullName',
  'عنوان': 'jobTitle',
  main_tag: 'jobTitle',
  guild: 'jobTitle',
  'تلفن همراه': 'mobile',
  'موبایل': 'mobile',
  mobile: 'mobile',
  'دسته': 'business',
  'دسته‌بندی': 'business',
  'دسته بندی': 'business',
  'کسب‌وکار': 'business',
  category: 'business',
  'زیردسته': 'subCategory',
  subcategory: 'subCategory',
  'زیرشاخه': 'subSubCategory',
  sub_sub_category: 'subSubCategory',
  'محله': 'neighborhood',
  'منطقه': 'neighborhood',
  neighborhood: 'neighborhood',
  'ساعات کاری': 'workingHours',
  working_hours: 'workingHours',
  workinghours: 'workingHours',
  'برچسب‌ها': 'tags',
  tags: 'tags',
  slug: 'slug',
  listed_city: 'city',
  city_name: 'cityAlt',
  'توضیحات': 'bio',
  description: 'bio',
  instagram: 'instagram',
  telegram: 'telegram',
  whatsapp: 'whatsapp',
  linkedin: 'linkedin',
};

/** Headers accepted by the «شهرها و محله‌ها» import file. */
const TAXONOMY_CITY_ALIASES: Record<string, string> = {
  'شهر': 'city',
  city: 'city',
  'محله': 'neighborhood',
  'منطقه': 'neighborhood',
  neighborhood: 'neighborhood',
};

/** Headers accepted by the «مشاغل» import file (main → sub → sub-sub). */
const TAXONOMY_BUSINESS_ALIASES: Record<string, string> = {
  'کسب و کار': 'business',
  'کسب‌وکار': 'business',
  'دسته اصلی': 'business',
  'دسته': 'business',
  business: 'business',
  category: 'business',
  'زیردسته': 'subCategory',
  'زیر دسته': 'subCategory',
  subcategory: 'subCategory',
  'زیرشاخه': 'subSubCategory',
  'زیر شاخه': 'subSubCategory',
  subsubcategory: 'subSubCategory',
  tag: 'subSubCategory',
};

const MAX_ROWS = 5000;
const MAX_BUSINESS_ROWS = 20000;

/** A public URL segment: keeps Unicode letters/digits, collapses the rest. */
function slugifyValue(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

/** Persian/Arabic digits → ASCII, so `۰۹۱۲…` and `0912…` behave the same. */
function latinDigits(value: string): string {
  return value
    .replace(/[\u06f0-\u06f9]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x06f0),
    )
    .replace(/[\u0660-\u0669]/g, (digit) =>
      String(digit.charCodeAt(0) - 0x0660),
    );
}

/** Same split the Behtarino importer uses: `09…` and 11 digits is a mobile. */
function splitPhone(value?: string): { phone: string | null; mobile: string | null } {
  const digits = latinDigits(value ?? '').replace(/[^\d+]/g, '');
  if (!digits) return { phone: null, mobile: null };
  if (digits.startsWith('09') && digits.length === 11) {
    return { phone: null, mobile: digits };
  }
  return { phone: digits, mobile: null };
}

const WEEKDAYS: Record<string, string> = {
  'شنبه': 'saturday',
  'یکشنبه': 'sunday',
  'دوشنبه': 'monday',
  'سه‌شنبه': 'tuesday',
  'چهارشنبه': 'wednesday',
  'پنجشنبه': 'thursday',
  'جمعه': 'friday',
};

/** `شنبه: 07:30-18:00 | …` → the per-weekday JSON shape used by the site. */
function parseWorkingHours(
  raw?: string,
): Record<string, { closed: true } | { open: string; close: string }> | null {
  const text = (raw ?? '').trim();
  if (!text) return null;
  const result: Record<string, { closed: true } | { open: string; close: string }> = {};
  for (const part of text.split('|')) {
    if (!part.includes(':')) continue;
    const index = part.indexOf(':');
    const label = part
      .slice(0, index)
      .replace(/[\u200c\s]/g, '')
      .trim();
    const value = part.slice(index + 1).trim();
    const day = WEEKDAYS[label];
    if (!day) continue;
    if (value.includes('تعطیل') || !value.includes('-')) {
      result[day] = { closed: true };
      continue;
    }
    const [openRaw, closeRaw] = value.split('-');
    result[day] = {
      open: openRaw.trim().slice(0, 5),
      close: closeRaw.trim().slice(0, 5),
    };
  }
  return Object.keys(result).length ? result : null;
}

function socialUrl(network: 'instagram' | 'telegram', value?: string): string | null {
  const text = (value ?? '').trim();
  if (!text) return null;
  if (/^https?:\/\//i.test(text)) return text;
  const handle = text.replace(/^[@/]+/, '');
  if (!handle) return null;
  return network === 'instagram'
    ? `https://instagram.com/${handle}`
    : `https://t.me/${handle}`;
}

function whatsappUrl(value?: string): string | null {
  const digits = latinDigits(value ?? '').replace(/\D/g, '');
  return digits ? `https://wa.me/${digits}` : null;
}

function splitMergedCity(name?: string): string[] {
  return (name ?? '')
    .replace(/،/g, ',')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}

/** Prefer the canonical «شهر» column; merged buckets («تنکابن، شیرود») fall
 *  back to the region column so a row is never assigned to a fake city. */
function pickCity(listed?: string, region?: string): string {
  const listedParts = splitMergedCity(listed);
  const regionParts = splitMergedCity(region);
  if (listedParts.length === 1) return listedParts[0];
  for (const part of regionParts) {
    if (listedParts.includes(part)) return part;
  }
  return listedParts[0] ?? regionParts[0] ?? '';
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
}

function csvCell(value: string | null | undefined): string {
  const text = value ?? '';
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

/**
 * Admin-only bulk import/delete used for load-testing the platform with
 * thousands of rows without polluting real data: every imported row is tagged
 * `isTestData`, and bulk delete only ever touches tagged rows.
 */
@Injectable()
export class BulkService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityService,
    private readonly facetsCache: FacetsCacheService,
  ) {}

  /** Parse an .xlsx/.csv buffer into rows keyed by canonical field names. */
  private async parseWorkbook(
    buffer: Buffer,
    aliases: Record<string, string> = COLUMN_ALIASES,
    maxRows = MAX_ROWS,
    required: { field: string; message: string } = {
      field: 'fullName',
      message: 'ستون «نام» در فایل پیدا نشد. حداقل یک ستون با عنوان «نام» لازم است.',
    },
  ): Promise<Record<string, string>[]> {
    const workbook = new ExcelJS.Workbook();
    const isCsv = buffer.slice(0, 4).toString('utf8').toLowerCase().includes('name')
      || buffer.toString('utf8', 0, 200).includes(',');

    if (isCsv && buffer[0] !== 0x50) {
      // CSV path — exceljs' csv reader
      const { Readable } = await import('node:stream');
      const stream = Readable.from(buffer.toString('utf8'));
      await workbook.csv.read(stream);
    } else {
      // XLSX (and any caller that handed us a real workbook buffer)
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    }

    const sheet = workbook.worksheets[0];
    if (!sheet) {
      throw new BadRequestException('فایل ورودی هیچ شیتی ندارد');
    }

    const headerRow = sheet.getRow(1);
    const headerMap = new Map<number, string>();
    headerRow.eachCell((cell, colNumber) => {
      const raw = String(cell.value ?? '').trim();
      const canonical = aliases[normalizeHeader(raw)];
      if (canonical) headerMap.set(colNumber, canonical);
    });

    if (![...headerMap.values()].includes(required.field)) {
      throw new BadRequestException(required.message);
    }

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rows.length >= maxRows) return;
      const record: Record<string, string> = {};
      headerMap.forEach((field, colNumber) => {
        const value = row.getCell(colNumber).value;
        record[field] =
          value === null || value === undefined
            ? ''
            : String(value).trim();
      });
      if (record[required.field]) rows.push(record);
    });

    return rows;
  }

  /**
   * Import rows as a given category. `ownerUserId` receives the rows; city and
   * business names are matched case-insensitively (created on demand when
   * missing) so an arbitrary spreadsheet just works.
   */
  async importRows(
    kind: BulkKind,
    ownerUserId: string,
    buffer: Buffer,
  ): Promise<BulkImportResult> {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
    if (!owner) {
      throw new NotFoundException('کاربر مالک انتخاب‌شده پیدا نشد');
    }

    const rows = await this.parseWorkbook(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('فایل هیچ ردیف معتبری ندارد');
    }

    const [cities, businesses] = await Promise.all([
      this.prisma.city.findMany(),
      this.prisma.businessCategory.findMany(),
    ]);
    const cityByName = new Map(cities.map((c) => [c.name.trim(), c.id]));
    const businessByName = new Map(businesses.map((b) => [b.name.trim(), b.id]));

    // Match by name (case-insensitive) and create the taxonomy entry on demand
    // so an arbitrary spreadsheet just works without pre-seeding.
    const resolveCity = async (name?: string): Promise<string | null> => {
      const key = name?.trim();
      if (!key) return null;
      const existing = cityByName.get(key);
      if (existing) return existing;
      const created = await this.prisma.city.create({ data: { name: key } });
      cityByName.set(key, created.id);
      return created.id;
    };
    const resolveBusiness = async (name?: string): Promise<string | null> => {
      const key = name?.trim();
      if (!key) return null;
      const existing = businessByName.get(key);
      if (existing) return existing;
      const created = await this.prisma.businessCategory.create({ data: { name: key } });
      businessByName.set(key, created.id);
      return created.id;
    };

    const result: BulkImportResult = { kind, imported: 0, skipped: 0, errors: [] };
    const now = new Date();

    for (const row of rows) {
      try {
        const resolvedCity = await resolveCity(row.city);
        const resolvedBusiness = await resolveBusiness(row.business);
        const slug = `${kind === 'BIOLINK' ? 'test-bl' : 'test-bc'}-${Date.now().toString(36)}-${randomSuffix()}`;
        const data = {
          userId: ownerUserId,
          slug,
          fullName: row.fullName,
          jobTitle: row.jobTitle || null,
          company: row.company || null,
          bio: row.bio || null,
          phone: row.phone || null,
          email: row.email || null,
          website: row.website || null,
          address: row.address || null,
          cityId: resolvedCity,
          businessId: resolvedBusiness,
          // imported rows are published so the public directory shows them
          status: BiolinkStatus.APPROVED,
          isPublished: true,
          approvedAt: now,
          publishedAt: now,
          isTestData: true,
        };
        if (kind === 'BIOLINK') {
          await this.prisma.biolink.create({ data });
        } else {
          await this.prisma.businessCard.create({ data });
        }
        result.imported += 1;
      } catch (error) {
        result.skipped += 1;
        if (result.errors.length < 5) {
          result.errors.push(
            `ردیف «${row.fullName}»: ${error instanceof Error ? error.message : 'خطای نامشخص'}`,
          );
        }
      }
    }

    await this.activity.log({
      action: 'BULK_IMPORT',
      summary: `ایمپورت گروهی ${kind === 'BIOLINK' ? 'بیولینک' : 'کارت ویزیت'}: ${result.imported} ردیف`,
      entityType: kind,
    });

    this.facetsCache.invalidateDirectory(kind === 'BIOLINK' ? 'biolink' : 'businesscard');
    return result;
  }

  /** Count of imported (test) rows currently in the database. */
  async counts() {
    const [biolinks, businessCards] = await Promise.all([
      this.prisma.biolink.count({ where: { isTestData: true } }),
      this.prisma.businessCard.count({ where: { isTestData: true } }),
    ]);
    return { biolinks, businessCards };
  }

  /**
   * Delete imported test rows. Always scoped to `isTestData: true`, so a real
   * user's content can never be removed through this path.
   */
  async deleteTestData(
    kind: BulkKind | 'ALL',
  ): Promise<{ deleted: number }> {
    const where = { isTestData: true };
    const [biolinks, cards] = await this.prisma.$transaction([
      this.prisma.biolink.deleteMany({
        where: kind === 'BIOLINK' || kind === 'ALL' ? where : { id: '__none__' },
      }),
      this.prisma.businessCard.deleteMany({
        where: kind === 'BUSINESS_CARD' || kind === 'ALL' ? where : { id: '__none__' },
      }),
    ]);
    const deleted = biolinks.count + cards.count;
    await this.activity.log({
      action: 'BULK_DELETE',
      summary: `حذف گروهی داده‌های تستی: ${deleted} ردیف`,
      entityType: kind,
    });
    this.facetsCache.invalidateDirectory('biolink');
    this.facetsCache.invalidateDirectory('businesscard');
    return { deleted };
  }

  /** Map one raw Behtarino record to the canonical row shape. */
  private mapJsonBusiness(record: Record<string, unknown>): Record<string, string> {
    const values = new Map<string, unknown>();
    for (const [key, value] of Object.entries(record)) {
      values.set(key.trim().toLowerCase(), value);
    }
    const text = (key: string): string => {
      const value = values.get(key);
      if (value === null || value === undefined) return '';
      return String(value).trim();
    };
    const rawTags = values.get('tags');
    const tags = Array.isArray(rawTags)
      ? rawTags.map((tag) => String(tag).trim()).filter(Boolean)
      : text('tags')
          .split(/[,،]/)
          .map((tag) => tag.trim())
          .filter(Boolean);
    const subCategory = text('subcategory');
    const bio = text('description') || tags.join('، ');

    return {
      fullName: text('name'),
      jobTitle: text('main_tag') || subCategory || text('guild'),
      company: text('company'),
      business: text('category'),
      subCategory,
      subSubCategory: text('sub_sub_category'),
      neighborhood: text('neighborhood'),
      city: text('listed_city'),
      cityAlt: text('city_name'),
      phone: text('phone'),
      mobile: text('mobile'),
      email: text('email'),
      website: text('website'),
      address: text('address'),
      bio,
      tags: tags.join('، '),
      slug: text('slug'),
      instagram: text('instagram'),
      telegram: text('telegram'),
      whatsapp: text('whatsapp'),
      linkedin: text('linkedin'),
      workingHours: text('working_hours') || text('workinghours'),
    };
  }

  /**
   * Parse a Behtarino JSON array (as-is) or an Excel/CSV sheet into rows.
   * JSON is detected by the first non-space character, so a renamed `.json`
   * upload still works even if the browser reports a different MIME type.
   */
  private async parseBusinessRows(buffer: Buffer): Promise<Record<string, string>[]> {
    const head = buffer.toString('utf8', 0, 64).trimStart();
    const looksLikeJson = head.startsWith('[') || head.startsWith('{');
    if (!looksLikeJson) {
      return this.parseWorkbook(buffer, BUSINESS_COLUMN_ALIASES, MAX_BUSINESS_ROWS);
    }

    let payload: unknown;
    try {
      payload = JSON.parse(buffer.toString('utf8'));
    } catch {
      throw new BadRequestException('فایل JSON معتبر نیست');
    }
    let list: unknown[] = [];
    if (Array.isArray(payload)) {
      list = payload;
    } else if (payload && typeof payload === 'object') {
      const container = payload as Record<string, unknown>;
      for (const key of ['businesses', 'items', 'data', 'cards']) {
        if (Array.isArray(container[key])) {
          list = container[key] as unknown[];
          break;
        }
      }
    }
    if (!list.length) {
      throw new BadRequestException(
        'فایل JSON باید آرایه‌ای از کسب‌وکارها باشد (مثل فایل به‌ترینو)',
      );
    }
    if (list.length > MAX_BUSINESS_ROWS) {
      throw new BadRequestException(
        `تعداد ردیف‌های فایل (${list.length}) بیش از حد مجاز (${MAX_BUSINESS_ROWS}) است`,
      );
    }
    return list
      .filter((item): item is Record<string, unknown> =>
        Boolean(item) && typeof item === 'object',
      )
      .map((item) => this.mapJsonBusiness(item));
  }

  /**
   * Import business cards from an admin upload into their own batch.
   *
   * Every card is created APPROVED but *unpublished* and `isUnclaimed`, so the
   * public directory skips it while its direct link keeps working; the owner
   * can claim it from that page, after which it behaves like a normal card and
   * is excluded from batch rollback. City/business names are matched
   * case-insensitively and created on demand.
   */
  async importBusinessBatch(
    ownerUserId: string,
    buffer: Buffer,
    options: { label?: string; source?: string; note?: string } = {},
  ): Promise<BusinessBatchImportResult> {
    const owner = await this.prisma.user.findUnique({ where: { id: ownerUserId } });
    if (!owner) {
      throw new NotFoundException('کاربر مالک انتخاب‌شده پیدا نشد');
    }

    const rows = await this.parseBusinessRows(buffer);
    if (rows.length === 0) {
      throw new BadRequestException('فایل هیچ ردیف معتبری ندارد');
    }

    const [cities, businesses, existingCards] = await Promise.all([
      this.prisma.city.findMany(),
      this.prisma.businessCategory.findMany(),
      this.prisma.businessCard.findMany({ select: { slug: true } }),
    ]);
    const cityByName = new Map(
      cities.map((city) => [city.name.trim().toLowerCase(), city.id]),
    );
    const businessByName = new Map(
      businesses.map((business) => [business.name.trim().toLowerCase(), business.id]),
    );
    const usedSlugs = new Set(existingCards.map((card) => card.slug));

    const resolveCity = async (name?: string): Promise<string | null> => {
      const key = (name ?? '').trim();
      if (!key) return null;
      const lookup = key.toLowerCase();
      const existing = cityByName.get(lookup);
      if (existing) return existing;
      const created = await this.prisma.city.create({ data: { name: key } });
      cityByName.set(lookup, created.id);
      return created.id;
    };
    const resolveBusiness = async (name?: string): Promise<string | null> => {
      const key = (name ?? '').trim();
      if (!key) return null;
      const lookup = key.toLowerCase();
      const existing = businessByName.get(lookup);
      if (existing) return existing;
      const created = await this.prisma.businessCategory.create({ data: { name: key } });
      businessByName.set(lookup, created.id);
      return created.id;
    };
    const uniqueSlug = (raw?: string): string => {
      const base = slugifyValue(raw ?? '') || `bc-${randomSuffix()}`;
      let candidate = base;
      let suffix = 2;
      while (usedSlugs.has(candidate)) {
        candidate = `${base}-${suffix}`;
        suffix += 1;
      }
      usedSlugs.add(candidate);
      return candidate;
    };

    const now = new Date();
    const label =
      (options.label ?? '').trim() ||
      `ایمپورت دستی — ${now.toISOString().slice(0, 16).replace('T', ' ')}`;
    const note = (options.note ?? '').trim();
    const batch = await this.prisma.businessCardImportBatch.create({
      data: {
        label,
        source: (options.source ?? '').trim() || 'admin-upload',
        note: note || null,
      },
    });

    const result: BusinessBatchImportResult = {
      batchId: batch.id,
      label: batch.label,
      imported: 0,
      skipped: 0,
      errors: [],
    };
    const pending: Prisma.BusinessCardCreateManyInput[] = [];
    const fail = (name: string, message: string) => {
      result.skipped += 1;
      if (result.errors.length < 5) {
        result.errors.push(`ردیف «${name}»: ${message}`);
      }
    };

    for (const row of rows) {
      const name = (row.fullName ?? '').trim();
      if (!name) {
        fail('بدون نام', 'نام کسب‌وکار خالی است');
        continue;
      }
      try {
        const cityName = pickCity(row.city, row.cityAlt) || (row.cityAlt ?? '').trim();
        const cityId = await resolveCity(cityName);
        if (!cityId) {
          fail(name, 'شهر مشخص نشده است');
          continue;
        }
        const businessId = await resolveBusiness(row.business);
        if (!businessId) {
          fail(name, 'دسته‌ی کسب‌وکار مشخص نشده است');
          continue;
        }

        let phone = latinDigits(row.phone ?? '').replace(/[^\d+]/g, '') || null;
        let mobile = latinDigits(row.mobile ?? '').replace(/[^\d+]/g, '') || null;
        if (!mobile && phone) {
          const split = splitPhone(phone);
          phone = split.phone;
          mobile = split.mobile;
        }

        const subCategory = (row.subCategory ?? '').trim() || null;
        const tags = (row.tags ?? '').trim();
        const workingHours = parseWorkingHours(row.workingHours);

        pending.push({
          userId: ownerUserId,
          slug: uniqueSlug(row.slug || name),
          cityId,
          businessId,
          subCategory,
          subSubCategory: (row.subSubCategory ?? '').trim() || null,
          neighborhood: (row.neighborhood ?? '').trim() || null,
          fullName: name,
          jobTitle: (row.jobTitle ?? '').trim() || subCategory,
          company: (row.company ?? '').trim() || null,
          bio: (row.bio ?? '').trim() || tags || null,
          phone,
          mobile,
          email: (row.email ?? '').trim() || null,
          website: (row.website ?? '').trim() || null,
          address: (row.address ?? '').trim() || null,
          instagram: socialUrl('instagram', row.instagram),
          telegram: socialUrl('telegram', row.telegram),
          whatsapp: whatsappUrl(row.whatsapp),
          linkedin: (row.linkedin ?? '').trim() || null,
          workingHours: workingHours ?? undefined,
          status: BiolinkStatus.APPROVED,
          isPublished: false,
          isUnclaimed: true,
          approvedAt: now,
          publishedAt: null,
          pinnedAt: now,
          importBatchId: batch.id,
        });
      } catch (error) {
        fail(name, error instanceof Error ? error.message : 'خطای نامشخص');
      }
    }

    if (pending.length === 0) {
      await this.prisma.businessCardImportBatch.delete({ where: { id: batch.id } });
      throw new BadRequestException(
        `هیچ کارتی ایمپورت نشد${result.errors.length ? `: ${result.errors.join(' | ')}` : ''}`,
      );
    }

    for (let index = 0; index < pending.length; index += 500) {
      const chunk = pending.slice(index, index + 500);
      await this.prisma.businessCard.createMany({ data: chunk });
      result.imported += chunk.length;
    }

    await this.activity.log({
      action: 'IMPORT_BATCH_CREATED',
      summary: `ایمپورت دسته‌ی کسب‌وکار «${batch.label}»: ${result.imported} کارت (${result.skipped} ردیف رد شد)`,
      entityType: 'BUSINESS_CARD',
      entityId: batch.id,
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return result;
  }

  /**
   * Import batches created by the external business importer. Each batch has
   * its own label and import date/time, so different runs never mix. `total`
   * counts every card that came from the batch, while `remaining` counts only
   * the still-unclaimed ones that a rollback would actually delete.
   */
  async listImportBatches() {
    const batches = await this.prisma.businessCardImportBatch.findMany({
      orderBy: { createdAt: 'desc' },
    });
    const [totalRows, remainingRows] = await Promise.all([
      this.prisma.businessCard.groupBy({
        by: ['importBatchId'],
        where: { importBatchId: { not: null } },
        _count: { _all: true },
      }),
      this.prisma.businessCard.groupBy({
        by: ['importBatchId'],
        where: { importBatchId: { not: null }, isUnclaimed: true },
        _count: { _all: true },
      }),
    ]);
    const totalByBatch = new Map(
      totalRows
        .filter((row) => row.importBatchId)
        .map((row) => [row.importBatchId as string, row._count._all]),
    );
    const remainingByBatch = new Map(
      remainingRows
        .filter((row) => row.importBatchId)
        .map((row) => [row.importBatchId as string, row._count._all]),
    );

    const items = batches.map((batch) => {
      const total = totalByBatch.get(batch.id) ?? 0;
      const remaining = remainingByBatch.get(batch.id) ?? 0;
      return {
        ...batch,
        total,
        remaining,
        claimed: Math.max(total - remaining, 0),
      };
    });

    return {
      items,
      totals: {
        batches: items.length,
        total: items.reduce((sum, item) => sum + item.total, 0),
        remaining: items.reduce((sum, item) => sum + item.remaining, 0),
        claimed: items.reduce((sum, item) => sum + item.claimed, 0),
      },
    };
  }

  /**
   * Roll back one import batch. Only rows still tagged `isUnclaimed` are
   * deleted, so a card whose owner has claimed/edited it is never touched.
   */
  async rollbackImportBatch(id: string) {
    const batch = await this.prisma.businessCardImportBatch.findUnique({
      where: { id },
      select: { id: true, label: true },
    });
    if (!batch) {
      throw new NotFoundException('دسته‌ی ایمپورت پیدا نشد');
    }
    const deleted = await this.prisma.businessCard.deleteMany({
      where: { importBatchId: id, isUnclaimed: true },
    });
    await this.prisma.businessCardImportBatch.update({
      where: { id },
      data: { rolledBackAt: new Date(), rolledBackCount: deleted.count },
    });
    await this.activity.log({
      action: 'IMPORT_BATCH_ROLLBACK',
      summary: `بازگردانی دسته‌ی ایمپورت «${batch.label}»: ${deleted.count} کارت حذف شد`,
      entityType: 'BUSINESS_CARD',
      entityId: id,
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return { deleted: deleted.count };
  }

  /**
   * Roll back every imported business card in one click. Claimed cards are
   * excluded because they are no longer `isUnclaimed`.
   */
  async rollbackAllImports() {
    const now = new Date();
    const deleted = await this.prisma.$transaction(async (tx) => {
      const counts = await tx.businessCard.groupBy({
        by: ['importBatchId'],
        where: { importBatchId: { not: null }, isUnclaimed: true },
        _count: { _all: true },
      });
      const result = await tx.businessCard.deleteMany({
        where: { isUnclaimed: true },
      });
      for (const row of counts) {
        if (!row.importBatchId) continue;
        await tx.businessCardImportBatch.update({
          where: { id: row.importBatchId },
          data: { rolledBackAt: now, rolledBackCount: row._count._all },
        });
      }
      await tx.businessCardImportBatch.updateMany({
        where: { rolledBackAt: null },
        data: { rolledBackAt: now },
      });
      return result.count;
    });

    await this.activity.log({
      action: 'IMPORT_ROLLBACK_ALL',
      summary: `بازگردانی همه‌ی ایمپورت‌های کسب‌وکار: ${deleted} کارت حذف شد`,
      entityType: 'BUSINESS_CARD',
    });
    this.facetsCache.invalidateDirectory('businesscard');
    return { deleted };
  }

  /**
   * CSV of phone numbers + public links for the still-unclaimed cards of one
   * batch (or every batch when `batchId` is omitted), ready to send to owners.
   */
  async exportImportBatchCsv(batchId?: string): Promise<string> {
    const cards = await this.prisma.businessCard.findMany({
      where: {
        isUnclaimed: true,
        ...(batchId ? { importBatchId: batchId } : {}),
      },
      orderBy: { fullName: 'asc' },
      select: {
        fullName: true,
        mobile: true,
        phone: true,
        slug: true,
        city: { select: { name: true } },
        business: { select: { name: true } },
      },
    });
    const base = appUrl().replace(/\/$/, '');
    const header = 'نام,تلفن همراه,تلفن ثابت,شهر,کسب و کار,لینک\n';
    const lines = cards.map((card) =>
      [
        card.fullName,
        card.mobile,
        card.phone,
        card.city?.name,
        card.business?.name,
        `${base}/business-cards/${card.slug}`,
      ]
        .map(csvCell)
        .join(','),
    );
    return '\uFEFF' + header + lines.join('\n') + (lines.length ? '\n' : '');
  }

  /**
   * «شهرها و محله‌ها» import: one row per neighbourhood (city repeated), or a
   * lone city row when it has no neighbourhood. Cities and neighbourhoods are
   * matched case-insensitively, so re-importing the same file is idempotent.
   */
  async importCityNeighborhoods(buffer: Buffer): Promise<TaxonomyCityImportResult> {
    const rows = await this.parseWorkbook(buffer, TAXONOMY_CITY_ALIASES, MAX_ROWS, {
      field: 'city',
      message: 'ستون «شهر» در فایل پیدا نشد. حداقل یک ستون با عنوان «شهر» لازم است.',
    });
    if (rows.length === 0) {
      throw new BadRequestException('فایل هیچ ردیف معتبری ندارد');
    }

    const [cities, neighborhoods] = await Promise.all([
      this.prisma.city.findMany(),
      this.prisma.neighborhood.findMany({
        select: { cityId: true, name: true },
      }),
    ]);
    const cityByName = new Map(
      cities.map((city) => [city.name.trim().toLowerCase(), city]),
    );
    const neighborhoodKeys = new Set(
      neighborhoods.map(
        (item) => `${item.cityId}|${item.name.trim().toLowerCase()}`,
      ),
    );

    const result: TaxonomyCityImportResult = {
      citiesCreated: 0,
      neighborhoodsCreated: 0,
      skipped: 0,
      errors: [],
    };
    const fail = (name: string, message: string) => {
      result.skipped += 1;
      if (result.errors.length < 5) {
        result.errors.push(`ردیف «${name}»: ${message}`);
      }
    };

    for (const row of rows) {
      const cityName = (row.city ?? '').trim();
      if (!cityName) {
        fail('بدون شهر', 'نام شهر خالی است');
        continue;
      }
      try {
        let city = cityByName.get(cityName.toLowerCase());
        if (!city) {
          city = await this.prisma.city.create({ data: { name: cityName } });
          cityByName.set(cityName.toLowerCase(), city);
          result.citiesCreated += 1;
        }

        const neighborhood = (row.neighborhood ?? '').trim();
        if (!neighborhood) continue;
        const key = `${city.id}|${neighborhood.toLowerCase()}`;
        if (neighborhoodKeys.has(key)) continue;
        await this.prisma.neighborhood.create({
          data: { name: neighborhood, cityId: city.id },
        });
        neighborhoodKeys.add(key);
        result.neighborhoodsCreated += 1;
      } catch (error) {
        fail(cityName, error instanceof Error ? error.message : 'خطای نامشخص');
      }
    }

    await this.activity.log({
      action: 'TAXONOMY_CITIES_IMPORT',
      summary: `ایمپورت شهرها و محله‌ها: ${result.citiesCreated} شهر و ${result.neighborhoodsCreated} محله‌ی تازه (${result.skipped} ردیف رد شد)`,
      entityType: 'CITY',
    });
    this.facetsCache.invalidate();
    return result;
  }

  /**
   * «مشاغل» import: each row is `main category, sub-category, sub-sub`.
   * A row may stop at the sub-category (sub-sub left empty); the sub-category
   * is created once and every sub-sub is attached to it. Existing names are
   * reused, so importing the same file twice creates no duplicates.
   */
  async importBusinessTaxonomy(
    buffer: Buffer,
  ): Promise<TaxonomyBusinessImportResult> {
    const rows = await this.parseWorkbook(
      buffer,
      TAXONOMY_BUSINESS_ALIASES,
      MAX_BUSINESS_ROWS,
      {
        field: 'business',
        message:
          'ستون «کسب و کار» در فایل پیدا نشد. حداقل یک ستون با عنوان «کسب و کار» لازم است.',
      },
    );
    if (rows.length === 0) {
      throw new BadRequestException('فایل هیچ ردیف معتبری ندارد');
    }

    const [categories, nodes] = await Promise.all([
      this.prisma.businessCategory.findMany(),
      this.prisma.businessTaxonomyNode.findMany({
        select: { id: true, name: true, level: true, categoryId: true, parentId: true },
      }),
    ]);
    const categoryByName = new Map(
      categories.map((category) => [category.name.trim().toLowerCase(), category]),
    );
    const subKey = (categoryId: string, name: string) =>
      `${categoryId}|SUB|${name.trim().toLowerCase()}`;
    const tagKey = (parentId: string, name: string) =>
      `${parentId}|TAG|${name.trim().toLowerCase()}`;
    const subByName = new Map<string, string>();
    const tagKeys = new Set<string>();
    for (const node of nodes) {
      if (node.level === 'SUB') {
        subByName.set(subKey(node.categoryId, node.name), node.id);
      } else if (node.level === 'TAG' && node.parentId) {
        tagKeys.add(tagKey(node.parentId, node.name));
      }
    }

    const result: TaxonomyBusinessImportResult = {
      categoriesCreated: 0,
      subCategoriesCreated: 0,
      subSubCategoriesCreated: 0,
      skipped: 0,
      errors: [],
    };
    const fail = (name: string, message: string) => {
      result.skipped += 1;
      if (result.errors.length < 5) {
        result.errors.push(`ردیف «${name}»: ${message}`);
      }
    };
    const pendingTags: Prisma.BusinessTaxonomyNodeCreateManyInput[] = [];

    for (const row of rows) {
      const categoryName = (row.business ?? '').trim();
      if (!categoryName) {
        fail('بدون دسته', 'نام کسب‌وکار خالی است');
        continue;
      }
      try {
        let category = categoryByName.get(categoryName.toLowerCase());
        if (!category) {
          category = await this.prisma.businessCategory.create({
            data: { name: categoryName },
          });
          categoryByName.set(categoryName.toLowerCase(), category);
          result.categoriesCreated += 1;
        }

        const subName = (row.subCategory ?? '').trim();
        if (!subName) continue;
        let subId = subByName.get(subKey(category.id, subName));
        if (!subId) {
          const created = await this.prisma.businessTaxonomyNode.create({
            data: { name: subName, level: 'SUB', categoryId: category.id },
          });
          subId = created.id;
          subByName.set(subKey(category.id, subName), subId);
          result.subCategoriesCreated += 1;
        }

        const tagName = (row.subSubCategory ?? '').trim();
        if (!tagName) continue;
        const key = tagKey(subId, tagName);
        if (tagKeys.has(key)) continue;
        tagKeys.add(key);
        pendingTags.push({
          name: tagName,
          level: 'TAG',
          categoryId: category.id,
          parentId: subId,
        });
      } catch (error) {
        fail(categoryName, error instanceof Error ? error.message : 'خطای نامشخص');
      }
    }

    for (let index = 0; index < pendingTags.length; index += 500) {
      const chunk = pendingTags.slice(index, index + 500);
      await this.prisma.businessTaxonomyNode.createMany({ data: chunk });
      result.subSubCategoriesCreated += chunk.length;
    }

    await this.activity.log({
      action: 'TAXONOMY_BUSINESS_IMPORT',
      summary: `ایمپورت مشاغل: ${result.categoriesCreated} دسته، ${result.subCategoriesCreated} زیردسته و ${result.subSubCategoriesCreated} زیرشاخه‌ی تازه (${result.skipped} ردیف رد شد)`,
      entityType: 'BUSINESS_CATEGORY',
    });
    this.facetsCache.invalidate();
    return result;
  }

  /** CSV of the current active cities + their neighbourhoods, import-ready. */
  async exportCityNeighborhoodsCsv(): Promise<string> {
    const cities = await this.prisma.city.findMany({
      where: { isActive: true },
      select: {
        name: true,
        neighborhoods: {
          where: { isActive: true },
          select: { name: true },
          orderBy: { name: 'asc' },
        },
      },
    });
    const collator = new Intl.Collator('fa');
    const ordered = [...cities].sort((a, b) => {
      const rank = (name: string) =>
        MAIN_CITY_ORDER.indexOf(name.trim() as (typeof MAIN_CITY_ORDER)[number]);
      const byRank =
        (rank(a.name) === -1 ? MAIN_CITY_ORDER.length : rank(a.name)) -
        (rank(b.name) === -1 ? MAIN_CITY_ORDER.length : rank(b.name));
      return byRank || collator.compare(a.name, b.name);
    });
    const lines: string[] = [];
    for (const city of ordered) {
      if (city.neighborhoods.length === 0) {
        lines.push([city.name, ''].map(csvCell).join(','));
        continue;
      }
      for (const neighborhood of city.neighborhoods) {
        lines.push([city.name, neighborhood.name].map(csvCell).join(','));
      }
    }
    return '\uFEFF' + 'شهر,محله\n' + lines.join('\n') + (lines.length ? '\n' : '');
  }

  /** CSV of the current active taxonomy: main category, sub, sub-sub. */
  async exportBusinessTaxonomyCsv(): Promise<string> {
    const categories = await this.prisma.businessCategory.findMany({
      where: { isActive: true },
      select: {
        name: true,
        taxonomyNodes: {
          where: { isActive: true },
          select: { id: true, name: true, level: true, parentId: true },
        },
      },
    });
    const collator = new Intl.Collator('fa');
    const lines: string[] = [];
    for (const category of [...categories].sort((a, b) =>
      collator.compare(a.name, b.name),
    )) {
      const subs = category.taxonomyNodes
        .filter((node) => node.level === 'SUB')
        .sort((a, b) => collator.compare(a.name, b.name));
      for (const sub of subs) {
        const tags = category.taxonomyNodes
          .filter((node) => node.level === 'TAG' && node.parentId === sub.id)
          .sort((a, b) => collator.compare(a.name, b.name));
        if (tags.length === 0) {
          lines.push([category.name, sub.name, ''].map(csvCell).join(','));
          continue;
        }
        for (const tag of tags) {
          lines.push(
            [category.name, sub.name, tag.name].map(csvCell).join(','),
          );
        }
      }
      if (subs.length === 0) {
        lines.push([category.name, '', ''].map(csvCell).join(','));
      }
    }
    return (
      '\uFEFF' +
      'کسب و کار,زیردسته,زیرشاخه\n' +
      lines.join('\n') +
      (lines.length ? '\n' : '')
    );
  }
}
