import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
} from '@nestjs/common';

import { SettingsService } from '../settings/settings.service';
import { buildIcalCalendar, type IcalBlock } from './ical';

const PAGE_TIMEOUT_MS = 20_000;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** `calendar\":[` — the availability array embedded in Jabama's RSC payload. */
const CALENDAR_MARKER = /calendar\\":\[/;

export interface JabamaCalendarDay {
  date: string;
  status: string;
}

export interface JabamaBlockedRange {
  /** Inclusive first blocked night (`YYYY-MM-DD`). */
  start: string;
  /** Exclusive end (`YYYY-MM-DD`), i.e. the first free night after the block. */
  end: string;
  days: number;
}

export interface JabamaCalendar {
  url: string;
  ref: string | null;
  title: string | null;
  days: JabamaCalendarDay[];
  blocks: JabamaBlockedRange[];
}

export interface JabamaCalendarPreview {
  url: string;
  ref: string | null;
  title: string | null;
  totalDays: number;
  availableDays: number;
  blockedDays: number;
  blockedRanges: JabamaBlockedRange[];
}

/** True when `value` is a public Jabama stay page (not an .ics feed). */
export function isJabamaStayUrl(value: string): boolean {
  try {
    const parsed = new URL(value.trim());
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') return false;
    const host = parsed.hostname.toLowerCase();
    if (host !== 'jabama.com' && !host.endsWith('.jabama.com')) return false;
    return /\/stay\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}

function parseDateOnly(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  return new Date(
    Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])),
  );
}

function toDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  const date = parseDateOnly(value);
  if (!date) return value;
  date.setUTCDate(date.getUTCDate() + days);
  return toDateOnly(date);
}

/**
 * Turns a Jabama stay page into an iCal feed.
 *
 * Jabama does not expose a public iCal export for hosts, but every stay page
 * embeds its availability calendar (`status: available | disabled`) in the
 * server-rendered payload. We read that array and serialise the blocked nights
 * as an all-day iCal feed so the owner can either import it into our channel
 * sync or paste it into another OTA.
 */
@Injectable()
export class JabamaCalendarService {
  private readonly logger = new Logger(JabamaCalendarService.name);

  constructor(private readonly settings: SettingsService) {}

