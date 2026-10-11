'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  CreateTicketDialog,
  MyTicketsList,
  TicketDetail,
} from '@/components/dashboard/UserTickets';
import { useAuth } from '@/lib/auth';

export default function TicketsPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    if (hydrated && !token) {
      router.replace('/login');
    }
  }, [hydrated, token, router]);

  function refresh() {
    setRefreshKey((key) => key + 1);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-extrabold text-ink">تیکت‌های پشتیبانی</h2>
        <p className="text-sm text-muted">
          برای هر مشکل یا درخواست، تیکت ثبت کنید و پاسخ تیم پشتیبانی را ببینید.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[22rem_1fr]">
        <MyTicketsList
          refreshKey={refreshKey}
          onSelect={setSelected}
          onNew={() => setCreating(true)}
        />
        <div>
          {selected ? (
            <TicketDetail
              ticketId={selected}
              onClose={() => setSelected(null)}
              onUpdated={refresh}
            />
          ) : (
            <div className="indeed-panel flex h-full min-h-56 flex-col items-center justify-center gap-3 p-8 text-center">
              <p className="text-sm text-muted">
                برای مشاهده جزئیات و ارسال پاسخ، یک تیکت را از فهرست انتخاب کنید.
              </p>
              <button
                onClick={() => setCreating(true)}
                className="indeed-btn indeed-btn-primary"
              >
                ثبت تیکت جدید
              </button>
            </div>
          )}
        </div>
      </div>

      <CreateTicketDialog
        open={creating}
        onClose={() => setCreating(false)}
        onCreated={refresh}
      />
    </div>
  );
}
