import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { BiolinkStatus } from '@prisma/client';
import * as ExcelJS from 'exceljs';

import { ActivityService } from '../activity/activity.service';
import { FacetsCacheService } from '../common/facets-cache.service';
import { PrismaService } from '../prisma/prisma.service';

export type BulkKind = 'BIOLINK' | 'BUSINESS_CARD';

export interface BulkImportResult {
  kind: BulkKind;
  imported: number;
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

const MAX_ROWS = 5000;

function normalizeHeader(value: string): string {
  return value.trim().toLowerCase();
}

function randomSuffix(): string {
  return Math.random().toString(36).slice(2, 8);
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
  private async parseWorkbook(buffer: Buffer): Promise<Record<string, string>[]> {
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
      const canonical = COLUMN_ALIASES[normalizeHeader(raw)];
      if (canonical) headerMap.set(colNumber, canonical);
    });

    if (![...headerMap.values()].includes('fullName')) {
      throw new BadRequestException(
        'ستون «نام» در فایل پیدا نشد. حداقل یک ستون با عنوان «نام» لازم است.',
      );
    }

    const rows: Record<string, string>[] = [];
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      if (rows.length >= MAX_ROWS) return;
      const record: Record<string, string> = {};
      headerMap.forEach((field, colNumber) => {
        const value = row.getCell(colNumber).value;
        record[field] =
          value === null || value === undefined
            ? ''
            : String(value).trim();
      });
      if (record.fullName) rows.push(record);
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
}
