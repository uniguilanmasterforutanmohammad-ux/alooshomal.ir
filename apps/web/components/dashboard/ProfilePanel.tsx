'use client';

import { useCallback, useEffect, useState } from 'react';
import { BadgeCheck, IdCard, Mail, Send, ShieldCheck, UserRound } from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { toast } from '@/lib/toast';

interface ProfileChangeRequest {
  id: string;
  changes: { fullName?: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  createdAt: string;
}

interface ProfilePayload {
  id: string;
  email: string;
  fullName: string | null;
  role: string;
  isActive: boolean;
  createdAt: string;
  pendingChange: ProfileChangeRequest | null;
}

const ROLE_LABEL: Record<string, string> = {
  USER: 'کاربر',
  CITIZEN_REPORTER: 'شهروند خبرنگار',
  ADMIN: 'مدیر',
};

/** User profile page: shows account info and requests admin-approved changes. */
export function ProfilePanel() {
  const { user, hydrated } = useAuth();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ProfilePayload>('/profile/me');
      setProfile(data);
      setFullName((current) => current || data.fullName || '');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  async function submit() {
    if (fullName.trim().length < 2) {
      toast.error('نام باید حداقل ۲ کاراکتر باشد.');
      return;
    }
    setSending(true);
    try {
      await api.post('/profile/change-request', { fullName: fullName.trim() });
      toast.success('درخواست تغییر نام ثبت شد و در انتظار تأیید مدیر است.');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setSending(false);
    }
  }

  if (!hydrated || loading || !profile) {
    return <div className="indeed-panel p-8 text-center text-sm text-muted">در حال بارگذاری...</div>;
  }

  const pending = profile.pendingChange;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-3">
        <span className="vintage-avatar flex size-11 items-center justify-center">
          <UserRound className="size-5" aria-hidden />
        </span>
        <div>
          <h1 className="text-xl font-extrabold text-ink">پروفایل کاربری</h1>
          <p className="text-sm text-muted">مشاهده و درخواست تغییر اطلاعات حساب</p>
        </div>
      </div>

      <div className="indeed-panel grid gap-4 p-5 sm:grid-cols-2">
        <InfoRow icon={UserRound} label="نام" value={profile.fullName ?? '—'} />
        <InfoRow icon={Mail} label="ایمیل" value={profile.email} ltr />
        <InfoRow
          icon={ShieldCheck}
          label="نقش"
          value={ROLE_LABEL[profile.role] ?? profile.role}
        />
        <InfoRow
          icon={BadgeCheck}
          label="وضعیت حساب"
          value={profile.isActive ? 'فعال' : 'غیرفعال'}
        />
        <InfoRow
          icon={IdCard}
          label="تاریخ عضویت"
          value={new Date(profile.createdAt).toLocaleDateString('fa-IR')}
        />
      </div>

      <div className="indeed-panel p-5">
        <h2 className="text-sm font-extrabold text-ink">درخواست تغییر نام</h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          نام جدید پس از تأیید مدیر اعمال می‌شود. تا آن زمان نام فعلی نمایش داده می‌شود.
        </p>

        {pending ? (
          <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
            درخواست تغییر نام به «{pending.changes.fullName}» در انتظار تأیید مدیر است.
          </div>
        ) : (
          <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
            <label className="flex-1 text-xs font-bold text-muted">
              نام جدید
              <input
                className="indeed-input mt-1"
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
              />
            </label>
            <button
              onClick={submit}
              disabled={sending}
              className="indeed-btn indeed-btn-primary"
            >
              <Send className="size-4" aria-hidden />
              {sending ? 'در حال ارسال...' : 'ثبت درخواست'}
            </button>
          </div>
        )}
      </div>

      <p className="text-xs text-muted">
        نام کاربری ورود: <span dir="ltr" className="font-bold">{user?.email}</span>
      </p>
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  ltr = false,
}: {
  icon: typeof UserRound;
  label: string;
  value: string;
  ltr?: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <Icon className="size-4 text-brand" aria-hidden />
      <div>
        <p className="text-[11px] text-muted">{label}</p>
        <p dir={ltr ? 'ltr' : undefined} className="text-sm font-bold text-ink">
          {value}
        </p>
      </div>
    </div>
  );
}
