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
import { ImportAiProductDto } from './dto/ai-import.dto';
import { RETAIL_PRODUCT_UNITS } from './dto/create-product.dto';
import { RetailService } from './retail.service';

/** Fixed model + endpoint for the Digikala import (per project requirement). */
const AI_MODEL = 'deepseek/deepseek-v4.1-flash-1017';
const AI_ENDPOINT = 'https://ai.chabokan.net/v1/chat/completions';
const PAGE_TIMEOUT_MS = 20_000;
const AI_TIMEOUT_MS = 90_000;
const IMAGE_TIMEOUT_MS = 15_000;
const MAX_DESCRIPTION_CHARS = 1800;

const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/124.0 Safari/537.36';

interface ExtractedSource {
  title: string | null;
  brand: string | null;
  description: string | null;
  price: number | null;
  compareAtPrice: number | null;
  currency: string | null;
  images: string[];
  specs: Array<{ name: string; value: string }>;
}

interface AiProductJson {
  title?: string;
  description?: string;
  brand?: string | null;
  price?: number | null;
  unit?: string;
  tags?: string[];
}

export interface AiImportEstimate {
  url: string;
  sourceTitle: string | null;
  estimatedTokens: number;
  pricePer1k: number;
  minPrice: number;
  price: number;
}

@Injectable()
export class RetailAiImportService {
  private readonly logger = new Logger(RetailAiImportService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly modules: BusinessModulesService,
    private readonly settings: SettingsService,
    private readonly wallet: WalletService,
    private readonly finance: FinanceService,
    private readonly uploads: UploadsService,
    private readonly retail: RetailService,
  ) {}

  private apiKey(): string {
    const key = process.env.API_AI_CHABOKAN_IMPORT_PRODUCTS?.trim();
    if (!key) {
      throw new ServiceUnavailableException(
        'کلید سرویس هوش مصنوعی روی سرور تنظیم نشده است.',
      );
    }
    return key;
  }

