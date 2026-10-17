import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';

/**
 * Placeholder for the «فیدها» section so the header/footer link resolves while
 * the full feed feature is built out.
 */
export default function FeedsPage() {
  return (
    <>
      <Header />
      <main className="container-page py-16">
        <div className="indeed-panel mx-auto max-w-lg p-8 text-center">
          <h1 className="text-xl font-extrabold text-ink">فیدها</h1>
          <p className="mt-2 text-sm text-muted">
            این بخش به‌زودی فعال می‌شود؛ جایی برای انتشار پست و عکس، لایک و ذخیره.
          </p>
        </div>
      </main>
      <Footer />
    </>
  );
}
