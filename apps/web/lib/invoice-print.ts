import type { FinanceInvoice } from '@/lib/api/types/finance';

const WORD_ONES = ['', 'یک', 'دو', 'سه', 'چهار', 'پنج', 'شش', 'هفت', 'هشت', 'نه'];
const WORD_TEENS = [
  'ده',
  'یازده',
  'دوازده',
  'سیزده',
  'چهارده',
  'پانزده',
  'شانزده',
  'هفده',
  'هجده',
  'نوزده',
];
const WORD_TENS = ['', '', 'بیست', 'سی', 'چهل', 'پنجاه', 'شصت', 'هفتاد', 'هشتاد', 'نود'];
const WORD_HUNDREDS = [
  '',
  'یکصد',
  'دویست',
  'سیصد',
  'چهارصد',
  'پانصد',
  'ششصد',
  'هفتصد',
  'هشتصد',
  'نهصد',
];
const WORD_SCALES = ['', ' هزار', ' میلیون', ' میلیارد', ' هزار میلیارد'];

function threeDigitsToWords(value: number): string {
  const parts: string[] = [];
  const hundreds = Math.floor(value / 100);
  const rest = value % 100;
  if (hundreds) parts.push(WORD_HUNDREDS[hundreds]);
  if (rest >= 10 && rest < 20) {
    parts.push(WORD_TEENS[rest - 10]);
  } else {
    const tens = Math.floor(rest / 10);
    const ones = rest % 10;
    if (tens) parts.push(WORD_TENS[tens]);
    if (ones) parts.push(WORD_ONES[ones]);
  }
  return parts.join(' و ');
}

/** Persian words for a Toman amount, e.g. `۱۵۰٬۰۰۰` → «یکصد و پنجاه هزار». */
export function numberToPersianWords(value: number): string {
  const amount = Math.floor(Math.abs(value));
  if (!Number.isFinite(amount) || amount === 0) return 'صفر';
  const groups: number[] = [];
  let rest = amount;
  while (rest > 0) {
    groups.push(rest % 1000);
    rest = Math.floor(rest / 1000);
  }
  const words: string[] = [];
  for (let index = groups.length - 1; index >= 0; index -= 1) {
    const group = groups[index];
    if (!group) continue;
    words.push(threeDigitsToWords(group) + WORD_SCALES[index]);
  }
  return words.join(' و ');
}

function faDate(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleDateString('fa-IR');
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char] ?? char,
  );
}

/**
 * Open the printable A4 invoice in a new window and trigger the browser's
 * print dialog (the user can then save it as PDF). Shared by the admin finance
 * panel and the user-facing «تاریخچه پرداخت‌ها» download button.
 */
