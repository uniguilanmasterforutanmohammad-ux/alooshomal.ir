'use client';

import { useState } from 'react';
import {
  Upload,
} from 'lucide-react';
import { api } from '@/lib/api';
import { INPUT, errorText, Panel, Banner, Field } from './shared';

export function UploadTab() {
  const [kind, setKind] = useState('ProfilePic');
  const [file, setFile] = useState<File | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function upload() {
    if (!file) {
      setError('ابتدا یک فایل انتخاب کنید.');
      return;
    }
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const body = new FormData();
      body.append('file', file);
      setResult(
        await api.upload<unknown>(`/admin/payping/uploads/${kind}`, body),
      );
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <Panel title="آپلود فایل روی پی‌پینگ">
        <div className="grid gap-3 md:grid-cols-3">
          <Field label="نوع فایل">
            <select
              value={kind}
              onChange={(event) => setKind(event.target.value)}
              className={INPUT}
            >
              <option value="ProfilePic">تصویر پروفایل مشتری</option>
              <option value="Item">تصویر آیتم مالی</option>
              <option value="InvoiceAttachment">ضمیمه‌ی فاکتور</option>
            </select>
          </Field>
          <Field label="فایل">
            <input
              type="file"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              className={INPUT}
            />
          </Field>
        </div>
        <button
          onClick={() => void upload()}
          disabled={busy}
          className="indeed-btn indeed-btn-primary mt-4 py-2 text-sm disabled:opacity-60"
        >
          <Upload className="size-4" aria-hidden />
          آپلود
        </button>
      </Panel>

      {error ? <Banner kind="error">{error}</Banner> : null}

      {result ? (
        <Panel title="نتیجه">
          <pre
            dir="ltr"
            className="max-h-72 overflow-auto rounded-lg bg-[var(--vintage-surface)] p-3 text-left text-xs text-ink"
          >
            {JSON.stringify(result, null, 2)}
          </pre>
        </Panel>
      ) : null}
    </div>
  );
}
