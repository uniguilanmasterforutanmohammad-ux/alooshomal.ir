'use client';

import { useEffect, useRef } from 'react';
import {
  Bold,
  Italic,
  Link2,
  List,
  ListOrdered,
  Strikethrough,
  Underline,
} from 'lucide-react';

import { bodyToHtml, isRichTextEmpty, sanitizeHtml } from '@/lib/rich-text';
import { cn } from '@/lib/utils';

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  className?: string;
  ariaLabel?: string;
}

type Command = 'bold' | 'italic' | 'underline' | 'strikeThrough' | 'insertUnorderedList' | 'insertOrderedList';

const TOOLS: Array<{ command: Command; label: string; Icon: typeof Bold }> = [
  { command: 'bold', label: 'درشت', Icon: Bold },
  { command: 'italic', label: 'کج', Icon: Italic },
  { command: 'underline', label: 'زیرخط', Icon: Underline },
  { command: 'strikeThrough', label: 'خط‌خورده', Icon: Strikethrough },
  { command: 'insertUnorderedList', label: 'فهرست نقطه‌ای', Icon: List },
  { command: 'insertOrderedList', label: 'فهرست شماره‌دار', Icon: ListOrdered },
];

/**
 * Tiny dependency-free WYSIWYG editor for feed posts. It is a `contentEditable`
 * surface with a minimal toolbar (bold / italic / underline / strike, bullet &
 * numbered lists and a link) built on `document.execCommand`. The HTML is
 * sanitised on submit and again on render (see `lib/rich-text`), so the editor
 * itself can stay simple.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder,
  className,
  ariaLabel,
}: Props) {
  const ref = useRef<HTMLDivElement>(null);
  const lastValue = useRef<string>('');

  // Reflect external value changes (e.g. when editing another post) without
  // clobbering the caret while the user is typing in this field.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (value === lastValue.current) return;
    if (document.activeElement === el) return;
    el.innerHTML = bodyToHtml(value);
    lastValue.current = value;
  }, [value]);

  function emit() {
    const el = ref.current;
    if (!el) return;
    const html = isRichTextEmpty(el.innerHTML) ? '' : el.innerHTML;
    lastValue.current = html;
    onChange(html);
  }

  function exec(command: Command) {
    ref.current?.focus();
    document.execCommand(command, false);
    emit();
  }

  function addLink() {
    const url = window.prompt('نشانی لینک (https://...)');
    if (!url) return;
    const href = /^(https?:|mailto:|tel:|\/)/i.test(url.trim())
      ? url.trim()
      : `https://${url.trim()}`;
    ref.current?.focus();
    document.execCommand('createLink', false, href);
    emit();
  }

  // HTML pasted from another page can carry event handlers (e.g.
  // `<img onerror>`), which would run in this contentEditable. Intercept the
  // paste and insert only the sanitised allow-list instead.
  function handlePaste(event: React.ClipboardEvent<HTMLDivElement>) {
    const html = event.clipboardData.getData('text/html');
    const text = event.clipboardData.getData('text/plain');
    event.preventDefault();
    const safe = html
      ? sanitizeHtml(html)
      : bodyToHtml(text);
    if (!safe) return;
    document.execCommand('insertHTML', false, safe);
    emit();
  }

  return (
    <div className={cn('rich-editor', className)}>
      <div className="rich-editor-toolbar" role="toolbar" aria-label="ابزارهای قالب‌بندی">
        {TOOLS.map(({ command, label, Icon }) => (
          <button
            key={command}
            type="button"
            title={label}
            aria-label={label}
            onClick={() => exec(command)}
            className="rich-editor-btn"
          >
            <Icon className="size-4" aria-hidden />
          </button>
        ))}
        <button
          type="button"
          title="درج لینک"
          aria-label="درج لینک"
          onClick={addLink}
          className="rich-editor-btn"
        >
          <Link2 className="size-4" aria-hidden />
        </button>
      </div>
      <div
        ref={ref}
        contentEditable
        suppressContentEditableWarning
        role="textbox"
        aria-multiline="true"
        aria-label={ariaLabel ?? 'متن پست'}
        data-placeholder={placeholder}
        onInput={emit}
        onBlur={emit}
        onPaste={handlePaste}
        className="rich-editor-surface"
      />
    </div>
  );
}
