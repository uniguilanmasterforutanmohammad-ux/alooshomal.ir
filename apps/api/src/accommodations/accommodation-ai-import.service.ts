import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { WalletEntryKind } from '@prisma/client';

import { BusinessModulesService } from '../business-modules/business-modules.service';
import { FINANCE_SOURCE_TYPES } from '../finance/finance.constants';
import { FinanceService } from '../finance/finance.service';
import { PrismaService } from '../prisma/prisma.service';
import { SettingsService } from '../settings/settings.service';
import { UploadsService } from '../uploads/uploads.service';
import { WalletService } from '../wallet/wallet.service';
import { AccommodationsService } from './accommodations.service';
import {
  EstimateAccommodationAiImportDto,
  ImportAccommodationAiImportDto,
} from './dto/ai-import.dto';

/** Same model/endpoint as the Digikala product import. */
const AI_MODEL = 'deepseek/deepseek-v4.1-flash-1017';
const AI_ENDPOINT = 'https://ai.chabokan.net/v1/chat/completions';
const PAGE_TIMEOUT_MS = 25_000;
const AI_TIMEOUT_MS = 90_000;
const IMAGE_TIMEOUT_MS = 15_000;
const MAX_DESCRIPTION_CHARS = 4000;
const MAX_IMAGE_KB = 4096;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

/** Our internal property types, mapped from Jabama's English type slugs. */
const PROPERTY_TYPE_MAP: Record<string, string> = {
  villa: 'VILLA',
  apartment: 'APARTMENT',
  suite: 'SUITE',
  house: 'HOUSE',
  cottage: 'COTTAGE',
  hut: 'COTTAGE',
  bungalow: 'COTTAGE',
  hotel: 'OTHER',
  hostel: 'OTHER',
  camp: 'OTHER',
};

export interface ExtractedStay {
  title: string | null;
  description: string | null;
  propertyType: string | null;
  propertyTypeLabel: string | null;
  cityName: string | null;
  provinceName: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  maxGuests: number | null;
  bedrooms: number | null;
  beds: number | null;
  bathrooms: number | null;
  areaSize: number | null;
  basePrice: number | null;
  minNights: number | null;
  checkInTime: string | null;
  checkOutTime: string | null;
  instantBooking: boolean;
  rating: number | null;
  reviewsCount: number | null;
  amenities: string[];
  rules: string[];
  images: string[];
}

interface AiStayJson {
  title?: string;
  description?: string;
  propertyType?: string;
  cityName?: string | null;
  maxGuests?: number | null;
  bedrooms?: number | null;
  beds?: number | null;
  bathrooms?: number | null;
  areaSize?: number | null;
  basePrice?: number | null;
  minNights?: number | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  instantBooking?: boolean;
  rating?: number | null;
  reviewsCount?: number | null;
  amenities?: string[];
  rules?: string[];
}

export interface AccommodationAiImportEstimate {
  url: string;
  sourceTitle: string | null;
  estimatedTokens: number;
  pricePer1k: number;
  minPrice: number;
  price: number;
}

@Injectable()
export class AccommodationAiImportService {
  private readonly logger = new Logger(AccommodationAiImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
    private readonly finance: FinanceService,
    private readonly uploads: UploadsService,
    private readonly accommodations: AccommodationsService,
  ) {}

