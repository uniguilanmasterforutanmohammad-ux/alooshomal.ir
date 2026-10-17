'use client';

import { useEffect, useState } from 'react';
import { Link2 } from 'lucide-react';

import { api } from '@/lib/api';

export interface LinkableOption {
  id: string;
  slug: string;
  fullName: string;
  status: string;
  linkedBiolinkId?: string | null;
  linkedBusinessCardId?: string | null;
  selectable: boolean;
}

interface Props {
  /** Which counterpart to offer: the other side of the link. */
  kind: 'biolink' | 'business-card';
  /** Currently selected id (`''` = no link). */
  value: string;
  onChange: (value: string) => void;
  /**
   * When editing, the id of the item being edited (the current item). The
   * option already linked to it stays selectable; options linked elsewhere are
   * disabled because the relation is one-to-one.
   */
  currentId?: string;
}

/**
 * One-to-one link picker shared by the biolink and business-card forms. Fetches
 * the signed-in user's own items of the opposite kind and lets them attach (or
 * detach) exactly one counterpart. Items already linked to another counterpart
 * are shown but disabled, so the user never picks a link that would break the
 * other side.
 */
export function LinkSelector({ kind, value, onChange, currentId }: Props) {
  const [options, setOptions] = useState<LinkableOption[]>([]);
  const [loading, setLoading] = useState(true);

  const isBiolink = kind === 'biolink';
  const path = isBiolink
    ? '/biolinks/linkable/business-cards'
    : '/business-cards/linkable/biolinks';
  const label = isBiolink ? 'کارت ویزیت' : 'بیولینک';
  const placeholder = isBiolink
    ? 'بدون اتصال به کارت ویزیت'
    : 'بدون اتصال به بیولینک';

  useEffect(() => {
    let active = true;
    setLoading(true);
    const query = currentId
      ? `?currentId=${encodeURIComponent(currentId)}`
      : '';
    api
      .get<LinkableOption[]>(`${path}${query}`)
      .then((rows) => {
        if (active) setOptions(rows);
      })
      .catch(() => {
        if (active) setOptions([]);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [path, currentId]);

  return (
    <label className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1.5 text-sm font-bold text-ink">
        <Link2 className="size-4 text-brand" aria-hidden />
        اتصال به {label}
      </span>
      <select
        className="indeed-input"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={loading}
      >
        <option value="">{placeholder}</option>
        {options.map((option) => (
          <option
            key={option.id}
            value={option.id}
            disabled={!option.selectable}
          >
            {option.fullName} ({option.slug})
            {option.selectable ? '' : ' — قبلاً متصل شده'}
          </option>
        ))}
      </select>
      <span className="text-xs text-muted">
        {loading
          ? 'در حال بارگذاری...'
          : options.length === 0
            ? `هنوز ${label}ی برای اتصال ندارید؛ ابتدا آن را بسازید.`
            : `می‌توانید این ${isBiolink ? 'بیولینک' : 'کارت ویزیت'} را به یکی از ${label}های خود متصل کنید.`}
      </span>
    </label>
  );
}