  /** Only Jabama stay links are accepted. */
  normaliseUrl(raw: string): string {
    const value = raw.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('لینک اقامتگاه معتبر نیست.');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('لینک اقامتگاه معتبر نیست.');
    }
    const host = parsed.hostname.toLowerCase();
    if (host !== 'jabama.com' && !host.endsWith('.jabama.com')) {
      throw new BadRequestException('فقط لینک اقامتگاه جاباما پشتیبانی می‌شود.');
    }
    if (!/\/stay\//i.test(parsed.pathname)) {
      throw new BadRequestException(
        'لینک باید صفحه‌ی یک اقامتگاه جاباما (شامل /stay/) باشد.',
      );
    }
    return parsed.toString();
  }

  async preview(rawUrl: string): Promise<JabamaCalendarPreview> {
    const calendar = await this.fetch(rawUrl);
    const blockedDays = calendar.days.filter(
      (day) => day.status !== 'available',
    ).length;
    return {
      url: calendar.url,
      ref: calendar.ref,
      title: calendar.title,
      totalDays: calendar.days.length,
      availableDays: calendar.days.length - blockedDays,
      blockedDays,
      blockedRanges: calendar.blocks,
    };
  }

  async toIcal(rawUrl: string): Promise<string> {
    const calendar = await this.fetch(rawUrl);
    const blocks: IcalBlock[] = calendar.blocks.map((block) => ({
      uid: `jabama-${calendar.ref ?? 'stay'}-${block.start}@alooshomal`,
      start: parseDateOnly(block.start) ?? new Date(),
      end: parseDateOnly(block.end) ?? new Date(),
      summary: 'رزرو/مسدود در جاباما',
    }));
    return buildIcalCalendar(
      calendar.title ?? `جاباما ${calendar.ref ?? ''}`.trim(),
      blocks,
    );
  }

  /** Fetches the stay page and extracts its availability calendar. */
  async fetch(rawUrl: string): Promise<JabamaCalendar> {
    await this.settings.assertFeatureEnabled('featureAccommodationRental');
    const url = this.normaliseUrl(rawUrl);
    const html = await this.fetchHtml(url);
    const days = this.extractDays(html);
    if (days.length === 0) {
      throw new BadGatewayException(
        'تقویم اقامتگاه در صفحه‌ی جاباما پیدا نشد. شاید این اقامتگاه غیرفعال شده باشد.',
      );
    }
    return {
      url,
      ref: this.extractRef(url),
      title: this.extractTitle(html),
      days,
      blocks: this.groupBlocks(days),
    };
  }

  private extractRef(url: string): string | null {
    const match = url.match(/\/stay\/([a-z0-9-]+)/i);
    return match?.[1] ?? null;
  }

  private extractTitle(html: string): string | null {
    const match = /<title>([^<]{1,300})<\/title>/i.exec(html);
    if (!match) return null;
    const title = match[1]
      .replace(/\s*\|\s*جاباما\s*$/u, '')
      .replace(/\s+/g, ' ')
      .trim();
    return title || null;
  }

  private extractDays(html: string): JabamaCalendarDay[] {
    const match = CALENDAR_MARKER.exec(html);
    if (!match) return [];
    const start = match.index + match[0].length;
    let depth = 1;
    let end = -1;
    for (let index = start; index < html.length; index += 1) {
      const char = html[index];
      if (char === '[') depth += 1;
      else if (char === ']') {
        depth -= 1;
        if (depth === 0) {
          end = index;
          break;
        }
      }
    }
    if (end < 0) return [];
    const raw = html.slice(start, end);
    let parsed: unknown = null;
    try {
      parsed = JSON.parse(raw.split('\\"').join('"').split('\\\\').join('\\'));
    } catch {
      parsed = null;
    }
    if (Array.isArray(parsed)) {
      return parsed
        .map((item) => {
          const record = item as { date?: unknown; status?: unknown };
          if (typeof record?.date !== 'string') return null;
          return {
            date: record.date,
            status:
              typeof record.status === 'string' ? record.status : 'disabled',
          };
        })
        .filter((item): item is JabamaCalendarDay => item !== null);
    }
    // Fallback: read the escaped `date`/`status` pairs directly.
    const days: JabamaCalendarDay[] = [];
    const pattern = /\\"date\\":\\"(\d{4}-\d{2}-\d{2})\\",\\"status\\":\\"([a-z_]+)\\"/g;
    let pair: RegExpExecArray | null;
    while ((pair = pattern.exec(raw)) !== null) {
      days.push({ date: pair[1], status: pair[2] });
    }
    return days;
  }

  private groupBlocks(days: JabamaCalendarDay[]): JabamaBlockedRange[] {
    const sorted = [...days]
      .filter((day) => parseDateOnly(day.date))
      .sort((a, b) => a.date.localeCompare(b.date));
    const blocks: JabamaBlockedRange[] = [];
    let current: { start: string; last: string; days: number } | null = null;
    const flush = () => {
      if (!current) return;
      blocks.push({
        start: current.start,
        end: addDays(current.last, 1),
        days: current.days,
      });
      current = null;
    };
    for (const day of sorted) {
      if (day.status === 'available') {
        flush();
        continue;
      }
      if (current && addDays(current.last, 1) === day.date) {
        current.last = day.date;
        current.days += 1;
      } else {
        flush();
        current = { start: day.date, last: day.date, days: 1 };
      }
    }
    flush();
    return blocks;
  }

  private async fetchHtml(url: string): Promise<string> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': BROWSER_UA,
          Accept: 'text/html,application/xhtml+xml',
          'Accept-Language': 'fa-IR,fa;q=0.9,en;q=0.8',
        },
        signal: controller.signal,
      });
      if (!response.ok) {
        throw new BadGatewayException(
          `دریافت صفحه‌ی جاباما ناموفق بود (کد ${response.status}).`,
        );
      }
      return await response.text();
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.warn(
        `Jabama calendar fetch failed: ${(error as Error)?.message ?? error}`,
      );
      throw new BadGatewayException(
        'دریافت تقویم از جاباما ناموفق بود. لطفاً بعداً تلاش کنید.',
      );
    } finally {
      clearTimeout(timer);
    }
  }
}
