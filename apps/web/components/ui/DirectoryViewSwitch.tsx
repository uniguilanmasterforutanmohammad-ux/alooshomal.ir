'use client';

import { LayoutGrid, NotebookTabs, Rows3 } from 'lucide-react';

import type { DirectoryView } from '@/lib/directory-view';
import { cn } from '@/lib/utils';

interface Props {
  value: DirectoryView;
  onChange: (view: DirectoryView) => void;
}

/**
 * Toggle between the directory looks: the classic split list, the tiled grid
 * that previews every card in its owner-selected theme, and the «دفترچه تلفن»
 * notebook.
 */
export function DirectoryViewSwitch({ value, onChange }: Props) {
  return (
    <div className="directory-view-switch" role="group" aria-label="حالت نمایش">
      <button
        type="button"
        aria-pressed={value === 'list'}
        onClick={() => onChange('list')}
        className={cn(value === 'list' && 'shadow-sm')}
      >
        <Rows3 className="size-4" aria-hidden />
        لیست
      </button>
      <button
        type="button"
        aria-pressed={value === 'tiles'}
        onClick={() => onChange('tiles')}
        className={cn(value === 'tiles' && 'shadow-sm')}
      >
        <LayoutGrid className="size-4" aria-hidden />
        کاشی
      </button>
      <button
        type="button"
        aria-pressed={value === 'notebook'}
        onClick={() => onChange('notebook')}
        className={cn(value === 'notebook' && 'shadow-sm')}
      >
        <NotebookTabs className="size-4" aria-hidden />
        دفترچه
      </button>
    </div>
  );
}
