'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BadgeCheck,
  BarChart3,
  Boxes,
  Building2,
  CalendarCheck,
  CreditCard,
  FileSignature,
  Globe,
  GraduationCap,
  House,
  IdCard,
  ImagePlus,
  LayoutDashboard,
  PackageCheck,
  ReceiptText,
  Settings,
  ShoppingBag,
  Users,
  Wallet,
  Wrench,
  type LucideIcon,
} from 'lucide-react';

import type { ResolvedBusinessModule } from '@/lib/api';
import { cn } from '@/lib/utils';

const ICONS: Record<string, LucideIcon> = {
  BadgeCheck,
  IdCard,
  ImagePlus,
  House,
  CalendarCheck,
  Globe,
  Users,
  LayoutDashboard,
  ShoppingBag,
  PackageCheck,
  Boxes,
  CreditCard,
  BarChart3,
  Building2,
  ReceiptText,
  Wallet,
  Wrench,
  FileSignature,
  GraduationCap,
};

export function moduleIcon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutDashboard;
}

/**
 * Tabs inside the business panel. Only enabled modules with a dashboard route
 * are rendered, so turning a module off also removes its navigation entry.
 */
export function BusinessPanelNav({
  modules,
}: {
  modules: ResolvedBusinessModule[];
}) {
  const pathname = usePathname();
  const items = modules
    .filter((item) => item.enabled && item.nav)
    .map((item) => ({
      href: item.nav!.href,
      label: item.nav!.label,
      icon: moduleIcon(item.nav!.icon),
    }));

  return (
    <nav className="flex flex-wrap items-center gap-2">
      {items.map((item) => {
        const active =
          pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <Link
            key={item.href}
            href={item.href}
            prefetch={false}
            className={cn(
              'inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-sm font-semibold transition',
              active
                ? 'border-brand bg-brand-light text-brand'
                : 'border-[var(--vintage-border)] bg-[var(--vintage-surface)] text-muted hover:text-ink',
            )}
          >
            <item.icon className="size-4" aria-hidden />
            {item.label}
          </Link>
        );
      })}
      <Link
        href="/dashboard/business/overview"
        prefetch={false}
        className="ms-auto inline-flex items-center gap-1.5 rounded-lg px-2.5 py-2 text-xs font-bold text-muted transition hover:text-brand"
      >
        <Settings className="size-4" aria-hidden />
        مدیریت کسب‌وکار
      </Link>
    </nav>
  );
}
