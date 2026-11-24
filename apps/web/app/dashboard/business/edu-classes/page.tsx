'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';

import { BusinessPanelNav } from '@/components/business/BusinessPanelNav';
import { api, type EduClass } from '@/lib/api';
import { useAuth } from '@/lib/auth';
import { useBusinessWorkspace } from '@/lib/business-modules';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

const field =
  'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';

const DISCIPLINES: Record<string, string> = { SPORT: 'ورزشی', ART: 'هنری', MUSIC: 'موسیقی', OTHER: 'سایر' };
const MODES: Record<string, string> = { PRIVATE: 'خصوصی', SEMI_PRIVATE: 'نیمه‌خصوصی', GROUP: 'گروهی' };
const DELIVERIES: Record<string, string> = { IN_PERSON: 'حضوری', ONLINE: 'آنلاین', HYBRID: 'ترکیبی' };

const money = (value: number) => `${value.toLocaleString('fa-IR')} تومان`;

const emptyForm = {
  title: '',
  discipline: 'SPORT',
  mode: 'GROUP',
  delivery: 'IN_PERSON',
  capacity: '10',
  durationMin: '60',
  price: '',
  sessionsPerPackage: '8',
  coachName: '',
};

export default function EduClassesPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const enabled = hydrated && Boolean(token);
  const { workspace } = useBusinessWorkspace(enabled);
  const [classes, setClasses] = useState<EduClass[]>([]);
  const [form, setForm] = useState(emptyForm);

  const load = useCallback(async () => {
    setClasses(await api.get<EduClass[]>('/edu-classes'));
  }, []);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login?next=/dashboard/business/edu-classes');
      return;
    }
    if (enabled) void load();
  }, [hydrated, token, router, enabled, load]);

  async function create(event: React.FormEvent) {
    event.preventDefault();
    if (!form.title.trim()) return;
    await api.post('/edu-classes', {
      title: form.title.trim(),
      discipline: form.discipline,
      mode: form.mode,
      delivery: form.delivery,
      capacity: Number(form.capacity) || 10,
      durationMin: Number(form.durationMin) || 60,
      price: form.price ? Number(form.price) : undefined,
      sessionsPerPackage: Number(form.sessionsPerPackage) || 8,
      coachName: form.coachName.trim() || undefined,
    });
    setForm(emptyForm);
    await load();
    toast.success('کلاس ثبت شد');
  }

  async function setStatus(klass: EduClass, status: string) {
    await api.patch(`/edu-classes/${klass.id}`, { status });
    await load();
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">کلاس‌ها و خدمات آموزشی</h1>
        <p className="mt-1 text-sm text-muted">
          تعریف کلاس خصوصی/نیمه‌خصوصی/گروهی، ظرفیت، مدت جلسه و بسته‌ی جلسات.
        </p>
      </div>

      {workspace ? <BusinessPanelNav modules={workspace.modules} /> : null}

      <form onSubmit={create} className="indeed-panel grid gap-2 p-4 md:grid-cols-4">
        <input className={`${field} md:col-span-2`} placeholder="عنوان کلاس" value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} required />
        <select className={field} value={form.discipline} onChange={(e) => setForm((p) => ({ ...p, discipline: e.target.value }))}>
          {Object.entries(DISCIPLINES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={field} value={form.mode} onChange={(e) => setForm((p) => ({ ...p, mode: e.target.value }))}>
          {Object.entries(MODES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <select className={field} value={form.delivery} onChange={(e) => setForm((p) => ({ ...p, delivery: e.target.value }))}>
          {Object.entries(DELIVERIES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <input className={field} placeholder="ظرفیت" inputMode="numeric" value={form.capacity} onChange={(e) => setForm((p) => ({ ...p, capacity: e.target.value }))} />
        <input className={field} placeholder="مدت جلسه (دقیقه)" inputMode="numeric" value={form.durationMin} onChange={(e) => setForm((p) => ({ ...p, durationMin: e.target.value }))} />
        <input className={field} placeholder="تعداد جلسه‌ی بسته" inputMode="numeric" value={form.sessionsPerPackage} onChange={(e) => setForm((p) => ({ ...p, sessionsPerPackage: e.target.value }))} />
        <input className={field} placeholder="شهریه‌ی بسته" inputMode="numeric" value={form.price} onChange={(e) => setForm((p) => ({ ...p, price: e.target.value }))} />
        <input className={field} placeholder="نام مربی" value={form.coachName} onChange={(e) => setForm((p) => ({ ...p, coachName: e.target.value }))} />
        <button type="submit" className="indeed-btn indeed-btn-primary"><Plus className="size-4" aria-hidden /> ثبت کلاس</button>
      </form>

      <div className="grid gap-3 md:grid-cols-2">
        {classes.map((klass) => (
          <article key={klass.id} className="indeed-panel flex flex-col gap-2 p-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="text-sm font-extrabold text-ink">{klass.title}</h3>
                <p className="text-[11px] text-muted">
                  {DISCIPLINES[klass.discipline] ?? klass.discipline} • {MODES[klass.mode] ?? klass.mode} • {DELIVERIES[klass.delivery] ?? klass.delivery}
                  {klass.coachName ? ` • مربی: ${klass.coachName}` : ''}
                </p>
              </div>
              <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold', klass.status === 'ACTIVE' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                {klass.status === 'ACTIVE' ? 'فعال' : 'بایگانی'}
              </span>
            </div>
            <p className="text-xs text-ink">
              ظرفیت {klass.capacity} • {klass.durationMin} دقیقه • بسته {klass.sessionsPerPackage} جلسه • {money(klass.price)}
            </p>
            <div className="flex items-center gap-2">
              <select className={field} value={klass.status} onChange={(e) => void setStatus(klass, e.target.value)}>
                <option value="ACTIVE">فعال</option>
                <option value="ARCHIVED">بایگانی</option>
              </select>
            </div>
          </article>
        ))}
        {classes.length === 0 ? <div className="indeed-panel p-8 text-center text-sm text-muted md:col-span-2">کلاسی ثبت نشده است.</div> : null}
      </div>
    </div>
  );
}
