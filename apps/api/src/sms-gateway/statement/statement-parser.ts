import { BadRequestException } from '@nestjs/common';
import * as ExcelJS from 'exceljs';

import { jalaliToDate } from '../../common/jalali';

export type StatementRowType = 'DEPOSIT' | 'WITHDRAWAL' | 'UNKNOWN';

export interface StatementRow {
  rowNumber: number;
  description: string;
  /** Amount in Toman (the bank export is in Rial). */
  amountToman: number;
  amountRial: number;
  type: StatementRowType;
  occurredAt: Date | null;
  balanceRial: number | null;
  sourceCard: string | null;
  destinationCard: string | null;
  trackingNumber: string | null;
}

export interface ParsedStatement {
  accountNumber: string | null;
  bankName: string | null;
  rows: StatementRow[];
}

const PERSIAN_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';

/** Persian/Arabic digits → ASCII, and Arabic yeh/kaf → Persian. */
function normalizeText(value: string): string {
  return value
    .replace(/[۰-۹]/g, (digit) => String(PERSIAN_DIGITS.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String(ARABIC_DIGITS.indexOf(digit)))
    .replace(/ي/g, 'ی')
    .replace(/ك/g, 'ک')
    .replace(/\u200c/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function cellText(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) return '';
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'object') {
    const record = value as unknown as Record<string, unknown>;
    if (Array.isArray(record.richText)) {
      return (record.richText as Array<{ text?: string }>)
        .map((part) => part.text ?? '')
        .join('');
    }
    if ('result' in record) return cellText(record.result as ExcelJS.CellValue);
    if ('text' in record) return String(record.text ?? '');
  }
  return String(value);
}

function parseNumber(value: ExcelJS.CellValue): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const text = normalizeText(cellText(value)).replace(/[,٬\s]/g, '');
  if (!text) return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

/** `1405/09/05  20:51` → Date (Tehran wall clock). */
function parseJalaliDateTime(value: string): Date | null {
  const match = normalizeText(value).match(
    /(\d{4})[/-](\d{1,2})[/-](\d{1,2})(?:\s+(\d{1,2}):(\d{2}))?/,
  );
  if (!match) return null;
  return jalaliToDate(
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    Number(match[4] ?? 0),
    Number(match[5] ?? 0),
  );
}

function parseType(value: string): StatementRowType {
  const text = normalizeText(value);
  if (text.includes('واریز') || text.includes('بستانکار')) return 'DEPOSIT';
  if (text.includes('برداشت') || text.includes('بدهکار')) return 'WITHDRAWAL';
  return 'UNKNOWN';
}

interface DescriptionInfo {
  sourceCard: string | null;
  destinationCard: string | null;
  trackingNumber: string | null;
}

function parseDescription(value: string): DescriptionInfo {
  const text = normalizeText(value);
  const cards = text.match(/\d{16}/g) ?? [];
  let sourceCard: string | null = null;
  let destinationCard: string | null = null;
  const transfer = text.match(/از\s*(\d{16})\s*به\s*(\d{16})/);
  if (transfer) {
    sourceCard = transfer[1] ?? null;
    destinationCard = transfer[2] ?? null;
  } else if (cards.length >= 2) {
    sourceCard = cards[0] ?? null;
    destinationCard = cards[1] ?? null;
  } else if (cards.length === 1) {
    destinationCard = cards[0] ?? null;
  }
  const tracking = text.match(
    /(?:کد\s*رهگیری|کد\s*پیگیری|پیگیری|رهگیری)\s*:?\s*(\d{3,})/,
  );
  return {
    sourceCard,
    destinationCard,
    trackingNumber: tracking?.[1] ?? null,
  };
}

interface HeaderMap {
  rowNumber: number;
  index: number;
  description: number;
  amount: number;
  type: number;
  date: number;
  balance: number;
}

function findHeader(sheet: ExcelJS.Worksheet): HeaderMap | null {
  const maxScan = Math.min(sheet.rowCount, 30);
  for (let rowIndex = 1; rowIndex <= maxScan; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    const headers = new Map<string, number>();
    row.eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = normalizeText(cellText(cell.value));
      if (text) headers.set(text, colNumber);
    });
    const find = (...needles: string[]): number => {
      for (const [text, col] of headers) {
        if (needles.some((needle) => text.includes(needle))) return col;
      }
      return 0;
    };
    const description = find('توضیح');
    const amount = find('مبلغ');
    const date = find('زمان');
    if (description && amount && date) {
      return {
        rowNumber: rowIndex,
        index: find('ردیف'),
        description,
        amount,
        type: find('نوع'),
        date,
        balance: find('مانده'),
      };
    }
  }
  return null;
}

