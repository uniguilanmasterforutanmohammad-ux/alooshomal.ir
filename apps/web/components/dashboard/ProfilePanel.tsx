'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  IdCard,
  KeyRound,
  Mail,
  Phone,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';

import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { isoToJalali, jalaliToIso, parseJalali } from '@/lib/jalali';
import { toast } from '@/lib/toast';
import { JalaliDatePicker } from '@/components/ui/JalaliDatePicker';
import { ContactChangePanel } from './ContactChangePanel';
import { SessionsPanel } from './SessionsPanel';

interface ProfileChangeRequest {
  id: string;
  changes: { fullName?: string; phone?: string; email?: string };
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  reason: string | null;
  createdAt: string;
}

interface ProfilePayload {
  id: string;
  email: string | null;
  phone: string | null;
  fullName: string | null;
  firstName: string | null;
  lastName: string | null;
  fatherName: string | null;
  nationalCode: string | null;
  birthDate: string | null;
  phoneMatchVerifiedAt: string | null;
  identityVerifiedAt: string | null;
  verifiedAt: string | null;
  blueTickRequestedAt: string | null;
  blueTickNote: string | null;
  profileCompleted: boolean;
  identityInquiryAvailable: boolean;
  role: string;
  isActive: boolean;
  createdAt: string;
  hasPassword: boolean;
  pendingChange: ProfileChangeRequest | null;
}

const ROLE_LABEL: Record<string, string> = {
  USER: 'کاربر',
  CITIZEN_REPORTER: 'شهروند خبرنگار',
  MODERATOR: 'کاربر ادمین محدود',
  ADMIN: 'مدیر',
};

