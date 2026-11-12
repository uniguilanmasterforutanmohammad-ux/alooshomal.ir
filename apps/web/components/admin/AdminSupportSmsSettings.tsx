'use client';

import { useCallback, useEffect, useState } from 'react';
import { MessageSquareText, Save } from 'lucide-react';

import { api } from '@/lib/api';

interface SupportSmsSettings {
  enabled: boolean;
  phone: string;
  resolvedPhone: string;
  phoneFromAdminAccount: boolean;
  channelReady: boolean;
}

/**
 * Configuration for the SMS that alerts the admin line whenever a user starts
 * a new support-chat burst. The phone is optional: leaving it empty falls back
 * to SUPPORT_CHAT_ALERT_PHONE and then to the oldest active admin's phone.
 */
export function AdminSupportSmsSettings() {
  const [settings, setSettings] = useState<SupportSmsSettings | null>(null);
  const [enabled, setEnabled] = useState(true);
  const [phone, setPhone] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    try {
      const result = await api.get<SupportSmsSettings>(
        '/admin/support/chat/sms-settings',
      );
      setSettings(result);
      setEnabled(result.enabled);
      setPhone(result.phone);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری تنظیمات');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<SupportSmsSettings>(
        '/admin/support/chat/sms-settings',
        { enabled, phone: phone.trim() },
      );
      setSettings(result);
      setEnabled(result.enabled);
      setPhone(result.phone);
      setMessage('تنظیمات پیامک پشتیبانی ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره تنظیمات ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex items-center gap-2">
        <MessageSquareText className="size-5 text-brand" aria-hidden />
        <h3 className="text-sm font-extrabold text-ink">
          پیامک پیام جدید پشتیبانی
        </h3>
      </div>
      <p className="mt-1 text-xs leading-6 text-muted">
        با هر پیام تازه‌ی کاربر (شروع هر دسته پیام) یک پیامک به خط ادمین ارسال
        می‌شود. برای پیام‌های بعدی تا وقتی ادمین آن‌ها را نخوانده، پیامک تکراری
        نمی‌آید.
      </p>

      {!settings ? (
        <p className="mt-4 text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <>
          <label className="mt-4 flex cursor-pointer items-center justify-between gap-3">
            <span>
              <span className="block text-sm font-bold text-ink">
                ارسال پیامک فعال باشد
              </span>
              <span className="block text-[11px] text-muted">
                خاموش‌کردن این گزینه فقط پیامک را متوقف می‌کند؛ اعلان داخل پنل
                همچنان ثبت می‌شود.
              </span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              onClick={() => {
                setEnabled((prev) => !prev);
                setMessage(null);
              }}
              className={`relative h-6 w-11 shrink-0 rounded-full border transition ${
                enabled
                  ? 'border-brand bg-brand'
                  : 'border-[var(--vintage-border)] bg-white'
              }`}
            >
              <span
                className={`absolute top-0.5 size-4.5 rounded-full bg-white shadow transition-all ${
                  enabled ? 'start-0.5' : 'start-5.5'
                }`}
              />
            </button>
          </label>

          <label className="mt-4 block text-sm font-bold text-ink">
            شماره‌ی خط دریافت پیامک
            <input
              value={phone}
              onChange={(event) => {
                setPhone(event.target.value);
                setMessage(null);
              }}
              dir="ltr"
              inputMode="tel"
              placeholder="09121234567"
              className="indeed-input mt-1.5 w-full py-2 text-sm"
            />
          </label>
          <p className="mt-1 text-[11px] leading-5 text-muted">
            خالی بگذارید تا از{' '}
            {settings.phoneFromAdminAccount
              ? 'شماره‌ی حساب ادمین'
              : 'شماره‌ی پیش‌فرض تنظیم‌شده روی سرور'}{' '}
            استفاده شود.
            {settings.resolvedPhone ? (
              <>
                {' '}
                شماره‌ی مؤثر:{' '}
                <span dir="ltr" className="font-bold">
                  {settings.resolvedPhone}
                </span>
              </>
            ) : (
              ' هنوز هیچ شماره‌ای تنظیم نشده است.'
            )}
          </p>

          {!settings.channelReady ? (
            <p className="mt-3 rounded-lg bg-amber-50 p-2 text-[11px] leading-5 text-amber-800">
              ارسال واقعی پیامک نیازمند تنظیم <code>MELIPAYAMAK_SMS_PATH</code>{' '}
              و <code>MELIPAYAMAK_SMS_FROM</code> (خط فرستنده) روی سرور است. تا
              آن زمان تنظیمات ذخیره می‌شود ولی پیامکی ارسال نمی‌شود.
            </p>
          ) : null}

          <button
            type="button"
            onClick={save}
            disabled={busy}
            className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
          >
            <Save className="size-4" aria-hidden />
            ذخیره
          </button>
        </>
      )}

      {message ? (
        <p className="mt-3 rounded-lg bg-green-50 p-2 text-xs text-green-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 rounded-lg bg-red-50 p-2 text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
