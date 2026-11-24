import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

import { SITE_NAME, SITE_TAGLINE } from '@/lib/seo';

export const runtime = 'nodejs';
export const alt = `${SITE_NAME} — ${SITE_TAGLINE}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

async function loadFont(file: string): Promise<Buffer> {
  return readFile(join(process.cwd(), 'public', 'fonts', 'shabnam', file));
}

/**
 * Default social-share card used by every page that does not provide its own
 * `opengraph-image`. A branded, readable card lifts click-through from search
 * and AI answer surfaces compared with the bare link.
 */
export default async function OpengraphImage() {
  const [bold, medium] = await Promise.all([
    loadFont('Shabnam-Bold.ttf'),
    loadFont('Shabnam-Medium.ttf'),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '72px 80px',
          background: 'linear-gradient(135deg, #f7f1e7 0%, #efe3d2 100%)',
          fontFamily: 'Shabnam',
          direction: 'rtl',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 20,
            alignSelf: 'flex-end',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 84,
              height: 84,
              borderRadius: 22,
              background: '#7C4F2E',
              color: '#F2E8D9',
              fontSize: 46,
              fontWeight: 700,
            }}
          >
            ش
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ fontSize: 34, fontWeight: 700, color: '#3d2a1a' }}>
              {SITE_NAME}
            </span>
            <span style={{ fontSize: 20, color: '#7C4F2E' }}>shomalicard.ir</span>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#2b1d12',
              textAlign: 'right',
            }}
          >
            کارت ویزیت دیجیتال
          </span>
          <span
            style={{
              fontSize: 68,
              fontWeight: 700,
              lineHeight: 1.25,
              color: '#7C4F2E',
              textAlign: 'right',
            }}
          >
            و بیولینک کسب‌وکارهای شمال
          </span>
        </div>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderTop: '2px solid rgba(124,79,46,0.25)',
            paddingTop: 28,
          }}
        >
          <span style={{ fontSize: 24, color: '#5a4230' }}>
            دفترچه تلفن · دسته‌بندی مشاغل · اخبار · فروشگاه‌های محلی
          </span>
          <span style={{ fontSize: 26, fontWeight: 700, color: '#7C4F2E' }}>
            تنکابن · شیرود · رامسر
          </span>
        </div>
      </div>
    ),
    {
      ...size,
      fonts: [
        { name: 'Shabnam', data: bold, weight: 700, style: 'normal' },
        { name: 'Shabnam', data: medium, weight: 500, style: 'normal' },
      ],
    },
  );
}