  private apiKey(): string {
    const key =
      process.env.API_AI_CHABOKAN_IMPORT_STAYS?.trim() ||
      process.env.API_AI_CHABOKAN_IMPORT_PRODUCTS?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است.',
      );
    }
    return key;
  }

  /** Only Jabama stay links are accepted. */
  private normaliseUrl(raw: string): string {
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

  private extractRef(url: string): string | null {
    const match = url.match(/\/stay\/([a-z0-9-]+)/i);
    return match?.[1] ?? null;
  }

  /** Jabama quotes prices in Rial; the panel works in Toman. */
  private rialToToman(value: unknown): number | null {
    const parsed =
      typeof value === 'number'
        ? value
        : value
          ? Number(String(value).replace(/[^\d.]/g, ''))
          : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return Math.round(parsed / 10);
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
        `Jabama fetch failed: ${(error as Error)?.message ?? error}`,
      );
      throw new BadGatewayException(
        'دریافت اطلاعات از جاباما ناموفق بود. لطفاً بعداً تلاش کنید.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private static decodeHtml(value: string): string {
    return value
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private metaContent(html: string, property: string): string | null {
    const patterns = [
      new RegExp(
        `<meta[^>]+(?:property|name)=["']${property}["'][^>]+content=["']([^"']*)["']`,
        'i',
      ),
      new RegExp(
        `<meta[^>]+content=["']([^"']*)["'][^>]+(?:property|name)=["']${property}["']`,
        'i',
      ),
    ];
    for (const pattern of patterns) {
      const match = html.match(pattern);
      if (match?.[1]) return AccommodationAiImportService.decodeHtml(match[1]);
    }
    return null;
  }

  /** Parse every JSON-LD block and return the first `Product` node. */
  private jsonLdProduct(html: string): Record<string, unknown> | null {
    const blocks = html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block[1]);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          const graph = (node as { '@graph'?: unknown[] })?.['@graph'];
          const candidates = Array.isArray(graph) ? graph : [node];
          for (const candidate of candidates) {
            const type = (candidate as { '@type'?: unknown })?.['@type'];
            const types = Array.isArray(type) ? type : [type];
            if (types.includes('Product')) {
              return candidate as Record<string, unknown>;
            }
          }
        }
      } catch {
        // ignore malformed blocks
      }
    }
    return null;
  }

  private jsonLdWebPage(html: string): Record<string, unknown> | null {
    const blocks = html.matchAll(
      /<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi,
    );
    for (const block of blocks) {
      try {
        const parsed = JSON.parse(block[1]);
        const nodes = Array.isArray(parsed) ? parsed : [parsed];
        for (const node of nodes) {
          const graph = (node as { '@graph'?: unknown[] })?.['@graph'];
          const candidates = Array.isArray(graph) ? graph : [node];
          for (const candidate of candidates) {
            const type = (candidate as { '@type'?: unknown })?.['@type'];
            const types = Array.isArray(type) ? type : [type];
            if (types.includes('WebPage')) {
              return candidate as Record<string, unknown>;
            }
          }
        }
      } catch {
        // ignore malformed blocks
      }
    }
    return null;
  }

  private firstNumber(text: string, pattern: RegExp): number | null {
    const match = text.match(pattern);
    if (!match?.[1]) return null;
    const parsed = Number(match[1]);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** The longest description-looking string in the RSC payload is the real one. */
  private pickDescription(text: string): string | null {
    const candidates: string[] = [];
    const pattern = /"(?:description|description_html)":"([^"]{120,6000})"/g;
    for (const match of text.matchAll(pattern)) {
      const value = match[1]
        .replace(/\\\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      if (value.length >= 120) candidates.push(value);
    }
    candidates.sort((a, b) => b.length - a.length);
    return candidates[0]?.slice(0, MAX_DESCRIPTION_CHARS) ?? null;
  }

  private collectAmenities(text: string): string[] {
    const out = new Set<string>();
    for (const key of ['"amenities":[', '"amenitiesV2":[']) {
      const start = text.indexOf(key);
      if (start < 0) continue;
      const slice = text.slice(start, start + 12_000);
      for (const match of slice.matchAll(/"title":\{"en":"[^"]*","fa":"([^"]+)"/g)) {
        if (match[1]) out.add(match[1].trim());
      }
      for (const match of slice.matchAll(/"fa":"([^"]+)"/g)) {
        if (match[1]) out.add(match[1].trim());
      }
    }
    return [...out].filter(Boolean).slice(0, 24);
  }

  private collectRules(text: string): string[] {
    const out = new Set<string>();
    for (const key of ['"restrictedRules":[', '"negativeRestrictedRules":[']) {
      const start = text.indexOf(key);
      if (start < 0) continue;
      const slice = text.slice(start, start + 8_000);
      for (const match of slice.matchAll(/"negative":"([^"]+)"/g)) {
        const value = match[1]?.trim();
        if (value) out.add(value);
      }
    }
    return [...out].slice(0, 12);
  }

  private extract(html: string): ExtractedStay {
    const ld = this.jsonLdProduct(html);
    const page = this.jsonLdWebPage(html);
    // The Next.js flight payload escapes quotes; unescape once for the
    // structural regexes below.
    const text = html.replace(/\\"/g, '"');

    const images: string[] = [];
    const ldImages = ld?.image;
    if (typeof ldImages === 'string') images.push(ldImages);
    else if (Array.isArray(ldImages)) {
      for (const image of ldImages) {
        if (typeof image === 'string') images.push(image);
      }
    }
    const ogImage = this.metaContent(html, 'og:image');
    if (ogImage) images.push(ogImage);

    const offer = (ld?.offers ?? null) as Record<string, unknown> | null;
    const offerPrice = offer?.price;
    const ratingNode = ld?.aggregateRating as
      | { ratingValue?: unknown; ratingCount?: unknown }
      | undefined;

    const capacity = text.match(
      /"capacity":\{"beds":\{"twin":(\d+),"single":(\d+),"double":(\d+),"mattress":(\d+)\},"guests":\{"base":(\d+),"extra":(\d+)\}\}/,
    );
    const metrics = text.match(
      /"accommodationMetrics":\{"areaSize":(\d+),"buildingSize":\d+,"bathroomsCount":(\d+),"iranianToiletsCount":\d+,"toiletsCount":\d+,"bedroomsCount":(\d+)/,
    );
    const checkInOut = text.match(
      /"checkIn":"([^"]+)","checkOut":"([^"]+)","minNight":(\d+)/,
    );
    const typeMatch = text.match(
      /"type":"([^"]+)","typeDetails":\{[^}]*"title_fa":"([^"]+)"/,
    );
    const basePrice = this.firstNumber(
      text,
      /"price":\{"custom":\[[^\]]*\],"base":(\d+)/,
    );
    const cityMatch = text.match(
      /"city":\{"name":\{"fa":"([^"]+)","en":"[^"]*"\}[\s\S]{0,400}?"province":\{"name":\{"fa":"([^"]+)"/,
    );
    // `placeOfResidence` nests city/province locations first and the listing's
    // own coordinates last; take the last match in the window.
    const placeIndex = text.indexOf('"placeOfResidence"');
    const placeWindow =
      placeIndex >= 0 ? text.slice(placeIndex, placeIndex + 8000) : '';
    const locationMatches = [
      ...placeWindow.matchAll(
        /"location":\{"lng":(-?[\d.]+),"lat":(-?[\d.]+)/g,
      ),
    ];
    const locationMatch = locationMatches[locationMatches.length - 1] ?? null;
    const instant = /"reservationType":"instant"/.test(text);

    const beds =
      capacity != null
        ? Number(capacity[1]) +
          Number(capacity[2]) +
          Number(capacity[3]) +
          Number(capacity[4])
        : null;
    const guests =
      capacity != null ? Number(capacity[5]) + Number(capacity[6]) : null;

    const typeSlug = typeMatch?.[1]?.toLowerCase() ?? null;
    const propertyType = typeSlug
      ? (PROPERTY_TYPE_MAP[typeSlug] ?? 'OTHER')
      : null;

    const title =
      (typeof ld?.name === 'string' ? ld.name : null) ??
      this.metaContent(html, 'og:title');
    const description =
      this.pickDescription(text) ??
      (typeof page?.description === 'string' ? page.description : null) ??
      this.metaContent(html, 'og:description');

    return {
      title: title ? title.replace(/\s*\|\s*جاباما\s*$/, '').slice(0, 300) : null,
      description: description
        ? description.slice(0, MAX_DESCRIPTION_CHARS)
        : null,
      propertyType,
      propertyTypeLabel: typeMatch?.[2] ?? null,
      cityName: cityMatch?.[1] ?? null,
      provinceName: cityMatch?.[2] ?? null,
      address: [cityMatch?.[1], cityMatch?.[2]].filter(Boolean).join('، ') || null,
      latitude: locationMatch ? Number(locationMatch[2]) : null,
      longitude: locationMatch ? Number(locationMatch[1]) : null,
      maxGuests: guests,
      bedrooms: metrics ? Number(metrics[3]) : null,
      beds,
      bathrooms: metrics ? Number(metrics[2]) : null,
      areaSize: metrics ? Number(metrics[1]) : null,
      basePrice: this.rialToToman(basePrice ?? offerPrice),
      minNights: checkInOut ? Number(checkInOut[3]) : null,
      checkInTime: checkInOut?.[1] ?? null,
      checkOutTime: checkInOut?.[2] ?? null,
      instantBooking: instant,
      rating:
        ratingNode?.ratingValue != null
          ? Number(ratingNode.ratingValue)
          : null,
      reviewsCount:
        ratingNode?.ratingCount != null ? Number(ratingNode.ratingCount) : null,
      amenities: this.collectAmenities(text),
      rules: this.collectRules(text),
      images: Array.from(new Set(images.filter(Boolean))).slice(0, 24),
    };
  }

  private async fetchSource(url: string): Promise<ExtractedStay> {
    const html = await this.fetchHtml(url);
    return this.extract(html);
  }

  private estimateTokens(source: ExtractedStay): number {
    const payload = JSON.stringify(source);
    const promptTokens = Math.ceil(payload.length / 3.5) + 550;
    const completionTokens = 900;
    return promptTokens + completionTokens;
  }

  private priceForTokens(tokens: number, per1k: number, minPrice: number) {
    return Math.max(minPrice, Math.ceil(tokens / 1000) * per1k);
  }

  async estimate(
    userId: string,
    dto: EstimateAccommodationAiImportDto,
  ): Promise<AccommodationAiImportEstimate> {
    await this.settings.assertFeatureEnabled('featureAccommodationAiImport');
    await this.modules.getWorkspaceId(userId);
    const url = this.normaliseUrl(dto.url);
    const source = await this.fetchSource(url);
    if (!source.title && source.images.length === 0) {
      throw new BadRequestException(
        'اطلاعات اقامتگاه از این لینک قابل استخراج نبود. لینک صفحه‌ی اقامتگاه جاباما را وارد کنید.',
      );
    }
    const [per1k, minPrice] = await Promise.all([
      this.settings.getAccommodationAiImportPricePer1k(),
      this.settings.getAccommodationAiImportMinPrice(),
    ]);
    const estimatedTokens = this.estimateTokens(source);
    return {
      url,
      sourceTitle: source.title,
      estimatedTokens,
      pricePer1k: per1k,
      minPrice,
      price: this.priceForTokens(estimatedTokens, per1k, minPrice),
    };
  }

  private buildMessages(source: ExtractedStay) {
    const system =
      'You normalise Persian short-term rental (accommodation) data. Reply ' +
      'with ONLY a JSON object (no markdown) with keys: title (Persian, max ' +
      '120 chars), description (Persian, 300-1200 chars, plain text, no ' +
      'HTML), propertyType (one of: APARTMENT, VILLA, SUITE, HOUSE, COTTAGE, ' +
      'OTHER), cityName (string or null), maxGuests (integer or null), ' +
      'bedrooms (integer or null), beds (integer or null), bathrooms ' +
      '(integer or null), areaSize (integer square metres or null), ' +
      'basePrice (integer Toman per night or null), minNights (integer or ' +
      'null), checkInTime (HH:mm or null), checkOutTime (HH:mm or null), ' +
      'instantBooking (boolean), rating (number 0-5 or null), reviewsCount ' +
      '(integer or null), amenities (array of up to 15 Persian keywords), ' +
      'rules (array of up to 8 Persian house rules). Prices are already in ' +
      'Toman. Do not invent facts that are not in the input.';
    const user = JSON.stringify(source);
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  private async callAi(source: ExtractedStay) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);
    try {
      const response = await fetch(AI_ENDPOINT, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.apiKey()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: AI_MODEL,
          temperature: 0.2,
          messages: this.buildMessages(source),
        }),
        signal: controller.signal,
      });
      const text = await response.text();
      if (!response.ok) {
        this.logger.warn(
          `Accommodation AI import HTTP ${response.status}: ${text.slice(0, 300)}`,
        );
        throw new BadGatewayException(
          'سرویس هوش مصنوعی پاسخ معتبری نداد. لطفاً بعداً تلاش کنید.',
        );
      }
      const parsed = JSON.parse(text) as {
        choices?: Array<{ message?: { content?: string } }>;
        usage?: {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        };
      };
      const content = parsed.choices?.[0]?.message?.content ?? '';
      const usage = {
        promptTokens: Math.max(0, Math.floor(parsed.usage?.prompt_tokens ?? 0)),
        completionTokens: Math.max(
          0,
          Math.floor(parsed.usage?.completion_tokens ?? 0),
        ),
        totalTokens: Math.max(0, Math.floor(parsed.usage?.total_tokens ?? 0)),
      };
      if (usage.totalTokens === 0) {
        usage.totalTokens = usage.promptTokens + usage.completionTokens;
      }
      return { content, usage };
    } catch (error) {
      if (error instanceof BadGatewayException) throw error;
      this.logger.warn(
        `Accommodation AI import failed: ${(error as Error)?.message ?? error}`,
      );
      throw new BadGatewayException(
        'ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً بعداً تلاش کنید.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private parseAiJson(content: string): AiStayJson {
    const cleaned = content
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const slice =
      start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    try {
      return JSON.parse(slice) as AiStayJson;
    } catch {
      throw new BadGatewayException(
        'خروجی هوش مصنوعی قابل خواندن نبود. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  /** Only Jabama's own CDN images count as «عکس رسمی». */
  private isOfficialImage(url: string): boolean {
    try {
      const host = new URL(url).hostname.toLowerCase();
      return host === 'cdn.jabama.com' || host.endsWith('.jabama.com');
    } catch {
      return false;
    }
  }

  private async downloadImages(
    userId: string,
    urls: string[],
    maxImages: number,
    minImages: number,
  ): Promise<string[]> {
    const cap = Math.min(Math.max(maxImages, 1), 20);
    const target = Math.min(Math.max(minImages, 1), cap);
    const candidates = urls.filter((url) => this.isOfficialImage(url));
    const uploaded: string[] = [];
    for (const url of candidates) {
      if (uploaded.length >= cap) break;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), IMAGE_TIMEOUT_MS);
      try {
        const response = await fetch(url, {
          headers: { 'User-Agent': BROWSER_UA, Accept: 'image/*' },
          signal: controller.signal,
        });
        if (!response.ok) continue;
        const contentType = response.headers.get('content-type') ?? '';
        if (!contentType.startsWith('image/')) continue;
        const buffer = Buffer.from(await response.arrayBuffer());
        if (buffer.length === 0 || buffer.length > MAX_IMAGE_KB * 1024) continue;
        const file = {
          buffer,
          size: buffer.length,
          mimetype: contentType,
          originalname: 'jabama.jpg',
        } as Express.Multer.File;
        const result = await this.uploads.upload(
          'gallery',
          userId,
          file,
          MAX_IMAGE_KB * 1024,
        );
        uploaded.push(result.url);
      } catch {
        // Skip an image that fails; the listing can still be created.
      } finally {
        clearTimeout(timer);
      }
    }
    if (uploaded.length < target) {
      this.logger.warn(
        `Accommodation AI import: only ${uploaded.length}/${target} images stored`,
      );
    }
    return uploaded;
  }

  async import(userId: string, dto: ImportAccommodationAiImportDto) {
    await this.settings.assertFeatureEnabled('featureAccommodationAiImport');
    this.apiKey();
    const workspaceId = await this.modules.getWorkspaceId(userId);
    const url = this.normaliseUrl(dto.url);

    const source = await this.fetchSource(url);
    if (!source.title && source.images.length === 0) {
      throw new BadRequestException(
        'اطلاعات اقامتگاه از این لینک قابل استخراج نبود.',
      );
    }

    const [per1k, minPrice, minImages, walletEnabled] = await Promise.all([
      this.settings.getAccommodationAiImportPricePer1k(),
      this.settings.getAccommodationAiImportMinPrice(),
      this.settings.getAccommodationAiImportMinImages(),
      this.settings.isFeatureEnabled('featureWallet'),
    ]);
    const estimatedTokens = this.estimateTokens(source);
    const estimatePrice = this.priceForTokens(estimatedTokens, per1k, minPrice);

    const record = await this.prisma.accommodationAiImport.create({
      data: { userId, workspaceId, url, model: AI_MODEL },
    });

    if (walletEnabled) {
      await this.wallet.charge({
        userId,
        kind: WalletEntryKind.AI_IMPORT,
        amount: estimatePrice,
        title: 'ورود خودکار اقامتگاه از جاباما',
        sourceType: FINANCE_SOURCE_TYPES.ACCOMMODATION_AI_IMPORT,
        sourceId: record.id,
        idempotencyKey: `accommodation-ai-import:${record.id}`,
      });
    }

    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let charged = walletEnabled ? estimatePrice : 0;
    try {
      const ai = await this.callAi(source);
      usage = ai.usage;
      const stay = this.parseAiJson(ai.content);

      const actualCost = this.priceForTokens(usage.totalTokens, per1k, minPrice);
      if (walletEnabled && actualCost > estimatePrice) {
        await this.wallet.charge({
          userId,
          kind: WalletEntryKind.AI_IMPORT,
          amount: actualCost - estimatePrice,
          title: 'مابه‌التفاوت توکن ایمپورت اقامتگاه',
          sourceType: FINANCE_SOURCE_TYPES.ACCOMMODATION_AI_IMPORT,
          sourceId: record.id,
          idempotencyKey: `accommodation-ai-import-extra:${record.id}`,
        });
        charged = actualCost;
      }

      const images = await this.downloadImages(
        userId,
        source.images,
        20,
        minImages,
      );

      const propertyType =
        dto.propertyType ||
        (stay.propertyType &&
        ['APARTMENT', 'VILLA', 'SUITE', 'HOUSE', 'COTTAGE', 'OTHER'].includes(
          stay.propertyType.toUpperCase(),
        )
          ? stay.propertyType.toUpperCase()
          : source.propertyType) ||
        'OTHER';

      const created = await this.accommodations.create(userId, {
        title: (stay.title || source.title || 'اقامتگاه جاباما').slice(0, 160),
        description: (stay.description || source.description)?.slice(0, 5000),
        propertyType,
        cityId: dto.cityId,
        address: source.address ?? undefined,
        latitude: source.latitude ?? undefined,
        longitude: source.longitude ?? undefined,
        maxGuests:
          this.clampInt(stay.maxGuests ?? source.maxGuests, 1, 100) ?? 2,
        bedrooms: this.clampInt(stay.bedrooms ?? source.bedrooms, 0, 50) ?? 1,
        beds: this.clampInt(stay.beds ?? source.beds, 0, 100) ?? 1,
        bathrooms:
          this.clampInt(stay.bathrooms ?? source.bathrooms, 0, 50) ?? 1,
        areaSize: this.clampInt(stay.areaSize ?? source.areaSize, 0, 100000),
        basePrice:
          this.clampInt(stay.basePrice ?? source.basePrice, 0, 2_147_483_647) ??
          0,
        currency: 'IRT',
        minNights: this.clampInt(stay.minNights ?? source.minNights, 1, 365) ?? 1,
        checkInTime: stay.checkInTime || source.checkInTime || undefined,
        checkOutTime: stay.checkOutTime || source.checkOutTime || undefined,
        amenities: this.cleanList(stay.amenities, source.amenities, 20),
        rules: this.cleanList(stay.rules, source.rules, 12),
        instantBooking: stay.instantBooking ?? source.instantBooking,
        rating: this.clampRating(stay.rating ?? source.rating),
        reviewsCount:
          this.clampInt(stay.reviewsCount ?? source.reviewsCount, 0, 1_000_000) ??
          0,
        externalSource: 'JABAMA',
        externalUrl: url,
        externalRef: this.extractRef(url) ?? undefined,
        status: dto.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT',
      });

      for (const [index, imageUrl] of images.entries()) {
        await this.accommodations.addPhoto(userId, created.id, {
          url: imageUrl,
          sortOrder: index,
          isCover: index === 0,
        });
      }

      await this.prisma.accommodationAiImport.update({
        where: { id: record.id },
        data: {
          propertyId: created.id,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          cost: charged,
        },
      });

      if (charged > 0) {
        await this.finance.recordSale({
          sourceType: FINANCE_SOURCE_TYPES.ACCOMMODATION_AI_IMPORT,
          sourceId: record.id,
          title: 'ورود خودکار اقامتگاه از جاباما',
          amount: charged,
          userId,
          metadata: { workspaceId, importId: record.id },
          items: [
            {
              description: `ایمپورت «${created.title}» — ${usage.totalTokens.toLocaleString('fa-IR')} توکن`,
              quantity: 1,
              unitPrice: charged,
            },
          ],
        });
      }

      return {
        property: created,
        usage,
        cost: charged,
        estimatedTokens,
        importId: record.id,
        images: images.length,
      };
    } catch (error) {
      await this.wallet.refund({
        userId,
        amount: charged,
        title: 'بازگشت هزینه‌ی ایمپورت ناموفق اقامتگاه',
        sourceType: FINANCE_SOURCE_TYPES.ACCOMMODATION_AI_IMPORT,
        sourceId: record.id,
        idempotencyKey: `accommodation-ai-import-refund:${record.id}`,
      });
      await this.prisma.accommodationAiImport
        .delete({ where: { id: record.id } })
        .catch(() => undefined);
      throw error;
    }
  }

  private clampInt(
    value: number | null | undefined,
    min: number,
    max: number,
  ): number | undefined {
    if (value == null || !Number.isFinite(value)) return undefined;
    return Math.min(max, Math.max(min, Math.floor(value)));
  }

  private clampRating(value: number | null | undefined): number | undefined {
    if (value == null || !Number.isFinite(value)) return undefined;
    return Math.min(5, Math.max(0, Math.round(value * 10) / 10));
  }

  private cleanList(
    primary: string[] | undefined,
    fallback: string[],
    limit: number,
  ): string[] {
    const source = (primary?.length ? primary : fallback) ?? [];
    const seen = new Set<string>();
    const out: string[] = [];
    for (const item of source) {
      const value = String(item).trim();
      if (!value || seen.has(value)) continue;
      seen.add(value);
      out.push(value.slice(0, 80));
      if (out.length >= limit) break;
    }
    return out;
  }
}
