import { cn } from '@/lib/utils';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  hint?: string;
}

export function Input({ label, hint, className, id, ...props }: InputProps) {
  return (
    <label className="flex flex-col gap-1.5">
      {label ? <span className="text-sm font-bold text-ink">{label}</span> : null}
      <input id={id} className={cn('indeed-input', className)} {...props} />
      {hint ? <span className="text-xs text-muted">{hint}</span> : null}
    </label>
  );
}
