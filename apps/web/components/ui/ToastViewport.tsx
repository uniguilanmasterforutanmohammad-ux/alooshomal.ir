'use client';

import { useEffect } from 'react';
import { AlertTriangle, CheckCircle2, Info, X, XCircle } from 'lucide-react';

import { useToastStore, type Toast, type ToastTone } from '@/lib/toast';
import { cn } from '@/lib/utils';

const TONE: Record<
  ToastTone,
  { wrap: string; iconWrap: string; Icon: typeof Info }
> = {
  error: {
    wrap: 'border-red-200 bg-red-50 text-red-800',
    iconWrap: 'bg-red-100 text-red-600',
    Icon: XCircle,
  },
  warning: {
    wrap: 'border-amber-200 bg-amber-50 text-amber-900',
    iconWrap: 'bg-amber-100 text-amber-600',
    Icon: AlertTriangle,
  },
  success: {
    wrap: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    iconWrap: 'bg-emerald-100 text-emerald-600',
    Icon: CheckCircle2,
  },
  info: {
    wrap: 'border-sky-200 bg-sky-50 text-sky-800',
    iconWrap: 'bg-sky-100 text-sky-600',
    Icon: Info,
  },
};

function ToastCard({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((state) => state.dismiss);
  const { wrap, iconWrap, Icon } = TONE[toast.tone];

  useEffect(() => {
    const timer = setTimeout(() => dismiss(toast.id), toast.duration);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, dismiss]);

  return (
    <div
      role={toast.tone === 'error' || toast.tone === 'warning' ? 'alert' : 'status'}
      className={cn(
        'pointer-events-auto flex w-80 max-w-[calc(100vw-2rem)] items-start gap-3 rounded-xl border p-3.5 shadow-xl shadow-black/5',
        'animate-[toast-in_180ms_ease-out]',
        wrap,
      )}
    >
      <span
        className={cn('flex size-8 shrink-0 items-center justify-center rounded-lg', iconWrap)}
      >
        <Icon className="size-4.5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 text-sm">
        {toast.title ? <p className="font-extrabold">{toast.title}</p> : null}
        <p className={cn('break-words', toast.title ? 'mt-0.5' : 'font-bold')}>
          {toast.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => dismiss(toast.id)}
        aria-label="بستن"
        className="shrink-0 rounded-md p-1 text-current/70 transition hover:bg-black/5 hover:text-current"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}

/**
 * Bottom-start stack of dismissible message bubbles. Mounted once at the app
 * root so any page (and the shared `api` layer) can surface a message.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  if (toasts.length === 0) return null;

  return (
    <div className="pointer-events-none fixed bottom-4 start-4 z-[100] flex flex-col gap-2">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </div>
  );
}