function readMeta(sheet: ExcelJS.Worksheet, headerRow: number) {
  let accountNumber: string | null = null;
  let bankName: string | null = null;
  const maxScan = Math.min(headerRow, 10);
  for (let rowIndex = 1; rowIndex <= maxScan; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    row.eachCell({ includeEmpty: false }, (cell) => {
      const text = normalizeText(cellText(cell.value));
      const account = text.match(/شماره\s*حساب\s*:?\s*(\d{6,})/);
      if (account) accountNumber = account[1];
      const source = text.match(/منبع\s*گزارش\s*:?\s*(.+)$/);
      if (source) bankName = source[1].trim();
    });
  }
  return { accountNumber, bankName };
}

async function loadWorkbook(buffer: Buffer): Promise<ExcelJS.Workbook> {
  const workbook = new ExcelJS.Workbook();
  const isZip = buffer.length > 4 && buffer[0] === 0x50 && buffer[1] === 0x4b;
  try {
    if (isZip) {
      await workbook.xlsx.load(buffer as unknown as ExcelJS.Buffer);
    } else {
      const { Readable } = await import('stream');
      const stream = Readable.from(buffer.toString('utf8'));
      await workbook.csv.read(stream);
    }
  } catch {
    throw new BadRequestException(
      'فایل صورت‌حساب قابل خواندن نیست؛ یک فایل Excel (xlsx) یا CSV معتبر بفرستید.',
    );
  }
  const sheet = workbook.worksheets[0];
  if (!sheet) {
    throw new BadRequestException('فایل ورودی هیچ شیتی ندارد');
  }
  return workbook;
}

/**
 * Parses a bank statement export (Mehr Iran / Melli style) into rows.
 *
 * The expected layout is the one the bank's internet-banking exports: a few
 * header lines (account, report source, totals), then a table with
 * «ردیف | توضیح | مبلغ (ریال) | نوع | زمان تراکنش | مانده».
 */
export async function parseStatementFile(
  buffer: Buffer,
): Promise<ParsedStatement> {
  const workbook = await loadWorkbook(buffer);
  const sheet = workbook.worksheets[0];
  const header = findHeader(sheet);
  if (!header) {
    throw new BadRequestException(
      'ستون‌های «توضیح»، «مبلغ» و «زمان تراکنش» در فایل پیدا نشد.',
    );
  }
  const meta = readMeta(sheet, header.rowNumber);

  // Cells inside a merge range (other than the top-left) repeat the master
  // value in ExcelJS, which would duplicate a transaction across the merged
  // rows. Collect those rows so they are skipped.
  const mergedRows = new Set<number>();
  const merges =
    (sheet as unknown as { model?: { merges?: string[] } }).model?.merges ?? [];
  for (const range of merges) {
    const [start, end] = range.split(':');
    const startRow = Number(start.replace(/\D/g, ''));
    const endRow = Number(end.replace(/\D/g, ''));
    for (let rowIndex = startRow + 1; rowIndex <= endRow; rowIndex += 1) {
      mergedRows.add(rowIndex);
    }
  }

  const rows: StatementRow[] = [];
  for (let rowIndex = header.rowNumber + 1; rowIndex <= sheet.rowCount; rowIndex += 1) {
    const row = sheet.getRow(rowIndex);
    if (mergedRows.has(rowIndex)) continue;
    if (header.index) {
      const indexValue = parseNumber(row.getCell(header.index).value);
      if (indexValue === null) continue;
    }
    const description = normalizeText(
      cellText(row.getCell(header.description).value),
    );
    const amountRial = parseNumber(row.getCell(header.amount).value);
    if (!description || amountRial === null || amountRial <= 0) continue;

    const info = parseDescription(description);
    rows.push({
      rowNumber: rowIndex,
      description,
      amountRial,
      amountToman: Math.round(amountRial / 10),
      type: header.type
        ? parseType(cellText(row.getCell(header.type).value))
        : 'UNKNOWN',
      occurredAt: parseJalaliDateTime(cellText(row.getCell(header.date).value)),
      balanceRial: header.balance
        ? parseNumber(row.getCell(header.balance).value)
        : null,
      sourceCard: info.sourceCard,
      destinationCard: info.destinationCard,
      trackingNumber: info.trackingNumber,
    });
  }

  return { ...meta, rows };
}
