import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

import { SERVER_API_URL } from '@/lib/site';

/**
 * Admin-only proxy for switching the site-wide theme.
 *
 * The theme lives on `<html data-theme>` and is read by the root layout, which
 * is cached. Forwarding the change from the browser straight to the API would
 * leave that cache stale for up to the revalidation window, so the admin would
 * not see their pick applied immediately. This tiny handler does the PATCH and
 * then purges the layout cache, giving instant feedback for everyone after the
 * next request (all other visitors pick it up on their next page load).
 */
export async function POST(request: Request) {
  const authorization = request.headers.get('authorization');
  if (!authorization) {
    return NextResponse.json({ message: 'دسترسی غیرمجاز' }, { status: 401 });
  }

  let body: { siteTheme?: unknown };
  try {
    body = (await request.json()) as { siteTheme?: unknown };
  } catch {
    return NextResponse.json({ message: 'بدنه‌ی نامعتبر' }, { status: 400 });
  }

  try {
    const response = await fetch(`${SERVER_API_URL}/admin/settings`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: authorization,
      },
      body: JSON.stringify({ siteTheme: body.siteTheme }),
      cache: 'no-store',
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      return NextResponse.json(
        payload ?? { message: 'ذخیره‌ی تم ناموفق بود' },
        { status: response.status },
      );
    }
    // Drop the cached root layout so the next render reads the new theme.
    revalidatePath('/', 'layout');
    return NextResponse.json(payload);
  } catch {
    return NextResponse.json({ message: 'خطا در ارتباط با سرور' }, { status: 502 });
  }
}
