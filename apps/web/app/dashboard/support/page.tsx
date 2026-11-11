'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Headset } from 'lucide-react';

import { SupportChatHistory } from '@/components/support/SupportChatHistory';
import { SupportChatPanel } from '@/components/support/SupportChatPanel';
import type { SupportConversation } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function SupportPage() {
  const router = useRouter();
  const { token, hydrated } = useAuth();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [fresh, setFresh] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const selectedRef = useRef<string | null>(null);

  useEffect(() => {
    if (hydrated && !token) router.replace('/login');
  }, [hydrated, token, router]);

  const handleConversationChange = useCallback(
    (conversation: SupportConversation | null) => {
      const next = conversation?.id ?? null;
      if (selectedRef.current !== next) {
        selectedRef.current = next;
        setSelectedId(next);
        setRefreshKey((key) => key + 1);
      }
      if (conversation) setFresh(false);
    },
    [],
  );

  function select(id: string | null) {
    selectedRef.current = id;
    setSelectedId(id);
    setFresh(id === null);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="flex items-center gap-2 text-xl font-extrabold text-ink">
          <Headset className="size-5 text-brand" aria-hidden />
          پشتیبانی آنلاین
        </h2>
        <p className="text-sm text-muted">
          گفتگوی زنده با واحد پشتیبانی؛ پیام‌ها همان لحظه برای هر دو طرف نمایش
          داده می‌شوند. سابقه‌ی همه‌ی گفتگوها در ستون کنار نگه داشته می‌شود.
        </p>
      </div>

      <div className="grid gap-5 lg:grid-cols-[20rem_1fr]">
        <SupportChatHistory
          selectedId={selectedId}
          onSelect={select}
          refreshKey={refreshKey}
        />
        <div className="indeed-panel flex min-h-[34rem] flex-col overflow-hidden">
          <SupportChatPanel
            variant="page"
            conversationId={selectedId}
            fresh={fresh}
            onConversationChange={handleConversationChange}
          />
        </div>
      </div>
    </div>
  );
}
