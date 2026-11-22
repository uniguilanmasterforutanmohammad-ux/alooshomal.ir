'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ChevronDown,
  ChevronLeft,
  Loader2,
  Plus,
  Power,
  Search,
  Trash2,
} from 'lucide-react';

import { api } from '@/lib/api';
import { toast } from '@/lib/toast';
import { cn } from '@/lib/utils';

interface TagNode {
  id: string;
  name: string;
  isActive: boolean;
}

interface SubNode extends TagNode {
  tags: TagNode[];
}

interface CategoryNode {
  id: string;
  name: string;
  isActive: boolean;
  subCount: number;
  tagCount: number;
  subs: SubNode[];
  orphanTags: TagNode[];
}

function matches(node: { name: string }, query: string): boolean {
  return node.name.toLowerCase().includes(query.toLowerCase());
}

/**
 * Searchable, collapsible taxonomy tree for «شهرها و کسب‌وکارها». Shows every
 * main category with its زیردسته and زیرشاخه and lets the admin add/rename/
 * disable/delete each level without leaving the page.
 */
export function BusinessTaxonomyTree() {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [busy, setBusy] = useState<string | null>(null);
  const [newCategory, setNewCategory] = useState('');
  const [subDraft, setSubDraft] = useState<Record<string, string>>({});
  const [tagDraft, setTagDraft] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setTree(await api.get<CategoryNode[]>('/admin/businesses/tree'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'بارگذاری درخت ناموفق بود');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim();
    if (!q) return tree;
    return tree
      .map((category) => {
        const subs = category.subs
          .map((sub) => ({
            ...sub,
            tags: sub.tags.filter((tag) => matches(tag, q)),
          }))
          .filter((sub) => matches(sub, q) || sub.tags.length > 0);
        const orphanTags = category.orphanTags.filter((tag) => matches(tag, q));
        if (
          !matches(category, q) &&
          subs.length === 0 &&
          orphanTags.length === 0
        ) {
          return null;
        }
        return { ...category, subs, orphanTags };
      })
      .filter((item): item is CategoryNode => item !== null);
  }, [tree, query]);

  function toggle(id: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function addCategory() {
    if (!newCategory.trim()) return;
    setBusy('category');
    try {
      await api.post('/admin/businesses', { name: newCategory.trim() });
      setNewCategory('');
      toast.success('دسته‌بندی اصلی اضافه شد');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'افزودن دسته ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function addSub(categoryId: string) {
    const name = (subDraft[categoryId] ?? '').trim();
    if (!name) return;
    setBusy(`sub:${categoryId}`);
    try {
      await api.post(`/admin/businesses/${categoryId}/nodes`, {
        name,
        level: 'SUB',
      });
      setSubDraft((current) => ({ ...current, [categoryId]: '' }));
      setExpanded((current) => new Set(current).add(categoryId));
      toast.success('زیردسته اضافه شد');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'افزودن زیردسته ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function addTag(categoryId: string, parentId: string) {
    const name = (tagDraft[parentId] ?? '').trim();
    if (!name) return;
    setBusy(`tag:${parentId}`);
    try {
      await api.post(`/admin/businesses/${categoryId}/nodes`, {
        name,
        level: 'TAG',
        parentId,
      });
      setTagDraft((current) => ({ ...current, [parentId]: '' }));
      toast.success('زیرشاخه اضافه شد');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'افزودن زیرشاخه ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function toggleNode(node: TagNode) {
    setBusy(`node:${node.id}`);
    try {
      await api.patch(`/admin/businesses/nodes/${node.id}`, {
        isActive: !node.isActive,
      });
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'تغییر وضعیت ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function removeNode(node: TagNode) {
    if (!window.confirm(`حذف «${node.name}»؟`)) return;
    setBusy(`node:${node.id}`);
    try {
      await api.delete(`/admin/businesses/nodes/${node.id}`);
      toast.success('حذف شد');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  async function removeCategory(category: CategoryNode) {
    if (
      !window.confirm(
        `حذف دسته‌ی «${category.name}» و همه‌ی زیردسته/زیرشاخه‌های آن؟`,
      )
    ) {
      return;
    }
    setBusy(`category:${category.id}`);
    try {
      await api.delete(`/admin/businesses/${category.id}`);
      toast.success('دسته‌بندی حذف شد');
      await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'حذف دسته ناموفق بود');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="indeed-panel p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-ink">
            درخت دسته‌بندی کسب‌وکارها
          </h3>
          <p className="text-xs leading-6 text-muted">
            دسته‌ی اصلی، زیردسته و زیرشاخه؛ برای دیدن زیرمجموعه‌ها روی هر دسته
            بزنید. جست‌وجو همه‌ی سطوح را فیلتر می‌کند.
          </p>
        </div>
        <span className="rounded-full bg-brand-light px-3 py-1 text-xs font-bold text-brand">
          {tree.length.toLocaleString('fa-IR')} دسته
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <label className="relative min-w-[12rem] flex-1">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-muted"
            aria-hidden
          />
          <input
            className="indeed-input pr-9"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="جست‌وجوی دسته، زیردسته یا زیرشاخه"
          />
        </label>
        <div className="flex flex-1 gap-2">
          <input
            className="indeed-input"
            value={newCategory}
            onChange={(event) => setNewCategory(event.target.value)}
            placeholder="دسته‌ی اصلی جدید"
            maxLength={80}
          />
          <button
            type="button"
            onClick={() => void addCategory()}
            disabled={busy === 'category' || !newCategory.trim()}
            className="indeed-btn indeed-btn-primary shrink-0 py-1.5 text-xs disabled:opacity-40"
          >
            <Plus className="size-4" aria-hidden />
            افزودن
          </button>
        </div>
      </div>

      {loading ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted">
          <Loader2 className="size-4 animate-spin" aria-hidden />
          در حال بارگذاری...
        </p>
      ) : filtered.length === 0 ? (
        <p className="mt-4 text-sm text-muted">موردی یافت نشد.</p>
      ) : (
        <div className="mt-4 flex flex-col gap-2">
          {filtered.map((category) => {
            const open = expanded.has(category.id) || Boolean(query.trim());
            return (
              <div
                key={category.id}
                className="rounded-xl border border-[var(--vintage-border)]"
              >
                <div className="flex items-center justify-between gap-2 px-3 py-2">
                  <button
                    type="button"
                    onClick={() => toggle(category.id)}
                    className="flex min-w-0 flex-1 items-center gap-2 text-right"
                  >
                    {open ? (
                      <ChevronDown className="size-4 shrink-0 text-brand" aria-hidden />
                    ) : (
                      <ChevronLeft className="size-4 shrink-0 text-muted" aria-hidden />
                    )}
                    <span className="truncate text-sm font-extrabold text-ink">
                      {category.name}
                    </span>
                    <span className="shrink-0 text-[10px] text-muted">
                      {category.subCount.toLocaleString('fa-IR')} زیردسته ·{' '}
                      {category.tagCount.toLocaleString('fa-IR')} زیرشاخه
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => void removeCategory(category)}
                    disabled={busy === `category:${category.id}`}
                    className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                    title="حذف دسته"
                  >
                    <Trash2 className="size-3.5" aria-hidden />
                  </button>
                </div>

                {open ? (
                  <div className="border-t border-dashed border-[var(--vintage-border)] p-3">
                    <div className="flex gap-2">
                      <input
                        className="indeed-input py-1 text-xs"
                        value={subDraft[category.id] ?? ''}
                        onChange={(event) =>
                          setSubDraft((current) => ({
                            ...current,
                            [category.id]: event.target.value,
                          }))
                        }
                        placeholder="زیردسته‌ی جدید"
                      />
                      <button
                        type="button"
                        onClick={() => void addSub(category.id)}
                        disabled={busy === `sub:${category.id}`}
                        className="indeed-btn indeed-btn-secondary shrink-0 py-1 text-[11px] disabled:opacity-40"
                      >
                        <Plus className="size-3.5" aria-hidden />
                        زیردسته
                      </button>
                    </div>

                    <div className="mt-2 flex flex-col gap-1.5">
                      {category.subs.map((sub) => (
                        <div
                          key={sub.id}
                          className="rounded-lg bg-[var(--vintage-paper)]/60 p-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span
                              className={cn(
                                'text-xs font-bold',
                                sub.isActive ? 'text-ink' : 'text-muted line-through',
                              )}
                            >
                              {sub.name}
                            </span>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => void toggleNode(sub)}
                                disabled={busy === `node:${sub.id}`}
                                className={cn(
                                  'rounded p-1 disabled:opacity-40',
                                  sub.isActive
                                    ? 'text-emerald-600 hover:bg-emerald-50'
                                    : 'text-muted hover:bg-soft',
                                )}
                                title={sub.isActive ? 'غیرفعال' : 'فعال'}
                              >
                                <Power className="size-3.5" aria-hidden />
                              </button>
                              <button
                                type="button"
                                onClick={() => void removeNode(sub)}
                                disabled={busy === `node:${sub.id}`}
                                className="rounded p-1 text-red-500 hover:bg-red-50 disabled:opacity-40"
                                title="حذف"
                              >
                                <Trash2 className="size-3.5" aria-hidden />
                              </button>
                            </div>
                          </div>

                          <div className="mt-1.5 flex flex-wrap gap-1">
                            {sub.tags.map((tag) => (
                              <span
                                key={tag.id}
                                className={cn(
                                  'flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px]',
                                  tag.isActive
                                    ? 'border-[var(--vintage-border)] text-ink'
                                    : 'border-dashed text-muted line-through',
                                )}
                              >
                                {tag.name}
                                <button
                                  type="button"
                                  onClick={() => void removeNode(tag)}
                                  className="text-red-400 hover:text-red-600"
                                  title="حذف زیرشاخه"
                                >
                                  ×
                                </button>
                              </span>
                            ))}
                          </div>

                          <div className="mt-1.5 flex gap-1.5">
                            <input
                              className="indeed-input py-1 text-[11px]"
                              value={tagDraft[sub.id] ?? ''}
                              onChange={(event) =>
                                setTagDraft((current) => ({
                                  ...current,
                                  [sub.id]: event.target.value,
                                }))
                              }
                              placeholder="زیرشاخه‌ی جدید"
                            />
                            <button
                              type="button"
                              onClick={() => void addTag(category.id, sub.id)}
                              disabled={busy === `tag:${sub.id}`}
                              className="indeed-btn indeed-btn-secondary shrink-0 py-1 text-[10px] disabled:opacity-40"
                            >
                              <Plus className="size-3" aria-hidden />
                              زیرشاخه
                            </button>
                          </div>
                        </div>
                      ))}
                      {category.subs.length === 0 ? (
                        <p className="text-[11px] text-muted">زیردسته‌ای ثبت نشده است.</p>
                      ) : null}
                      {category.orphanTags.length > 0 ? (
                        <div className="mt-1 flex flex-wrap gap-1">
                          {category.orphanTags.map((tag) => (
                            <span
                              key={tag.id}
                              className="rounded-full border border-dashed px-2 py-0.5 text-[10px] text-muted"
                            >
                              {tag.name} (بدون زیردسته)
                            </span>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
