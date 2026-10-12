'use client';

import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';

import type { NewsCategory } from '@/lib/api';

export interface PulseFilterState {
  q: string;
  categoryId: string;
}

interface Props {
  value: PulseFilterState;
  categories: NewsCategory[];
  onChange: (next: PulseFilterState) => void;
  onReset: () => void;
}

export function PulseFilters({ value, categories, onChange, onReset }: Props) {
  const [draft, setDraft] = useState<PulseFilterState>(value);

  useEffect(() => {
    setDraft(value);
  }, [value]);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    onChange(draft);
  }

  return (
    <form
      className="flex flex-wrap overflow-hidden rounded-lg border border-[var(--indeed-border)] bg-white shadow-sm"
      onSubmit={submit}
    >
      <div className="relative flex flex-1 items-center border-e border-[var(--indeed-border)]">
        <Search className="pointer-events-none absolute end-3 size-4 text-muted" aria-hidden />
        <input
          className="h-12 w-full bg-transparent px-4 pe-10 text-sm outline-none"
          placeholder="جست‌وجو در عنوان و متن خبر"
          value={draft.q}
          onChange={(event) => setDraft({ ...draft, q: event.target.value })}
        />
      </div>

      <div className="relative flex min-w-44 items-center border-e border-[var(--indeed-border)]">
        <select
          className="h-12 w-full appearance-none bg-transparent px-4 text-sm outline-none"
          value={draft.categoryId}
          onChange={(event) => setDraft({ ...draft, categoryId: event.target.value })}
        >
          <option value="">همه دسته‌بندی‌ها</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <button type="submit" className="indeed-btn indeed-btn-primary rounded-none px-6">
        جستجو
      </button>
      <button
        type="button"
        onClick={onReset}
        className="indeed-btn indeed-btn-secondary rounded-none border-0 px-5"
      >
        پاک‌کردن
      </button>
    </form>
  );
}
