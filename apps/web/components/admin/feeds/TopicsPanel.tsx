'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Layers,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';
import type { FeedTopic } from '@/lib/api';

export function TopicsPanel() {
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [name, setName] = useState('');
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setTopics(await api.get<FeedTopic[]>('/admin/feeds/topics'));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در بارگذاری');
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function add(event: React.FormEvent) {
    event.preventDefault();
    if (!name.trim()) return;
    try {
      await api.post('/admin/feeds/topics', { name: name.trim() });
      setName('');
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'افزودن ناموفق بود');
    }
  }

  async function remove(id: string) {
    if (!window.confirm('این موضوع حذف شود؟')) return;
    try {
      await api.delete(`/admin/feeds/topics/${id}`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'حذف ناموفق بود');
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error ? (
        <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>
      ) : null}
      <form onSubmit={add} className="indeed-panel flex items-end gap-3 p-5">
        <label className="flex flex-1 flex-col gap-1 text-xs font-bold text-muted">
          موضوع جدید
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-lg border border-[var(--vintage-border)] bg-white px-3 py-2 text-sm text-ink outline-none focus:border-brand"
          />
        </label>
        <button type="submit" className="indeed-btn indeed-btn-primary py-2 text-sm">
          افزودن
        </button>
      </form>
      <div className="flex flex-wrap gap-2">
        {topics.map((topic) => (
          <span
            key={topic.id}
            className="inline-flex items-center gap-2 rounded-full border border-[var(--vintage-border)] bg-white px-3 py-1.5 text-sm"
          >
            <Layers className="size-3.5 text-brand" aria-hidden />
            {topic.name}
            <button
              onClick={() => remove(topic.id)}
              className="text-red-500 hover:text-red-700"
              aria-label="حذف"
            >
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ))}
      </div>
    </div>
  );
}
