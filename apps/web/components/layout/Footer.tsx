import { APP_VERSION } from '@/lib/version';

export function Footer() {
  return (
    <footer className="mt-16 border-t border-[var(--indeed-border)] bg-white py-8">
      <div className="container-page flex flex-col items-center justify-between gap-3 text-sm text-muted md:flex-row">
        <p>
          © {new Date().getFullYear()} آلوشمال — بیولینک و کارت ویزیت دیجیتال
          <span dir="ltr" className="ms-2 text-xs font-bold">
            {APP_VERSION}
          </span>
        </p>
        <p>ساخته‌شده با NestJS، Next.js، Prisma و PostgreSQL</p>
      </div>
    </footer>
  );
}