  /** Only Digikala product links are accepted. */
  private normaliseUrl(raw: string): string {
    const value = raw.trim();
    let parsed: URL;
    try {
      parsed = new URL(value);
    } catch {
      throw new BadRequestException('لینک محصول معتبر نیست.');
    }
    if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
      throw new BadRequestException('لینک محصول معتبر نیست.');
    }
    const host = parsed.hostname.toLowerCase();
    if (host !== 'digikala.com' && !host.endsWith('.digikala.com')) {
      throw new BadRequestException('فقط لینک محصول دیجی‌کالا پشتیبانی می‌شود.');
    }
    return parsed.toString();
  }

  /** Pull the numeric product id out of any Digikala product URL shape. */
  private extractProductId(url: string): string | null {
    const patterns = [
      /dkp-(\d{4,})/i,
      /dkp\/(\d{4,})/i,
      /\/product\/(\d{4,})/i,
      /(?:product_id|variant_id|id)=(\d{4,})/i,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match?.[1]) return match[1];
    }
    return null;
  }

  private rialToToman(value: unknown): number | null {
    const parsed =
      typeof value === 'number'
        ? value
        : value
          ? Number(String(value).replace(/[^\d.]/g, ''))
          : NaN;
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    // Digikala quotes prices in Rial; the panel works in Toman.
    return Math.round(parsed / 10);
  }

  /**
   * Primary source: Digikala's own product JSON API. It is far more stable than
   * scraping the (client-rendered) product page.
   */
  private async fetchFromApi(productId: string): Promise<ExtractedSource | null> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), PAGE_TIMEOUT_MS);
    try {
      const response = await fetch(
        `https://api.digikala.com/product/v1/products/${productId}/`,
        {
          headers: {
            'User-Agent': BROWSER_UA,
            Accept: 'application/json',
            Origin: 'https://www.digikala.com',
            Referer: 'https://www.digikala.com/',
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) return null;
      const parsed = (await response.json()) as {
        data?: { product?: Record<string, unknown> };
      };
      const product = parsed.data?.product;
      if (!product) return null;

      const images: string[] = [];
      const imageBlock = product.images as
        | { main?: { url?: string[] }; list?: string[] }
        | undefined;
      if (Array.isArray(imageBlock?.main?.url)) {
        images.push(...imageBlock.main.url);
      }
      if (Array.isArray(imageBlock?.list)) images.push(...imageBlock.list);

      const specs: Array<{ name: string; value: string }> = [];
      const specifications = product.specifications as
        | Array<{ attributes?: Array<{ title?: string; values?: string[] }> }>
        | undefined;
      if (Array.isArray(specifications)) {
        for (const group of specifications) {
          for (const attr of group.attributes ?? []) {
            if (attr.title && Array.isArray(attr.values) && attr.values.length) {
              specs.push({
                name: attr.title,
                value: attr.values.join('، ').slice(0, 200),
              });
            }
          }
        }
      }

      const variant = product.default_variant as
        | { price?: { selling_price?: unknown; rrp_price?: unknown } }
        | undefined;
      const brandNode = product.brand as { title_fa?: string } | undefined;
      const categoryNode = product.category as { title_fa?: string } | undefined;

      const specText = specs
        .map((spec) => `${spec.name}: ${spec.value}`)
        .join('\n');
      const description =
        typeof product.description === 'string' && product.description.trim()
          ? product.description
          : specText || null;

      const title =
        typeof product.title_fa === 'string' ? product.title_fa : null;
      if (!title && images.length === 0) return null;

      return {
        title: title ? title.slice(0, 300) : null,
        brand: brandNode?.title_fa ?? null,
        description: description
          ? description.slice(0, MAX_DESCRIPTION_CHARS)
          : null,
        price: this.rialToToman(variant?.price?.selling_price),
        compareAtPrice: this.rialToToman(variant?.price?.rrp_price),
        currency: 'IRT',
        images: Array.from(new Set(images.filter(Boolean))).slice(0, 12),
        specs: specs.slice(0, 25),
      };
    } catch {
      return null;
    } finally {
      clearTimeout(timer);
    }
  }

  /** API first, then HTML JSON-LD/OG as a fallback. */
  private async fetchSource(url: string): Promise<ExtractedSource> {
    const productId = this.extractProductId(url);
    if (productId) {
      const fromApi = await this.fetchFromApi(productId);
      if (fromApi) return fromApi;
    }
    const html = await this.fetchHtml(url);
    return this.extract(html);
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
          `دریافت صفحه‌ی دیجی‌کالا ناموفق بود (کد ${response.status}).`,
        );
      }
      return await response.text();
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof BadGatewayException) throw error;
      this.logger.warn(
        `Digikala fetch failed: ${(error as Error)?.message ?? error}`,
      );
      throw new BadGatewayException(
        'دریافت اطلاعات از دیجی‌کالا ناموفق بود. لطفاً بعداً تلاش کنید.',
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
      if (match?.[1]) return RetailAiImportService.decodeHtml(match[1]);
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

  private extract(html: string): ExtractedSource {
    const ld = this.jsonLdProduct(html);
    const offer = (ld?.offers ?? null) as
      | Record<string, unknown>
      | Record<string, unknown>[]
      | null;
    const offerNode = Array.isArray(offer) ? offer[0] : offer;

    const ldImages = ld?.image;
    const images: string[] = [];
    if (typeof ldImages === 'string') images.push(ldImages);
    else if (Array.isArray(ldImages)) {
      for (const image of ldImages) {
        if (typeof image === 'string') images.push(image);
        else if (image && typeof image === 'object') {
          const u = (image as { url?: unknown }).url;
          if (typeof u === 'string') images.push(u);
        }
      }
    }
    const ogImage = this.metaContent(html, 'og:image');
    if (ogImage) images.push(ogImage);

    const brandNode = ld?.brand;
    const brand =
      typeof brandNode === 'string'
        ? brandNode
        : brandNode && typeof brandNode === 'object'
          ? ((brandNode as { name?: unknown }).name as string | undefined) ?? null
          : null;

    const rawPrice =
      (offerNode?.price as unknown) ??
      this.metaContent(html, 'product:price:amount');
    const price =
      typeof rawPrice === 'number'
        ? rawPrice
        : rawPrice
          ? Number(String(rawPrice).replace(/[^\d.]/g, ''))
          : null;

    const specs: Array<{ name: string; value: string }> = [];
    const additional = ld?.additionalProperty;
    if (Array.isArray(additional)) {
      for (const prop of additional) {
        const name = (prop as { name?: unknown })?.name;
        const value = (prop as { value?: unknown })?.value;
        if (typeof name === 'string' && value !== undefined) {
          specs.push({ name, value: String(value).slice(0, 200) });
        }
      }
    }

    const description =
      (typeof ld?.description === 'string' ? ld.description : null) ??
      this.metaContent(html, 'og:description') ??
      this.metaContent(html, 'description');

    const title =
      (typeof ld?.name === 'string' ? ld.name : null) ??
      this.metaContent(html, 'og:title');

    return {
      title: title ? title.slice(0, 300) : null,
      brand,
      description: description
        ? description.slice(0, MAX_DESCRIPTION_CHARS)
        : null,
      price: price && Number.isFinite(price) ? Math.round(price) : null,
      compareAtPrice: null,
      currency:
        (offerNode?.priceCurrency as string | undefined) ??
        this.metaContent(html, 'product:price:currency'),
      images: Array.from(new Set(images.filter(Boolean))).slice(0, 12),
      specs: specs.slice(0, 20),
    };
  }

  private estimateTokens(source: ExtractedSource): number {
    const payload = JSON.stringify(source);
    // ~3.5 chars per token for mixed Persian/Latin text + fixed prompt overhead
    // + expected completion length.
    const promptTokens = Math.ceil(payload.length / 3.5) + 450;
    const completionTokens = 700;
    return promptTokens + completionTokens;
  }

  private priceForTokens(tokens: number, per1k: number, minPrice: number) {
    return Math.max(minPrice, Math.ceil(tokens / 1000) * per1k);
  }

  async estimate(userId: string, rawUrl: string): Promise<AiImportEstimate> {
    await this.settings.assertFeatureEnabled('featureRetailAiImport');
    await this.modules.getWorkspaceId(userId);
    const url = this.normaliseUrl(rawUrl);
    const source = await this.fetchSource(url);
    if (!source.title && source.images.length === 0) {
      throw new BadRequestException(
        'اطلاعات محصول از این لینک قابل استخراج نبود. لینک صفحه‌ی محصول دیجی‌کالا را وارد کنید.',
      );
    }
    const [per1k, minPrice] = await Promise.all([
      this.settings.getRetailAiImportPricePer1k(),
      this.settings.getRetailAiImportMinPrice(),
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

  private buildMessages(source: ExtractedSource) {
    const system =
      'You normalise Persian e-commerce product data. Reply with ONLY a JSON ' +
      'object (no markdown) with keys: title (Persian, max 120 chars), ' +
      'description (Persian, 250-900 chars, plain text, no HTML), brand ' +
      '(string or null), price (integer Toman or null), unit (one of: ' +
      RETAIL_PRODUCT_UNITS.join('، ') +
      '), tags (array of up to 8 Persian keywords). Convert IRR to Toman by ' +
      'dividing by 10 when currency is IRR. Do not invent specs.';
    const user = JSON.stringify({
      title: source.title,
      brand: source.brand,
      description: source.description,
      price: source.price,
      currency: source.currency,
      specs: source.specs,
    });
    return [
      { role: 'system', content: system },
      { role: 'user', content: user },
    ];
  }

  private async callAi(source: ExtractedSource) {
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
        this.logger.warn(`AI import HTTP ${response.status}: ${text.slice(0, 300)}`);
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
      this.logger.warn(`AI import failed: ${(error as Error)?.message ?? error}`);
      throw new BadGatewayException(
        'ارتباط با سرویس هوش مصنوعی برقرار نشد. لطفاً بعداً تلاش کنید.',
      );
    } finally {
      clearTimeout(timer);
    }
  }

  private parseAiJson(content: string): AiProductJson {
    const cleaned = content
      .replace(/^```(?:json)?/i, '')
      .replace(/```$/i, '')
      .trim();
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    const slice = start >= 0 && end > start ? cleaned.slice(start, end + 1) : cleaned;
    try {
      return JSON.parse(slice) as AiProductJson;
    } catch {
      throw new BadGatewayException(
        'خروجی هوش مصنوعی قابل خواندن نبود. لطفاً دوباره تلاش کنید.',
      );
    }
  }

  private async downloadImages(
    userId: string,
    urls: string[],
    maxImages: number,
    maxImageKb: number,
  ): Promise<string[]> {
    const uploaded: string[] = [];
    for (const url of urls) {
      if (uploaded.length >= maxImages) break;
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
        if (buffer.length === 0 || buffer.length > maxImageKb * 1024) continue;
        const file = {
          buffer,
          size: buffer.length,
          mimetype: contentType,
          originalname: 'digikala.jpg',
        } as Express.Multer.File;
        const result = await this.uploads.upload(
          'gallery',
          userId,
          file,
          maxImageKb * 1024,
        );
        uploaded.push(result.url);
      } catch {
        // Skip an image that fails; the product can still be created.
      } finally {
        clearTimeout(timer);
      }
    }
    return uploaded;
  }

  async import(userId: string, dto: ImportAiProductDto) {
    await this.settings.assertFeatureEnabled('featureRetailAiImport');
    this.apiKey();
    const workspaceId = await this.modules.getWorkspaceId(userId);
    const url = this.normaliseUrl(dto.url);

    const source = await this.fetchSource(url);
    if (!source.title && source.images.length === 0) {
      throw new BadRequestException(
        'اطلاعات محصول از این لینک قابل استخراج نبود.',
      );
    }

    const [per1k, minPrice, imageSettings, walletEnabled] = await Promise.all([
      this.settings.getRetailAiImportPricePer1k(),
      this.settings.getRetailAiImportMinPrice(),
      this.retail.getImageSettings(),
      this.settings.isFeatureEnabled('featureWallet'),
    ]);
    const estimatedTokens = this.estimateTokens(source);
    const estimatePrice = this.priceForTokens(estimatedTokens, per1k, minPrice);

    const record = await this.prisma.retailAiImport.create({
      data: { userId, workspaceId, url, model: AI_MODEL },
    });

    // Charge the quoted price up front; a failure is refunded below. When the
    // wallet switch is off the whole billing system is off, so the import is
    // free and no invoice is issued (same rule as other paid features).
    if (walletEnabled) {
      await this.wallet.charge({
        userId,
        kind: WalletEntryKind.AI_IMPORT,
        amount: estimatePrice,
        title: 'ورود خودکار محصول از دیجی‌کالا',
        sourceType: FINANCE_SOURCE_TYPES.RETAIL_AI_IMPORT,
        sourceId: record.id,
        idempotencyKey: `retail-ai-import:${record.id}`,
      });
    }

    let usage = { promptTokens: 0, completionTokens: 0, totalTokens: 0 };
    let charged = walletEnabled ? estimatePrice : 0;
    try {
      const ai = await this.callAi(source);
      usage = ai.usage;
      const product = this.parseAiJson(ai.content);

      const actualCost = this.priceForTokens(usage.totalTokens, per1k, minPrice);
      if (walletEnabled && actualCost > estimatePrice) {
        await this.wallet.charge({
          userId,
          kind: WalletEntryKind.AI_IMPORT,
          amount: actualCost - estimatePrice,
          title: 'مابه‌التفاوت توکن ایمپورت محصول',
          sourceType: FINANCE_SOURCE_TYPES.RETAIL_AI_IMPORT,
          sourceId: record.id,
          idempotencyKey: `retail-ai-import-extra:${record.id}`,
        });
        charged = actualCost;
      }

      const images = await this.downloadImages(
        userId,
        source.images,
        imageSettings.maxImages,
        imageSettings.maxImageKb,
      );

      const unit =
        dto.unit && (RETAIL_PRODUCT_UNITS as readonly string[]).includes(dto.unit)
          ? dto.unit
          : (RETAIL_PRODUCT_UNITS as readonly string[]).includes(
                product.unit ?? '',
              )
            ? (product.unit as string)
            : 'عدد';

      const created = await this.retail.createProduct(userId, {
        title: (product.title || source.title || 'محصول دیجی‌کالا').slice(0, 160),
        description: product.description?.slice(0, 5000),
        categoryId: dto.categoryId,
        price:
          dto.price ??
          (typeof product.price === 'number' && product.price >= 0
            ? Math.round(product.price)
            : source.price ?? 0),
        compareAtPrice:
          source.compareAtPrice && source.compareAtPrice > 0
            ? source.compareAtPrice
            : undefined,
        stock: dto.stock ?? 0,
        unit,
        imageUrl: images[0],
        gallery: images,
        status: dto.status === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW',
      });

      await this.prisma.retailAiImport.update({
        where: { id: record.id },
        data: {
          productId: created.id,
          promptTokens: usage.promptTokens,
          completionTokens: usage.completionTokens,
          totalTokens: usage.totalTokens,
          cost: charged,
        },
      });

      if (charged > 0) {
        await this.finance.recordSale({
          sourceType: FINANCE_SOURCE_TYPES.RETAIL_AI_IMPORT,
          sourceId: record.id,
          title: 'ورود خودکار محصول از دیجی‌کالا',
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
        product: created,
        usage,
        cost: charged,
        estimatedTokens,
        importId: record.id,
      };
    } catch (error) {
      // The AI/product step failed: reverse the up-front charge and drop the
      // half-written audit row so the user is not billed for a failed import.
      await this.wallet.refund({
        userId,
        amount: charged,
        title: 'بازگشت هزینه‌ی ایمپورت ناموفق محصول',
        sourceType: FINANCE_SOURCE_TYPES.RETAIL_AI_IMPORT,
        sourceId: record.id,
        idempotencyKey: `retail-ai-import-refund:${record.id}`,
      });
      await this.prisma.retailAiImport
        .delete({ where: { id: record.id } })
        .catch(() => undefined);
      throw error;
    }
  }
}