export function printInvoiceDocument(invoice: FinanceInvoice): boolean {
  const items =
    invoice.items && invoice.items.length
      ? invoice.items
      : [
          {
            description: invoice.title,
            quantity: 1,
            unitPrice: invoice.subtotal,
            total: invoice.subtotal,
          },
        ];
  const customerName = invoice.customerName ?? invoice.customer?.fullName ?? '—';
  const customerNationalCode =
    invoice.customerNationalCode ?? invoice.customer?.nationalCode ?? '—';
  const customerPhone = invoice.customerPhone ?? invoice.customer?.phone ?? '—';
  const customerEmail = invoice.customerEmail ?? invoice.customer?.email ?? '—';
  const customerFatherName = invoice.customer?.fatherName ?? '—';
  const customerBirthDate = invoice.customer?.birthDate ?? '—';
  const paymentMethodRaw =
    invoice.metadata && typeof invoice.metadata.paymentMethod === 'string'
      ? invoice.metadata.paymentMethod
      : null;
  const paymentMethod =
    paymentMethodRaw === 'wallet'
      ? 'کیف پول'
      : paymentMethodRaw === 'manual'
        ? 'ثبت دستی'
        : 'پرداخت آنلاین (درگاه بانکی)';
  const rows = items
    .map(
      (item, index) =>
        `<tr>
            <td class="col-index">${(index + 1).toLocaleString('fa-IR')}</td>
            <td class="col-desc">${escapeHtml(item.description)}</td>
            <td class="col-num">${item.quantity.toLocaleString('fa-IR')}</td>
            <td class="col-num">${item.unitPrice.toLocaleString('fa-IR')}</td>
            <td class="col-num strong">${item.total.toLocaleString('fa-IR')}</td>
          </tr>`,
    )
    .join('');
  const isVoid = invoice.status === 'VOID';
  const win = window.open('', '_blank', 'width=820,height=900');
  if (!win) return false;
  win.document.write(`<!doctype html>
<html dir="rtl" lang="fa">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(invoice.number)}</title>
  <style>
    @page{size:A4;margin:14mm}
    *{box-sizing:border-box}
    body{font-family:Vazirmatn,Tahoma,"Segoe UI",sans-serif;margin:0;padding:0;color:#1f2937;font-size:12.5px;line-height:1.9;background:#fff}
    .sheet{position:relative;max-width:760px;margin:0 auto;padding:6px 4px}
    .top{display:flex;justify-content:space-between;align-items:center;gap:16px;padding-bottom:14px;border-bottom:3px double #8b3a1a}
    .brand{display:flex;align-items:center;gap:10px}
    .logo{width:46px;height:46px;border-radius:12px;background:#8b3a1a;color:#fff;display:flex;align-items:center;justify-content:center;font-size:22px;font-weight:800}
    .brand h1{font-size:19px;margin:0;color:#8b3a1a;letter-spacing:.2px}
    .brand p{margin:2px 0 0;font-size:10.5px;color:#6b7280}
    .doc-title{text-align:left}
    .doc-title .label{font-size:15px;font-weight:800;color:#111827}
    .doc-title .en{font-size:9.5px;color:#9ca3af;letter-spacing:1px;text-transform:uppercase}
    .meta{display:flex;justify-content:space-between;gap:12px;margin:14px 0 16px;flex-wrap:wrap}
    .meta table{border-collapse:collapse;font-size:11.5px}
    .meta td{padding:2px 0}
    .meta .k{color:#6b7280;padding-inline-end:8px;white-space:nowrap}
    .meta .v{font-weight:700;color:#111827}
    .badge{display:inline-block;border-radius:999px;padding:1px 10px;font-size:10.5px;font-weight:800}
    .badge.ok{background:#ecfdf5;color:#047857;border:1px solid #a7f3d0}
    .badge.void{background:#fef2f2;color:#b91c1c;border:1px solid #fecaca}
    .parties{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px}
    .party{border:1px solid #e5e7eb;border-radius:10px;padding:10px 12px;background:#fcfcfd}
    .party h2{margin:0 0 6px;font-size:11px;color:#8b3a1a;font-weight:800;letter-spacing:.3px}
    .party table{width:100%;border-collapse:collapse;font-size:11.5px}
    .party td{padding:1.5px 0;vertical-align:top}
    .party .k{color:#6b7280;width:82px;white-space:nowrap}
    .party .v{color:#111827;font-weight:600;word-break:break-word}
    table.items{width:100%;border-collapse:collapse;margin-top:4px}
    table.items th{background:#8b3a1a;color:#fff;font-size:11px;font-weight:700;padding:8px 6px;text-align:center;border:1px solid #8b3a1a}
    table.items td{border:1px solid #e5e7eb;padding:7px 6px;font-size:11.5px;vertical-align:top}
    table.items tbody tr:nth-child(even) td{background:#fafafa}
    .col-index{width:34px;text-align:center;color:#6b7280}
    .col-desc{text-align:right}
    .col-num{width:104px;text-align:center;white-space:nowrap}
    .strong{font-weight:700;color:#111827}
    .summary{display:flex;justify-content:space-between;gap:16px;margin-top:14px;align-items:flex-start;flex-wrap:wrap}
    .words{flex:1;min-width:220px;border:1px dashed #d1d5db;border-radius:8px;padding:8px 10px;font-size:11px;color:#374151;background:#fbfbfc}
    .words b{color:#111827}
    .totals{width:300px}
    .totals .row{display:flex;justify-content:space-between;padding:6px 10px;font-size:11.5px;border-bottom:1px solid #eee}
    .totals .row .k{color:#6b7280}
    .totals .row .v{font-weight:700;color:#111827}
    .totals .grand{margin-top:6px;background:#8b3a1a;color:#fff;border-radius:8px;padding:8px 10px;display:flex;justify-content:space-between;font-weight:800;font-size:13px}
    .totals .grand .v{color:#fff}
    .note{margin-top:14px;font-size:11px;color:#4b5563;background:#f9fafb;border:1px solid #eee;border-radius:8px;padding:8px 10px}
    .note b{color:#111827}
    .sign{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:34px}
    .sign div{border-top:1px solid #9ca3af;padding-top:6px;text-align:center;font-size:11px;color:#6b7280}
    .foot{margin-top:22px;padding-top:8px;border-top:1px solid #e5e7eb;text-align:center;font-size:10px;color:#9ca3af}
    .watermark{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;pointer-events:none}
    .watermark span{font-size:96px;font-weight:900;color:rgba(185,28,28,.10);transform:rotate(-24deg);letter-spacing:8px}
    @media print{body{font-size:12px}.sheet{padding:0}}
  </style>
</head>
<body>
  <div class="sheet">
    ${isVoid ? '<div class="watermark"><span>باطل</span></div>' : ''}
    <div class="top">
      <div class="brand">
        <div class="logo">ش</div>
        <div>
          <h1>شمالی کارت</h1>
          <p>سامانه‌ی بیولینک و کارت ویزیت دیجیتال — shomalicard.ir</p>
        </div>
      </div>
      <div class="doc-title">
        <div class="label">صورتحساب فروش کالا و خدمات</div>
        <div class="en">Sales Invoice</div>
      </div>
    </div>

    <div class="meta">
      <table>
        <tr><td class="k">شماره فاکتور</td><td class="v" dir="ltr">${escapeHtml(invoice.number)}</td></tr>
        <tr><td class="k">تاریخ صدور</td><td class="v">${faDate(invoice.issuedAt)}</td></tr>
      </table>
      <table>
        <tr><td class="k">تاریخ پرداخت</td><td class="v">${invoice.paidAt ? faDate(invoice.paidAt) : '—'}</td></tr>
        <tr><td class="k">روش پرداخت</td><td class="v">${escapeHtml(paymentMethod)}</td></tr>
        <tr><td class="k">وضعیت</td><td class="v"><span class="badge ${isVoid ? 'void' : 'ok'}">${isVoid ? 'ابطال‌شده' : 'پرداخت‌شده / صادرشده'}</span></td></tr>
      </table>
    </div>

    <div class="parties">
      <div class="party">
        <h2>فروشنده</h2>
        <table>
          <tr><td class="k">نام</td><td class="v">شمالی کارت</td></tr>
          <tr><td class="k">وب‌سایت</td><td class="v" dir="ltr">shomalicard.ir</td></tr>
          <tr><td class="k">موضوع فعالیت</td><td class="v">خدمات دیجیتال، تبلیغات و اشتراک</td></tr>
        </table>
      </div>
      <div class="party">
        <h2>خریدار</h2>
        <table>
          <tr><td class="k">نام و نام خانوادگی</td><td class="v">${escapeHtml(customerName)}</td></tr>
          <tr><td class="k">نام پدر</td><td class="v">${escapeHtml(customerFatherName)}</td></tr>
          <tr><td class="k">کد ملی</td><td class="v" dir="ltr">${escapeHtml(customerNationalCode)}</td></tr>
          <tr><td class="k">تاریخ تولد</td><td class="v" dir="ltr">${escapeHtml(customerBirthDate)}</td></tr>
          <tr><td class="k">موبایل</td><td class="v" dir="ltr">${escapeHtml(customerPhone)}</td></tr>
          <tr><td class="k">ایمیل</td><td class="v" dir="ltr">${escapeHtml(customerEmail)}</td></tr>
        </table>
      </div>
    </div>

    <table class="items">
      <thead>
        <tr>
          <th>ردیف</th>
          <th>شرح کالا / خدمات</th>
          <th>تعداد</th>
          <th>مبلغ واحد (تومان)</th>
          <th>مبلغ کل (تومان)</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>
    ${items.length > 1 ? '<div class="note" style="margin-top:10px">اقلام این فاکتور به‌صورت یک سبد خرید و با یک پرداخت یکجا تسویه شده‌اند.</div>' : ''}

    <div class="summary">
      <div class="words">
        مبلغ به حروف: <b>${escapeHtml(numberToPersianWords(invoice.total))} تومان</b>
      </div>
      <div class="totals">
        <div class="row"><span class="k">جمع کل قبل از مالیات</span><span class="v">${invoice.subtotal.toLocaleString('fa-IR')}</span></div>
        <div class="row"><span class="k">مالیات بر ارزش افزوده</span><span class="v">${invoice.taxAmount.toLocaleString('fa-IR')}</span></div>
        <div class="grand"><span>مبلغ قابل پرداخت</span><span class="v">${invoice.total.toLocaleString('fa-IR')} تومان</span></div>
      </div>
    </div>

    ${invoice.description ? `<div class="note"><b>توضیحات:</b> ${escapeHtml(invoice.description)}</div>` : ''}
    ${isVoid ? `<div class="note"><b>دلیل ابطال:</b> ${escapeHtml(invoice.voidReason ?? '—')}</div>` : ''}

    <div class="sign">
      <div>مهر و امضای فروشنده</div>
      <div>امضای خریدار</div>
    </div>

    <div class="foot">
      این فاکتور به‌صورت الکترونیکی صادر شده و در سامانه‌ی مالیاتی شمالی کارت بایگانی است.
    </div>
  </div>
</body>
</html>`);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 150);
  return true;
}
