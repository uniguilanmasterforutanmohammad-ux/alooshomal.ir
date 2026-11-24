import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';

export const runtime = 'nodejs';
export const size = { width: 180, height: 180 };
export const contentType = 'image/png';

/** Home-screen icon for iOS/Safari (the SVG icon is not used there). */
export default async function AppleIcon() {
  const bold = await readFile(
    join(process.cwd(), 'public', 'fonts', 'shabnam', 'Shabnam-Bold.ttf'),
  );
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#7C4F2E',
          color: '#F2E8D9',
          fontFamily: 'Shabnam',
          fontSize: 104,
          fontWeight: 700,
          borderRadius: 36,
        }}
      >
        ش
      </div>
    ),
    {
      ...size,
      fonts: [{ name: 'Shabnam', data: bold, weight: 700, style: 'normal' }],
    },
  );
}
