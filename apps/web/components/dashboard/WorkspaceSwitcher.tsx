'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown, Plus } from 'lucide-react';

import { api, WORKSPACE_STORAGE_KEY } from '@/lib/api';
import type { BusinessWorkspaceSummary } from '@/lib/api/types/business-modules';
import { useAuth } from '@/lib/auth';
import { useFeatures } from '@/lib/features';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

export const WORKSPACE_CHANGED_EVENT = 'alooshomal:workspace-changed';

/**
 * Top-right workspace switcher. Every business-scoped API reads the selected
 * id from localStorage (`x-workspace-id`), so switching here changes the whole
 * business panel without a page reload.
 */
export function WorkspaceSwitcher() {
  const { token, hydrated } = useAuth();
  const { isFeatureVisible } = useFeatures();
  const [items, setItems] = useState<BusinessWorkspaceSummary[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);
  const enabled = hydrated && Boolean(token) && isFeatureVisible('featureBusinessWorkspace');

  /**
   * Loads the owner's workspaces and reconciles the stored selection with the
   * server list. A deleted/stale id falls back to the default workspace and is
   * written back so every subsequent request uses the right one.
   */
  const loadWorkspaces = useCallback(async () => {
    if (!enabled) return;
    const list = await api.get<BusinessWorkspaceSummary[]>(
      '/business-modules/workspaces',
    );
    setItems(list);
    const stored =
      typeof window !== 'undefined'
        ? window.localStorage.getItem(WORKSPACE_STORAGE_KEY)
        : null;
    const valid = list.find((item) => item.id === stored);
    const fallback = list.find((item) => item.isDefault) ?? list[0] ?? null;
    const next = valid ?? fallback;
    if (next) {
      setActiveId(next.id);
      if (next.id !== stored && typeof window !== 'undefined') {
        window.localStorage.setItem(WORKSPACE_STORAGE_KEY, next.id);
      }
    }
  }, [enabled]);

  useEffect(() => {
    void loadWorkspaces().catch(() => undefined);
  }, [loadWorkspaces]);

  // A workspace created or deleted elsewhere (e.g. the delete button inside
  // the business panel) fires this event; refresh the list so a removed
  // workspace disappears from the switcher too.
  useEffect(() => {
    function onChanged() {
      void loadWorkspaces().catch(() => undefined);
    }
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, onChanged);
  }, [loadWorkspaces]);

  useEffect(() => {
    function onClick(event: MouseEvent) {
      if (boxRef.current && !boxRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  function switchTo(id: string) {
    setActiveId(id);
    setOpen(false);
    if (typeof window !== 'undefined') {
      window.localStorage.setItem(WORKSPACE_STORAGE_KEY, id);
      window.dispatchEvent(new Event(WORKSPACE_CHANGED_EVENT));
    }
  }

  async function createWorkspace() {
    const name = window.prompt('نام کسب‌وکار جدید:');
    if (!name?.trim()) return;
    setBusy(true);
    try {
      const list = await api.post<BusinessWorkspaceSummary[]>(
        '/business-modules/workspaces',
        { name: name.trim() },
      );
      setItems(list);
      const created = list.find((item) => item.name === name.trim());
      if (created) switchTo(created.id);
      toast.success('کسب‌وکار جدید ساخته شد');
    } catch {
      // The API surfaces the plan-limit message as a toast already.
    } finally {
      setBusy(false);
    }
  }

  if (!enabled || items.length === 0) return null;
  const active = items.find((item) => item.id === activeId) ?? items[0];

  return (
    <div ref={boxRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-right transition hover:border-brand"
      >
        <Building2 className="size-4 text-brand" aria-hidden />
        <span className="max-w-[9rem] truncate text-xs font-bold text-ink">
          {active?.name ?? 'کسب‌وکار من'}
        </span>
        <ChevronDown className="size-3.5 text-muted" aria-hidden />
      </button>
      {open ? (
        <div className="absolute left-0 z-50 mt-2 w-64 rounded-xl border border-[var(--vintage-border)] bg-[var(--vintage-surface)] p-2 shadow-xl">
          <p className="px-2 pb-1 text-[10px] font-bold text-muted">
            کسب‌وکارهای من
          </p>
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => switchTo(item.id)}
              className={cn(
                'flex w-full items-center justify-between gap-2 rounded-lg px-2 py-2 text-right text-xs transition',
                item.id === activeId
                  ? 'bg-brand-light text-brand'
                  : 'text-ink hover:bg-[var(--vintage-paper)]',
              )}
            >
              <span className="flex flex-col">
                <span className="font-bold">{item.name}</span>
                <span className="text-[10px] text-muted">
                  {item.industryLabel} · {item.enabledModules} ماژول فعال
                </span>
              </span>
              {item.id === activeId ? (
                <Check className="size-4 shrink-0" aria-hidden />
              ) : null}
            </button>
          ))}
          <button
            type="button"
            onClick={() => void createWorkspace()}
            disabled={busy}
            className="mt-1 flex w-full items-center gap-2 rounded-lg border border-dashed border-[var(--vintage-border)] px-2 py-2 text-xs font-bold text-brand disabled:opacity-50"
          >
            <Plus className="size-3.5" aria-hidden />
            افزودن کسب‌وکار
          </button>
        </div>
      ) : null}
    </div>
  );
}
