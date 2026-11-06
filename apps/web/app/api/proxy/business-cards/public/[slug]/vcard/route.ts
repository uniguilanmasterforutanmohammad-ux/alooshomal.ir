import { NextResponse } from 'next/server';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const safeSlug = encodeURIComponent(slug);
  const downloadName = slug.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 80) || 'business-card';
  const apiUrl =
    process.env.INTERNAL_API_URL ??
    process.env.NEXT_PUBLIC_API_URL ??
    'http://localhost:4000/api';

  try {
    const response = await fetch(`${apiUrl}/business-cards/public/${safeSlug}/vcard`, {
      cache: 'no-store',
    });
    if (!response.ok) {
      return NextResponse.json({ message: 'کارت ویزیت یافت نشد' }, { status: 404 });
    }
    const body = await response.text();
    let vcard = body;
    try {
      const parsed = JSON.parse(body) as { data?: string };
      if (parsed && typeof parsed.data === 'string') {
        vcard = parsed.data;
      }
    } catch {
      // response was already raw vcard text
    }
    return new NextResponse(vcard, {
      headers: {
        'Content-Type': 'text/vcard; charset=utf-8',
        'Content-Disposition': `attachment; filename="${downloadName}.vcf"`,
      },
    });
  } catch {
    return NextResponse.json({ message: 'خطا در دریافت کارت ویزیت' }, { status: 500 });
  }
}