/** User profile page: shows account info and requests admin-approved changes. */
export function ProfilePanel() {
  const { user, hydrated, setUser } = useAuth();
  const [profile, setProfile] = useState<ProfilePayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [fullName, setFullName] = useState('');
  const [nationalCode, setNationalCode] = useState('');
  const [birthIso, setBirthIso] = useState('');
  const [inquiryAvailable, setInquiryAvailable] = useState<boolean | null>(null);
  const [blueTickBusy, setBlueTickBusy] = useState(false);
  const [matchingPhone, setMatchingPhone] = useState(false);
  const [inquiryRunning, setInquiryRunning] = useState(false);
  const [sending, setSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [sendToPhone, setSendToPhone] = useState(false);
  const [resetCode, setResetCode] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newPasswordConfirm, setNewPasswordConfirm] = useState('');
  const [resetDevCode, setResetDevCode] = useState<string | null>(null);
  const [sendingReset, setSendingReset] = useState(false);
  const [resetting, setResetting] = useState(false);

  const load = useCallback(async () => {
    try {
      const data = await api.get<ProfilePayload>('/profile/me');
      setProfile(data);
      setInquiryAvailable(data.identityInquiryAvailable);
      setFullName((current) => current || data.fullName || '');
      setNationalCode(data.nationalCode ?? '');
      const parsedBirth = data.birthDate ? parseJalali(data.birthDate) : null;
      setBirthIso(
        parsedBirth
          ? jalaliToIso(parsedBirth.year, parsedBirth.month, parsedBirth.day)
          : '',
      );
      // Keep the cached session user in sync (e.g. after an immediate email
      // change), so the header and other panels show the new address.
      setUser({
        id: data.id,
        email: data.email,
        phone: data.phone,
        fullName: data.fullName,
        role: data.role as 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN',
      });
    } finally {
      setLoading(false);
    }
  }, [setUser]);

  useEffect(() => {
    if (hydrated) void load();
  }, [hydrated, load]);

  useEffect(() => {
    if (!hydrated) return;
    void api
      .get<{ available: boolean }>('/profile/identity-inquiry/status')
      .then((result) => setInquiryAvailable(result.available))
      .catch(() => setInquiryAvailable(false));
  }, [hydrated]);

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

  function birthDateJalali(): string | undefined {
    const jalaliBirth = isoToJalali(birthIso);
    return jalaliBirth
      ? `${jalaliBirth.year}/${String(jalaliBirth.month).padStart(2, '0')}/${String(jalaliBirth.day).padStart(2, '0')}`
      : undefined;
  }

  async function matchPhoneOwnership() {
    if (!/^\d{10}$/.test(nationalCode.trim())) {
      toast.error('کد ملی باید دقیقاً ۱۰ رقم باشد.');
      return;
    }
    if (!birthIso) {
      toast.error('برای استعلام هویت، تاریخ تولد را انتخاب کنید.');
      return;
    }
    setMatchingPhone(true);
    try {
      await api.post('/profile/identity/phone-match', {
        nationalCode: nationalCode.trim(),
        birthDate: birthDateJalali(),
      });
      toast.success('مالکیت شماره موبایل با کد ملی (شاهکار) تأیید شد.');
      await load();
      // The scenario continues straight into the paid identity inquiry; if
      // that call fails, the step-2 button stays available for a retry.
      await runIdentityInquiry();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setMatchingPhone(false);
    }
  }

  async function runIdentityInquiry() {
    setInquiryRunning(true);
    try {
      await api.post('/profile/identity/inquiry', {});
      toast.success('استعلام هویت انجام شد و مشخصات شما ذخیره شد.');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setInquiryRunning(false);
    }
  }

  async function requestBlueTick() {
    setBlueTickBusy(true);
    try {
      await api.post('/profile/blue-tick/request', {});
      toast.success('درخواست تیک آبی ثبت شد و در انتظار تأیید مدیر است.');
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setBlueTickBusy(false);
    }
  }

  async function requestResetCode() {
    setSendingReset(true);
    try {
      const result = await api.post<{
        sent: boolean;
        emailSent?: boolean;
        devCode?: string;
      }>('/auth/password/request-code', { sendToPhone });
      setResetSent(true);
      setResetDevCode(result.devCode ?? null);
      if (result.emailSent && result.sent) {
        toast.success('کد تأیید به ایمیل و پیامک ارسال شد.');
      } else if (result.emailSent) {
        toast.success('کد تأیید به ایمیل ارسال شد.');
      } else if (result.sent) {
        toast.success('کد تأیید با پیامک ارسال شد.');
      } else {
        toast.success('کد تأیید ارسال شد.');
      }
    } catch {
      /* api layer surfaces the error */
    } finally {
      setSendingReset(false);
    }
  }

  async function resetPassword() {
    if (newPassword.length < 8) {
      toast.error('رمز عبور باید حداقل ۸ کاراکتر باشد.');
      return;
    }
    if (newPassword !== newPasswordConfirm) {
      toast.error('تکرار رمز عبور مطابقت ندارد.');
      return;
    }
    if (!resetCode.trim()) {
      toast.error('کد تأیید را وارد کنید.');
      return;
    }
    setResetting(true);
    try {
      await api.post('/auth/password/reset', {
        code: resetCode.trim(),
        password: newPassword,
      });
      toast.success('رمز عبور تغییر کرد. از این پس با رمز جدید وارد شوید.');
      setResetSent(false);
      setResetCode('');
      setNewPassword('');
      setNewPasswordConfirm('');
      setResetDevCode(null);
      await load();
    } catch {
      /* api layer surfaces the error */
    } finally {
      setResetting(false);
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
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-ink">
            پروفایل کاربری
            {profile.verifiedAt ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2 py-0.5 text-[11px] font-bold text-sky-700">
                <BadgeCheck className="size-3.5" aria-hidden />
                تیک آبی
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-muted">مشاهده و درخواست تغییر اطلاعات حساب</p>
        </div>
      </div>

      <div className="indeed-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <IdCard className="size-4 text-brand" aria-hidden />
            مشخصات هویتی
          </h2>
          {profile.profileCompleted ? (
            <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
              تکمیل شده
            </span>
          ) : (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              نیازمند تکمیل
            </span>
          )}
        </div>
        <p className="mt-1 text-xs leading-6 text-muted">
          برای ساخت بیولینک، کارت ویزیت، پست فید، درخواست پله/تبلیغ و خرید
          اشتراک، ابتدا باید دو مرحله‌ی استعلام هویت را کامل کنید. هزینه‌ی هر
          استعلام به‌صورت بدهی در کیف پول ثبت می‌شود.
        </p>
        {profile.identityVerifiedAt ? (
          <div className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
            هویت شما تأیید شده است: <b>{profile.firstName} {profile.lastName}</b>
            {profile.fatherName ? ` — نام پدر: ${profile.fatherName}` : ''}
            {profile.birthDate ? ` — تاریخ تولد: ${profile.birthDate}` : ''}
          </div>
        ) : (
          <>
            {!profile.profileCompleted ? (
              <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
                تا زمانی که این بخش تکمیل نشود، امکان ثبت موارد بالا وجود ندارد.
              </p>
            ) : null}
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-muted">
                کد ملی
                <input
                  className="indeed-input mt-1"
                  dir="ltr"
                  inputMode="numeric"
                  maxLength={10}
                  value={nationalCode}
                  onChange={(event) =>
                    setNationalCode(event.target.value.replace(/\D/g, ''))
                  }
                />
              </label>
              <label className="text-xs font-bold text-muted">
                تاریخ تولد (شمسی)
                <JalaliDatePicker
                  className="mt-1"
                  value={birthIso}
                  onChange={setBirthIso}
                  placeholder="۱۳۷۰/۰۱/۰۱"
                  max={new Date().toISOString().slice(0, 10)}
                />
              </label>
            </div>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void matchPhoneOwnership()}
                disabled={matchingPhone}
                className="indeed-btn indeed-btn-primary"
              >
                <Send className="size-4" aria-hidden />
                {matchingPhone
                  ? 'در حال استعلام شاهکار...'
                  : 'مرحله ۱: تطبیق شاهکار'}
              </button>
              {profile.phoneMatchVerifiedAt ? (
                <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
                  مالکیت شماره تأیید شد
                </span>
              ) : null}
            </div>
            {profile.phoneMatchVerifiedAt ? (
              <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <p className="text-xs leading-6 text-emerald-800">
                  شماره موبایل شما با کد ملی تطبیق داده شد. اکنون می‌توانید
                  استعلام اطلاعات هویتی را انجام دهید.
                </p>
                <button
                  type="button"
                  onClick={() => void runIdentityInquiry()}
                  disabled={inquiryRunning}
                  className="indeed-btn indeed-btn-primary mt-3"
                >
                  <ShieldCheck className="size-4" aria-hidden />
                  {inquiryRunning
                    ? 'در حال استعلام هویت...'
                    : 'مرحله ۲: استعلام و ثبت هویت'}
                </button>
              </div>
            ) : null}
          </>
        )}
        {!profile.identityVerifiedAt && inquiryAvailable === false ? (
          <p className="mt-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs leading-6 text-amber-800">
            استعلام خودکار هویت در حال حاضر توسط مدیر غیرفعال است؛ لطفاً بعداً
            تلاش کنید یا با پشتیبانی تماس بگیرید.
          </p>
        ) : null}
      </div>

      <div className="indeed-panel p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
            <BadgeCheck className="size-4 text-sky-600" aria-hidden />
            تیک آبی (احراز هویت)
          </h2>
          {profile.verifiedAt ? (
            <span className="rounded-full bg-sky-50 px-3 py-1 text-xs font-bold text-sky-700">
              فعال
            </span>
          ) : profile.blueTickRequestedAt ? (
            <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
              در انتظار بررسی
            </span>
          ) : null}
        </div>
        <p className="mt-1 text-xs leading-6 text-muted">
          با تکمیل مشخصات هویتی می‌توانید درخواست تیک آبی ثبت کنید. پیش از ثبت
          درخواست، تطبیق شماره موبایل با کد ملی (شاهکار) به‌صورت خودکار استعلام
          می‌شود و تأیید نهایی با مدیر است.
        </p>
        {profile.phoneMatchVerifiedAt ? (
          <p className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-xs leading-6 text-emerald-800">
            تطبیق شماره موبایل و کد ملی تأیید شده است.
          </p>
        ) : null}
        {profile.blueTickNote ? (
          <p className="mt-3 rounded-lg border border-red-200 bg-red-50 p-3 text-xs leading-6 text-red-700">
            یادداشت مدیر: {profile.blueTickNote}
          </p>
        ) : null}
        {!profile.verifiedAt && !profile.blueTickRequestedAt ? (
          <button
            type="button"
            onClick={() => void requestBlueTick()}
            disabled={blueTickBusy || !profile.profileCompleted}
            className="indeed-btn indeed-btn-secondary mt-4"
          >
            <BadgeCheck className="size-4" aria-hidden />
            {blueTickBusy ? 'در حال استعلام...' : 'درخواست تیک آبی'}
          </button>
        ) : null}
        {!profile.profileCompleted ? (
          <p className="mt-2 text-[11px] text-muted">
            ابتدا مشخصات هویتی بالا را تکمیل کنید.
          </p>
        ) : null}
      </div>

      <div className="indeed-panel overflow-hidden">
        <table className="w-full border-collapse text-sm">
          <tbody>
            <ProfileRow icon={UserRound} label="نام" value={profile.fullName ?? '—'} />
            <ProfileRow
              icon={IdCard}
              label="کد ملی"
              value={profile.nationalCode ?? '—'}
              ltr
            />
            <ProfileRow icon={Mail} label="ایمیل" value={profile.email ?? '—'} ltr />
            <ProfileRow icon={Phone} label="موبایل" value={profile.phone ?? '—'} ltr />
            <ProfileRow
              icon={ShieldCheck}
              label="نقش"
              value={ROLE_LABEL[profile.role] ?? profile.role}
            />
            <ProfileRow
              icon={BadgeCheck}
              label="وضعیت حساب"
              value={profile.isActive ? 'فعال' : 'غیرفعال'}
            />
            <ProfileRow
              icon={IdCard}
              label="تاریخ عضویت"
              value={new Date(profile.createdAt).toLocaleDateString('fa-IR')}
            />
          </tbody>
        </table>
      </div>

      <div className="indeed-panel p-5">
        <h2 className="text-sm font-extrabold text-ink">درخواست تغییر نام</h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          نام جدید پس از تأیید مدیر اعمال می‌شود. تا آن زمان نام فعلی نمایش داده می‌شود.
        </p>

        {pending?.changes.fullName ? (
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

      <ContactChangePanel
        kind="phone"
        pendingValue={pending?.changes.phone}
        onChanged={load}
      />
      <ContactChangePanel
        kind="email"
        pendingValue={pending?.changes.email}
        onChanged={load}
      />

      <div className="indeed-panel p-5">
        <h2 className="flex items-center gap-2 text-sm font-extrabold text-ink">
          <KeyRound className="size-4 text-brand" aria-hidden />
          {profile.hasPassword ? 'تغییر رمز عبور' : 'ثبت رمز عبور'}
        </h2>
        <p className="mt-1 text-xs leading-6 text-muted">
          برای تغییر رمز نیازی به رمز قبلی نیست؛ کد تأیید به ایمیل شما ارسال
          می‌شود و در صورت درخواست، با پیامک هم به شماره‌ی ثبت‌شده می‌آید.
        </p>

        {profile.phone ? (
          <label className="mt-4 flex items-center gap-2 text-xs font-bold text-muted">
            <input
              type="checkbox"
              checked={sendToPhone}
              onChange={(event) => setSendToPhone(event.target.checked)}
              className="size-4 accent-[var(--vintage-accent)]"
            />
            ارسال کد به شماره موبایل هم ({profile.phone})
          </label>
        ) : null}

        <button
          onClick={requestResetCode}
          disabled={sendingReset}
          className="indeed-btn indeed-btn-primary mt-4"
        >
          <Send className="size-4" aria-hidden />
          {sendingReset
            ? 'در حال ارسال...'
            : resetSent
              ? 'ارسال دوباره‌ی کد'
              : 'ارسال کد تأیید'}
        </button>

        {resetDevCode ? (
          <p className="mt-3 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            حالت توسعه: کد شما{' '}
            <span dir="ltr" className="font-bold">{resetDevCode}</span> است.
          </p>
        ) : null}

        {resetSent ? (
          <>
            <label className="mt-4 block text-xs font-bold text-muted">
              کد تأیید
              <input
                inputMode="numeric"
                dir="ltr"
                className="indeed-input mt-1"
                value={resetCode}
                onChange={(event) => setResetCode(event.target.value)}
                placeholder="------"
              />
            </label>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <label className="text-xs font-bold text-muted">
                رمز عبور جدید
                <input
                  type="password"
                  dir="ltr"
                  className="indeed-input mt-1"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>
              <label className="text-xs font-bold text-muted">
                تکرار رمز عبور جدید
                <input
                  type="password"
                  dir="ltr"
                  className="indeed-input mt-1"
                  value={newPasswordConfirm}
                  onChange={(event) => setNewPasswordConfirm(event.target.value)}
                  placeholder="••••••••"
                  autoComplete="new-password"
                />
              </label>
            </div>
            <button
              onClick={resetPassword}
              disabled={resetting}
              className="indeed-btn indeed-btn-primary mt-4"
            >
              <KeyRound className="size-4" aria-hidden />
              {resetting ? 'در حال ثبت...' : 'تغییر رمز'}
            </button>
          </>
        ) : null}
      </div>

      <SessionsPanel />

      <p className="text-xs text-muted">
        نام کاربری ورود:{' '}
        <span dir="ltr" className="font-bold">
          {user?.email ?? user?.phone ?? '—'}
        </span>
      </p>
    </div>
  );
}

function ProfileRow({
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
    <tr className="border-b border-dashed border-[var(--vintage-border)] last:border-b-0">
      <th className="w-40 px-4 py-3 text-right text-xs font-bold text-muted">
        <span className="inline-flex items-center gap-2">
          <Icon className="size-4 text-brand" aria-hidden />
          {label}
        </span>
      </th>
      <td dir={ltr ? 'ltr' : undefined} className="px-4 py-3 font-bold text-ink">
        {value}
      </td>
    </tr>
  );
}
