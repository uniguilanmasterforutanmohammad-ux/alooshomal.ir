'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Pencil,
  Plus,
  Share2,
  ShieldCheck,
  Trash2,
  X,
} from 'lucide-react';

import {
  api,
  type SocialAccount,
  type SocialAccountsPayload,
  type SocialPlatformMeta,
} from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

/** How long a revealed password stays on screen before it hides itself. */
const REVEAL_TTL_MS = 30_000;

interface Draft {
  platform: string;
  title: string;
  username: string;
  password: string;
  email: string;
  phone: string;
  url: string;
  notes: string;
  isActive: boolean;
}

const EMPTY_DRAFT: Draft = {
  platform: 'INSTAGRAM',
  title: '',
  username: '',
  password: '',
  email: '',
  phone: '',
  url: '',
  notes: '',
  isActive: true,
};

/**
 * Vault for the «شمالی کارت» brand accounts on Instagram / Bale / Eitaa /
 * Aparat / … . Passwords are encrypted server-side and never come back in the
 * list; the panel can only read one back through the audited reveal endpoint,
 * which is why each reveal asks for a reason and lands in «گزارش‌های سیستم».
 */
export function AdminSocialAccounts() {
  const [data, setData] = useState<SocialAccountsPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>('ALL');
  const [editing, setEditing] = useState<SocialAccount | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  /** id → decrypted password currently on screen (cleared after REVEAL_TTL). */
  const [revealed, setRevealed] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setData(await api.get<SocialAccountsPayload>('/admin/social-accounts'));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری حساب‌ها');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const platforms = useMemo(() => data?.platforms ?? [], [data]);
  const items = useMemo(() => data?.items ?? [], [data]);

  /** Platform order follows the server registry, not the DB collation. */
  const groups = useMemo(() => {
    const order = new Map(platforms.map((platform, index) => [platform.key, index]));
    const visible = filter === 'ALL' ? items : items.filter((item) => item.platform === filter);
    const byPlatform = new Map<string, SocialAccount[]>();
    for (const item of visible) {
      const list = byPlatform.get(item.platform) ?? [];
      list.push(item);
      byPlatform.set(item.platform, list);
    }
    return [...byPlatform.entries()]
      .sort(([a], [b]) => (order.get(a) ?? 99) - (order.get(b) ?? 99))
      .map(([platform, list]) => ({
        platform,
        meta: platforms.find((entry) => entry.key === platform) as
          | SocialPlatformMeta
          | undefined,
        accounts: list,
      }));
  }, [filter, items, platforms]);

  function startCreate() {
    setEditing(null);
    setDraft(EMPTY_DRAFT);
  }

  function startEdit(account: SocialAccount) {
    setEditing(account);
    setDraft({
      platform: account.platform,
      title: account.title,
      username: account.username,
      password: '',
      email: account.email ?? '',
      phone: account.phone ?? '',
      url: account.url ?? '',
      notes: account.notes ?? '',
      isActive: account.isActive,
    });
  }

  function buildBody(): Record<string, unknown> {
    const body: Record<string, unknown> = {
      platform: draft.platform,
      title: draft.title.trim(),
      username: draft.username.trim(),
      email: draft.email.trim(),
      phone: draft.phone.trim(),
      url: draft.url.trim(),
      notes: draft.notes.trim(),
      isActive: draft.isActive,
    };
    // Only send a password when the admin typed a new one, so an edit never
    // wipes the stored secret by accident.
    if (draft.password.trim()) body.password = draft.password;
    return body;
  }

  async function save() {
    if (!draft.title.trim() || !draft.username.trim()) {
      toast.error('عنوان حساب و نام کاربری الزامی است.');
      return;
    }
    if (!editing && !draft.password.trim()) {
      toast.error('برای حساب جدید رمز عبور را وارد کنید.');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/admin/social-accounts/${editing.id}`, buildBody());
        toast.success('اطلاعات حساب به‌روزرسانی شد.');
      } else {
        await api.post('/admin/social-accounts', buildBody());
        toast.success('حساب شبکه‌ی اجتماعی اضافه شد.');
      }
      startCreate();
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  async function toggleActive(account: SocialAccount) {
    setBusyId(account.id);
    try {
      await api.patch(`/admin/social-accounts/${account.id}`, {
        isActive: !account.isActive,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(account: SocialAccount) {
    if (
      !window.confirm(
        `حذف حساب «${account.username}» (${account.platformLabel})؟ این عملیات بازگشت‌پذیر نیست.`,
      )
    ) {
      return;
    }
    setBusyId(account.id);
    try {
      await api.delete(`/admin/social-accounts/${account.id}`);
      toast.success('حساب حذف شد.');
      setRevealed((prev) => {
        const next = { ...prev };
        delete next[account.id];
        return next;
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  function hideRevealed(id: string) {
    setRevealed((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function reveal(account: SocialAccount) {
    if (revealed[account.id]) {
      hideRevealed(account.id);
      return;
    }
    const reason = window.prompt(
      'دلیل مشاهده‌ی رمز (در گزارش‌های سیستم ثبت می‌شود):',
      'نیاز به ورود به حساب برای انتشار محتوا',
    );
    if (reason === null) return;
    setBusyId(account.id);
    try {
      const result = await api.post<{ password: string }>(
        `/admin/social-accounts/${account.id}/reveal`,
        { reason: reason.trim() || undefined },
      );
      setRevealed((prev) => ({ ...prev, [account.id]: result.password }));
      window.setTimeout(() => hideRevealed(account.id), REVEAL_TTL_MS);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'نمایش رمز ناموفق بود');
    } finally {
      setBusyId(null);
    }
  }

  async function copy(value: string, label: string) {
    try {
      await navigator.clipboard.writeText(value);
      toast.success(`${label} کپی شد.`);
    } catch {
      toast.error('کپی ناموفق بود؛ مقدار را دستی انتخاب کنید.');
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="vintage-avatar flex size-10 items-center justify-center">
          <Share2 className="size-5" aria-hidden />
        </span>
        <div>
          <h3 className="text-sm font-extrabold text-ink">
            مدیریت حساب‌های اجتماعی شمالی کارت
          </h3>
          <p className="text-xs text-muted">
            اکانت، نام کاربری و رمز عبور پیج‌ها/کانال‌های برند، رمزنگاری‌شده و فقط برای مدیر.
          </p>
        </div>
      </div>

      <p className="flex items-start gap-2 rounded-lg bg-[var(--indeed-blue-light)] p-3 text-xs text-muted">
        <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
        <span>
          رمزها با <b>AES-256-GCM</b> رمزنگاری و در دیتابیس ذخیره می‌شوند و هرگز در فهرست
          بازگردانده نمی‌شوند. هر «نمایش رمز» با دلیلِ واردشده در «گزارش‌های سیستم» ثبت
          می‌شود.
        </span>
      </p>

      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="indeed-panel p-5">
        <h4 className="text-sm font-extrabold text-ink">
          {editing ? `ویرایش حساب «${editing.username}»` : 'افزودن حساب جدید'}
        </h4>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <label className="text-xs font-bold text-muted">
            شبکه‌ی اجتماعی
            <select
              className="indeed-input mt-1"
              value={draft.platform}
              onChange={(event) => setDraft({ ...draft, platform: event.target.value })}
            >
              {platforms.map((platform) => (
                <option key={platform.key} value={platform.key}>
                  {platform.label}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs font-bold text-muted">
            عنوان حساب
            <input
              className="indeed-input mt-1"
              value={draft.title}
              onChange={(event) => setDraft({ ...draft, title: event.target.value })}
              placeholder="پیج اصلی شمالی کارت"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            نام کاربری
            <input
              className="indeed-input mt-1"
              dir="ltr"
              value={draft.username}
              onChange={(event) => setDraft({ ...draft, username: event.target.value })}
              placeholder="shomalicard"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            رمز عبور {editing ? '(برای تغییر پر کنید)' : ''}
            <input
              className="indeed-input mt-1"
              dir="ltr"
              type="password"
              autoComplete="new-password"
              value={draft.password}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
              placeholder={editing ? 'بدون تغییر' : 'رمز فعلی حساب'}
            />
          </label>
          <label className="text-xs font-bold text-muted">
            ایمیل بازیابی
            <input
              className="indeed-input mt-1"
              dir="ltr"
              value={draft.email}
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
              placeholder="social@shomalicard.ir"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            شماره‌ی بازیابی/ورود
            <input
              className="indeed-input mt-1"
              dir="ltr"
              value={draft.phone}
              onChange={(event) => setDraft({ ...draft, phone: event.target.value })}
              placeholder="09121234567"
            />
          </label>
          <label className="text-xs font-bold text-muted md:col-span-2">
            نشانی صفحه
            <input
              className="indeed-input mt-1"
              dir="ltr"
              value={draft.url}
              onChange={(event) => setDraft({ ...draft, url: event.target.value })}
              placeholder="https://instagram.com/shomalicard"
            />
          </label>
          <label className="text-xs font-bold text-muted">
            وضعیت
            <span className="mt-2 flex items-center gap-2">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
              />
              <span className="text-xs text-muted">حساب فعال است</span>
            </span>
          </label>
          <label className="text-xs font-bold text-muted md:col-span-3">
            نکات و اطلاعات پشتیبان
            <textarea
              className="indeed-input mt-1 min-h-20"
              value={draft.notes}
              onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
              placeholder="ایمیل/موبایل پشتیبان، پرسش امنیتی، یادآوری تمدید و…"
            />
          </label>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button onClick={save} disabled={saving} className="indeed-btn indeed-btn-primary">
            <Plus className="size-4" aria-hidden />
            {saving ? 'در حال ذخیره...' : editing ? 'ذخیره‌ی تغییرات' : 'افزودن حساب'}
          </button>
          {editing ? (
            <button onClick={startCreate} className="indeed-btn indeed-btn-secondary">
              <X className="size-4" aria-hidden />
              انصراف
            </button>
          ) : null}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={() => setFilter('ALL')}
          className={cn(
            'rounded-lg border px-3 py-1.5 text-xs font-bold transition',
            filter === 'ALL'
              ? 'border-brand bg-brand-light text-brand'
              : 'border-[var(--vintage-border)] text-muted hover:bg-[var(--indeed-blue-light)]',
          )}
        >
          همه ({items.length.toLocaleString('fa-IR')})
        </button>
        {platforms.map((platform) => {
          const count = items.filter((item) => item.platform === platform.key).length;
          return (
            <button
              key={platform.key}
              onClick={() => setFilter(platform.key)}
              className={cn(
                'rounded-lg border px-3 py-1.5 text-xs font-bold transition',
                filter === platform.key
                  ? 'border-brand bg-brand-light text-brand'
                  : 'border-[var(--vintage-border)] text-muted hover:bg-[var(--indeed-blue-light)]',
              )}
            >
              {platform.label} ({count.toLocaleString('fa-IR')})
            </button>
          );
        })}
      </div>

      {loading ? (
        <p className="text-sm text-muted">در حال بارگذاری…</p>
      ) : groups.length === 0 ? (
        <p className="indeed-panel p-5 text-sm text-muted">
          هنوز حسابی ثبت نشده است. اولین حساب را از فرم بالا اضافه کنید.
        </p>
      ) : (
        groups.map((group) => (
          <div key={group.platform} className="indeed-panel overflow-hidden">
            <div className="border-b-2 border-dashed border-[var(--vintage-accent-hover)] px-5 py-3">
              <h4 className="text-sm font-extrabold text-ink">
                {group.meta?.label ?? group.platform} ({group.accounts.length.toLocaleString('fa-IR')})
              </h4>
              {group.meta?.hint ? (
                <p className="text-xs text-muted">{group.meta.hint}</p>
              ) : null}
            </div>
            <ul className="divide-y divide-[var(--vintage-accent-hover)]">
              {group.accounts.map((account) => (
                <li key={account.id} className="flex flex-col gap-3 p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 text-sm font-extrabold text-ink">
                        {account.title}
                        {!account.isActive ? (
                          <span className="rounded bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700">
                            غیرفعال
                          </span>
                        ) : null}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
                        <button
                          onClick={() => copy(account.username, 'نام کاربری')}
                          className="inline-flex items-center gap-1 font-bold text-brand"
                          dir="ltr"
                        >
                          <Copy className="size-3" aria-hidden />
                          {account.username}
                        </button>
                        {account.phone ? <span dir="ltr">{account.phone}</span> : null}
                        {account.email ? <span dir="ltr">{account.email}</span> : null}
                        {account.url ? (
                          <a
                            href={account.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-brand underline"
                            dir="ltr"
                          >
                            صفحه
                          </a>
                        ) : null}
                      </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => reveal(account)}
                        disabled={busyId === account.id}
                        className="indeed-btn indeed-btn-secondary"
                      >
                        {revealed[account.id] ? (
                          <EyeOff className="size-4" aria-hidden />
                        ) : (
                          <Eye className="size-4" aria-hidden />
                        )}
                        {revealed[account.id] ? 'پنهان‌کردن رمز' : 'نمایش رمز'}
                      </button>
                      <button
                        onClick={() => startEdit(account)}
                        className="indeed-btn indeed-btn-secondary"
                      >
                        <Pencil className="size-4" aria-hidden />
                        ویرایش
                      </button>
                      <button
                        onClick={() => toggleActive(account)}
                        disabled={busyId === account.id}
                        className="indeed-btn indeed-btn-secondary"
                      >
                        {account.isActive ? 'غیرفعال‌کردن' : 'فعال‌کردن'}
                      </button>
                      <button
                        onClick={() => remove(account)}
                        disabled={busyId === account.id}
                        className="indeed-btn indeed-btn-secondary text-red-600"
                      >
                        <Trash2 className="size-4" aria-hidden />
                        حذف
                      </button>
                    </div>
                  </div>

                  {revealed[account.id] ? (
                    <p className="flex items-center gap-2 rounded-lg bg-[var(--vintage-surface)] p-2 text-xs">
                      <KeyRound className="size-4 text-brand" aria-hidden />
                      <code dir="ltr" className="font-mono text-sm text-ink">
                        {revealed[account.id]}
                      </code>
                      <button
                        onClick={() => copy(revealed[account.id], 'رمز عبور')}
                        className="text-brand"
                        aria-label="کپی رمز"
                      >
                        <Copy className="size-4" aria-hidden />
                      </button>
                      <span className="ms-auto text-[10px] text-muted">
                        ۳۰ ثانیه دیگر پنهان می‌شود
                      </span>
                    </p>
                  ) : null}

                  {account.notes ? (
                    <p className="whitespace-pre-wrap rounded-lg bg-[var(--indeed-blue-light)] p-2 text-xs text-muted">
                      {account.notes}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        ))
      )}
    </div>
  );
}
