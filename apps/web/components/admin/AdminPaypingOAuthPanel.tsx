'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  KeyRound,
  Link2,
  Loader2,
  Plug,
  RefreshCw,
  ShieldCheck,
  Unplug,
  XCircle,
} from 'lucide-react';

import { api } from '@/lib/api';
import { cn } from '@/lib/utils';

type Row = Record<string, unknown>;

interface OAuthStatus {
  configured: boolean;
  connected: boolean;
  clientId: string | null;
  redirectUri: string;
  authorizeUrl: string;
  tokenUrl: string;
  requestedScopes: string[];
  grantedScopes: string[];
  expiresAt: string | null;
  message: string | null;
}

interface ProbeResult {
  scope: string;
  method: string;
  path: string;
  ok: boolean;
  status: number;
  message: string;
}

const INPUT =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand';

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'خطای نامشخص';
}

function Panel({
  title,
  action,
  children,
}: {
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-extrabold text-ink">{title}</h3>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function Banner({
  kind,
  children,
}: {
  kind: 'error' | 'ok' | 'info';
  children: React.ReactNode;
}) {
  const styles =
    kind === 'error'
      ? 'bg-red-50 text-red-700'
      : kind === 'ok'
        ? 'bg-green-50 text-green-700'
        : 'bg-amber-50 text-amber-800';
  return (
    <p className={cn('rounded-lg p-3 text-sm', styles)} dir="rtl">
      {children}
    </p>
  );
}

/**
 * Separate admin panel for the PayPing **OAuth application** (ClientId /
 * ClientSecret). It is intentionally not merged with the merchant-token panel
 * so the two integrations can be compared. The OAuth client needs a one-time
 * authorisation (authorization-code + PKCE); afterwards the panel probes the
 * granted scopes and lets the admin call the API.
 */
