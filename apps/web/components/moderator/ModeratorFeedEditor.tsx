'use client';

import { useEffect, useState } from 'react';
import { Save, X } from 'lucide-react';

import { api, type FeedPost, type FeedTopic } from '@/lib/api';
import { toast } from '@/lib/toast';

interface Props {
  feedPostId: string;
  onClose: () => void;
  onChanged: () => void;
}

/**
 * Minimal moderator editor for a feed post: tweak the caption and topic in
 * place, then save. Approve/reject live on the card itself. Images are shown
 * read-only so a reviewer can confirm the visual without re-uploading.
 */
export function ModeratorFeedEditor({ feedPostId, onClose, onChanged }: Props) {
  const [post, setPost] = useState<FeedPost | null>(null);
  const [topics, setTopics] = useState<FeedTopic[]>([]);
  const [body, setBody] = useState('');
  const [topicId, setTopicId] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<FeedPost>(`/moderator/item/FEED/${feedPostId}`),
      api.get<FeedTopic[]>('/moderator/topics').catch(() => []),
    ])
      .then(([data, topicList]) => {
        setPost(data);
        setBody(data.body ?? '');
        setTopicId(data.topicId ?? '');
        setTopics(topicList);
      })
      .catch((err) =>
        toast.error(err instanceof Error ? err.message : 'خطا در بارگذاری پست'),
      )
      .finally(() => setLoading(false));
  }, [feedPostId]);

  async function save() {
    setSaving(true);
    try {
      await api.patch(`/moderator/item/FEED/${feedPostId}`, {
        body: body.trim(),
        topicId: topicId || null,
      });
      toast.success('پست ذخیره شد.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'ذخیره ناموفق بود');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="indeed-panel p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-extrabold text-ink">ویرایش پست فید</h3>
        <button onClick={onClose} className="text-muted hover:text-ink" aria-label="بستن">
          <X className="size-4" />
        </button>
      </div>

      {loading || !post ? (
        <p className="py-8 text-center text-sm text-muted">در حال بارگذاری...</p>
      ) : (
        <div className="mt-4 grid gap-4">
          {post.images?.length ? (
            <div className="flex gap-2 overflow-x-auto">
              {post.images.map((src) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={src}
                  src={src}
                  alt=""
                  className="size-24 shrink-0 rounded-lg border border-[var(--vintage-border)] object-cover"
                />
              ))}
            </div>
          ) : null}

          <label className="text-xs font-bold text-muted">
            متن پست
            <textarea
              className="indeed-input mt-1 min-h-28"
              value={body}
              onChange={(event) => setBody(event.target.value)}
            />
          </label>

          <label className="text-xs font-bold text-muted">
            موضوع
            <select
              className="indeed-input mt-1"
              value={topicId}
              onChange={(event) => setTopicId(event.target.value)}
            >
              <option value="">بدون موضوع</option>
              {topics.map((topic) => (
                <option key={topic.id} value={topic.id}>
                  {topic.name}
                </option>
              ))}
            </select>
          </label>

          <button onClick={save} disabled={saving} className="indeed-btn indeed-btn-primary">
            <Save className="size-4" aria-hidden />
            {saving ? 'در حال ذخیره...' : 'ذخیره تغییرات'}
          </button>
        </div>
      )}
    </div>
  );
}
