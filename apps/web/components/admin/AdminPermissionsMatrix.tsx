'use client';

import { Fragment, useCallback, useEffect, useState } from 'react';
import { Save, ShieldCheck } from 'lucide-react';

import { api } from '@/lib/api';

type RoleName = 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';

interface SubjectMeta {
  subject: string;
  group: string;
  label: string;
  hint: string;
}

interface Payload {
  matrix: Record<RoleName, Record<string, boolean>>;
  roles: Array<{ role: RoleName; label: string }>;
  subjects: SubjectMeta[];
}

/**
 * Admin grid for the role→permission matrix. Rows are permission subjects
 * grouped by topic, columns are roles; ticking a cell grants that role the
 * subject. ADMIN is shown as always-on (the guard short-circuits for admins).
 */
export function AdminPermissionsMatrix() {
  const [payload, setPayload] = useState<Payload | null>(null);
  const [matrix, setMatrix] = useState<Record<RoleName, Record<string, boolean>> | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await api.get<Payload>('/admin/permissions');
      setPayload(result);
      setMatrix(result.matrix);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری سطوح دسترسی');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  function toggle(role: RoleName, subject: string) {
    if (!matrix || role === 'ADMIN') return;
    setMatrix({
      ...matrix,
      [role]: { ...matrix[role], [subject]: !matrix[role][subject] },
    });
    setMessage(null);
  }

  async function save() {
    if (!matrix) return;
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const result = await api.patch<{ matrix: Record<RoleName, Record<string, boolean>> }>(
        '/admin/permissions',
        { matrix },
      );
      setMatrix(result.matrix);
      setMessage('سطوح دسترسی ذخیره شد.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setBusy(false);
    }
  }

  if (loading || !payload || !matrix) {
    return <div className="indeed-panel p-8 text-center text-sm text-muted">در حال بارگذاری...</div>;
  }

  // group subjects by their topic heading while keeping the original order
  const groups: Array<{ name: string; items: SubjectMeta[] }> = [];
  for (const subject of payload.subjects) {
    const last = groups[groups.length - 1];
    if (last && last.name === subject.group) {
      last.items.push(subject);
    } else {
      groups.push({ name: subject.group, items: [subject] });
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="vintage-avatar flex size-10 items-center justify-center">
            <ShieldCheck className="size-5" aria-hidden />
          </span>
          <div>
            <h3 className="text-sm font-extrabold text-ink">سطوح دسترسی نقش‌ها</h3>
            <p className="text-xs text-muted">
              برای هر نقش تعیین کنید کدام امکانات در دسترس باشد.
            </p>
          </div>
        </div>
        <button onClick={save} disabled={busy} className="indeed-btn indeed-btn-primary py-2 text-sm">
          <Save className="size-4" aria-hidden />
          {busy ? 'در حال ذخیره...' : 'ذخیره'}
        </button>
      </div>

      {error ? <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
      {message ? (
        <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-700">{message}</p>
      ) : null}

      <div className="indeed-panel overflow-x-auto">
        <table className="w-full min-w-[640px] text-right text-sm">
          <thead>
            <tr className="bg-[#fbf3e9] text-xs text-muted">
              <th className="px-4 py-2.5 font-bold">موضوع / دسترسی</th>
              {payload.roles.map((role) => (
                <th key={role.role} className="px-4 py-2.5 text-center font-bold">
                  {role.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {groups.map((group) => (
              <Fragment key={group.name}>
                <tr className="border-t border-[var(--vintage-border)] bg-soft/60">
                  <td colSpan={payload.roles.length + 1} className="px-4 py-2 text-xs font-extrabold text-brand">
                    {group.name}
                  </td>
                </tr>
                {group.items.map((subject) => (
                  <tr key={subject.subject} className="border-t border-[var(--vintage-border)]">
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-ink">{subject.label}</p>
                      <p className="text-[11px] text-muted">{subject.hint}</p>
                    </td>
                    {payload.roles.map((role) => (
                      <td key={role.role} className="px-4 py-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={role.role === 'ADMIN' ? true : Boolean(matrix[role.role][subject.subject])}
                          disabled={role.role === 'ADMIN'}
                          onChange={() => toggle(role.role, subject.subject)}
                          className="size-4 accent-[var(--vintage-accent)]"
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted">
        نقش «مدیر» همیشه به همه‌ی دسترسی‌ها دسترسی دارد و قابل تغییر نیست.
      </p>
    </div>
  );
}