export function AdminPaypingOAuthPanel() {
  const [status, setStatus] = useState<OAuthStatus | null>(null);
  const [scopes, setScopes] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [userinfo, setUserinfo] = useState<unknown>(null);
  const [probe, setProbe] = useState<ProbeResult[] | null>(null);
  const [raw, setRaw] = useState({ method: 'GET', path: '/v1/customer/ListCount', body: '' });
  const [rawResult, setRawResult] = useState<unknown>(null);

  const apply = useCallback((data: OAuthStatus) => {
    setStatus(data);
    setScopes(data.requestedScopes.join(' '));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      apply(await api.get<OAuthStatus>('/admin/payping-oauth/status'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void load();
  }, [load]);

  async function saveScopes() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.patch<{ requestedScopes: string[] }>(
        '/admin/payping-oauth/scopes',
        { scopes },
      );
      setNotice(`scopeهای درخواستی ذخیره شد: ${result.requestedScopes.join(' ')}`);
      await load();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function connect() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      const result = await api.post<{ url: string }>('/admin/payping-oauth/start');
      window.location.href = result.url;
    } catch (err) {
      setError(errorText(err));
      setBusy(false);
    }
  }

  async function disconnect() {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      apply(await api.post<OAuthStatus>('/admin/payping-oauth/disconnect'));
      setUserinfo(null);
      setProbe(null);
      setNotice('اتصال قطع شد.');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function loadUserinfo() {
    setBusy(true);
    setError(null);
    try {
      setUserinfo(await api.get<unknown>('/admin/payping-oauth/userinfo'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function runProbe() {
    setBusy(true);
    setError(null);
    setProbe(null);
    try {
      setProbe(await api.get<ProbeResult[]>('/admin/payping-oauth/probe'));
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  async function runRaw() {
    setBusy(true);
    setError(null);
    setRawResult(null);
    try {
      let parsed: unknown = undefined;
      if (raw.body.trim()) {
        try {
          parsed = JSON.parse(raw.body);
        } catch {
          throw new Error('بدنه‌ی JSON نامعتبر است.');
        }
      }
      setRawResult(
        await api.post<unknown>('/admin/payping-oauth/request', {
          method: raw.method,
          path: raw.path,
          body: parsed,
        }),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  if (loading && !status) {
    return (
      <div className="indeed-panel p-6 text-center text-sm text-muted">
        در حال خواندن وضعیت OAuth...
      </div>
    );
  }

  if (!status) {
    return (
      <div className="indeed-panel p-6">
        <Banner kind="error">{error ?? 'وضعیت OAuth در دسترس نیست.'}</Banner>
        <button
          onClick={() => void load()}
          className="indeed-btn indeed-btn-secondary mt-3 py-2 text-sm"
        >
          <RefreshCw className="size-4" aria-hidden />
          تلاش مجدد
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <Banner kind="info">
        این پنل از <strong>ClientId/ClientSecret</strong> (اپلیکیشن OAuth پی‌پینگ)
        استفاده می‌کند و کاملاً از پنل «درگاه پرداخت» (توکن پذیرنده) جداست. این کلاینت
        با روش <code dir="ltr">authorization_code + PKCE</code> کار می‌کند؛ یعنی یک‌بار
        باید حساب پی‌پینگ را مجوز دهید. آدرس بازگشت باید دقیقاً{' '}
        <code dir="ltr">{status.redirectUri}</code> باشد.
      </Banner>

      {error ? <Banner kind="error">{error}</Banner> : null}
      {notice ? <Banner kind="ok">{notice}</Banner> : null}

      <Panel
        title="وضعیت اتصال"
        action={
          <button
            onClick={() => void load()}
            className="indeed-btn indeed-btn-secondary py-1.5 text-xs"
          >
            <RefreshCw className="size-3.5" aria-hidden />
            به‌روزرسانی
          </button>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-[var(--vintage-border)] p-3">
            <p className="text-xs text-muted">ClientId</p>
            <p className="text-sm font-bold text-ink" dir="ltr">
              {status.clientId ?? '—'}
            </p>
          </div>
          <div className="rounded-xl border border-[var(--vintage-border)] p-3">
            <p className="text-xs text-muted">وضعیت</p>
            <p className="mt-1 flex items-center gap-2 text-sm font-bold">
              {!status.configured ? (
                <span className="inline-flex items-center gap-1 text-red-600">
                  <XCircle className="size-4" aria-hidden />
                  تنظیم نشده
                </span>
              ) : status.connected ? (
                <span className="inline-flex items-center gap-1 text-green-700">
                  <CheckCircle2 className="size-4" aria-hidden />
                  متصل
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-amber-700">
                  <AlertTriangle className="size-4" aria-hidden />
                  مجوز داده نشده
                </span>
              )}
            </p>
          </div>
        </div>

        {status.message ? (
          <div className="mt-3">
            <Banner kind="error">{status.message}</Banner>
          </div>
        ) : null}

        <div className="mt-4 flex flex-wrap gap-2">
          <button
            onClick={() => void connect()}
            disabled={busy || !status.configured}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            {busy ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <Plug className="size-4" aria-hidden />
            )}
            {status.connected ? 'اتصال مجدد' : 'اتصال به پی‌پینگ'}
          </button>
          {status.connected ? (
            <button
              onClick={() => void disconnect()}
              disabled={busy}
              className="indeed-btn indeed-btn-secondary py-2 text-sm text-red-600 disabled:opacity-60"
            >
              <Unplug className="size-4" aria-hidden />
              قطع اتصال
            </button>
          ) : null}
        </div>

        {status.connected ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">انقضای توکن دسترسی</p>
              <p className="text-sm text-ink">
                {status.expiresAt
                  ? new Date(status.expiresAt).toLocaleString('fa-IR')
                  : '—'}
              </p>
            </div>
            <div className="rounded-xl border border-[var(--vintage-border)] p-3">
              <p className="text-xs text-muted">scopeهای داده‌شده</p>
              <p className="mt-1 flex flex-wrap gap-1" dir="ltr">
                {status.grantedScopes.length === 0
                  ? '—'
                  : status.grantedScopes.map((scope) => (
                      <span
                        key={scope}
                        className="rounded bg-[var(--vintage-surface)] px-1.5 py-0.5 text-[11px] text-ink"
                      >
                        {scope}
                      </span>
                    ))}
              </p>
            </div>
          </div>
        ) : null}
      </Panel>

      <Panel title="scopeهای درخواستی">
        <p className="mb-2 text-xs text-muted">
          فهرست scopeها را با فاصله جدا کنید. اگر scopeای برای این کلاینت مجاز نباشد،
          مرحله‌ی مجوزدهی خطا می‌دهد؛ در آن صورت فهرست را محدودتر کنید.
        </p>
        <textarea
          value={scopes}
          onChange={(event) => setScopes(event.target.value)}
          rows={4}
          dir="ltr"
          className={INPUT}
        />
        <div className="mt-3 flex flex-wrap gap-2">
          <button
            onClick={() => void saveScopes()}
            disabled={busy}
            className="indeed-btn indeed-btn-primary py-2 text-sm disabled:opacity-60"
          >
            <KeyRound className="size-4" aria-hidden />
            ذخیره‌ی scopeها
          </button>
          <button
            onClick={() => void loadUserinfo()}
            disabled={busy || !status.connected}
            className="indeed-btn indeed-btn-secondary py-2 text-sm disabled:opacity-60"
          >
            <ShieldCheck className="size-4" aria-hidden />
            اطلاعات کاربر
          </button>
        </div>
        {userinfo ? (
          <pre
            dir="ltr"
            className="mt-3 max-h-64 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(userinfo, null, 2)}
          </pre>
        ) : null}
      </Panel>

      <Panel
        title="آزمایش دسترسی واقعی (Probe)"
        action={
          <button
            onClick={() => void runProbe()}
            disabled={busy || !status.connected}
            className="indeed-btn indeed-btn-primary py-1.5 text-xs disabled:opacity-60"
          >
            <ShieldCheck className="size-3.5" aria-hidden />
            اجرای آزمایش
          </button>
        }
      >
        {!probe ? (
          <p className="text-sm text-muted">
            با اجرای آزمایش، برای هر scope یک endpoint نمونه صدا زده می‌شود تا مشخص
            شود این توکن واقعاً به چه چیزهایی دسترسی دارد.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[34rem] text-right text-sm">
              <thead>
                <tr className="border-b border-[var(--vintage-border)] text-xs text-muted">
                  <th className="px-3 py-2 font-bold">scope</th>
                  <th className="px-3 py-2 font-bold">endpoint</th>
                  <th className="px-3 py-2 font-bold">نتیجه</th>
                </tr>
              </thead>
              <tbody>
                {probe.map((item) => (
                  <tr
                    key={`${item.scope}-${item.path}`}
                    className="border-b border-[var(--vintage-border)] last:border-0"
                  >
                    <td className="px-3 py-2" dir="ltr">
                      {item.scope}
                    </td>
                    <td className="px-3 py-2 text-xs text-muted" dir="ltr">
                      {item.method} {item.path}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-xs font-bold',
                          item.ok ? 'text-green-700' : 'text-red-600',
                        )}
                      >
                        {item.ok ? (
                          <CheckCircle2 className="size-3.5" aria-hidden />
                        ) : (
                          <XCircle className="size-3.5" aria-hidden />
                        )}
                        {item.ok ? 'دسترسی دارد' : item.message}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <Panel title="فراخوانی خام API">
        <div className="grid gap-3 md:grid-cols-[8rem_1fr]">
          <select
            value={raw.method}
            onChange={(event) => setRaw({ ...raw, method: event.target.value })}
            className={INPUT}
          >
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <input
            value={raw.path}
            onChange={(event) => setRaw({ ...raw, path: event.target.value })}
            dir="ltr"
            className={INPUT}
            placeholder="/v1/customer/ListCount"
          />
        </div>
        <textarea
          value={raw.body}
          onChange={(event) => setRaw({ ...raw, body: event.target.value })}
          rows={3}
          dir="ltr"
          placeholder='{"key":"value"}'
          className={`${INPUT} mt-3`}
        />
        <button
          onClick={() => void runRaw()}
          disabled={busy || !status.connected}
          className="indeed-btn indeed-btn-primary mt-3 py-2 text-sm disabled:opacity-60"
        >
          <Link2 className="size-4" aria-hidden />
          ارسال درخواست
        </button>
        {rawResult ? (
          <pre
            dir="ltr"
            className="mt-3 max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(rawResult, null, 2)}
          </pre>
        ) : null}
      </Panel>
    </div>
  );
}
