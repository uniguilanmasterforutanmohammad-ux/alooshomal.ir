/**
 * Upload categories. Each category maps to its own top-level folder inside the
 * storage bucket, so media stays organised and a future move to a dedicated
 * media server is a straight copy of the bucket.
 *
 * Adding a new kind of asset (e.g. news images, gallery) is just a new entry
 * here — the storage layout `<folder>/<ownerId>/<uuid>.webp` stays the same.
 */
export interface UploadCategory {
  /** folder name inside the bucket */
  folder: string;
  /** max output width in px (aspect ratio is preserved) */
  maxWidth: number;
  /** max output height in px (aspect ratio is preserved) */
  maxHeight: number;
  /** target width for square cover crops (avatars) */
  cover?: number;
  /** Persian label, useful for messages */
  label: string;
}

export type UploadCategoryKey =
  | 'logo'
  | 'avatar'
  | 'feed'
  | 'gallery'
  | 'document';

export const UPLOAD_CATEGORIES: Record<UploadCategoryKey, UploadCategory> = {
  logo: { folder: 'logos', maxWidth: 512, maxHeight: 512, label: 'لوگو' },
  avatar: {
    folder: 'avatars',
    maxWidth: 400,
    maxHeight: 400,
    cover: 400,
    label: 'تصویر پروفایل',
  },
  feed: { folder: 'feeds', maxWidth: 1080, maxHeight: 1350, label: 'تصویر فید' },
  gallery: {
    folder: 'gallery',
    maxWidth: 1600,
    maxHeight: 1600,
    label: 'تصویر گالری',
  },
  // Raw files (PDF / images) kept as-is for the blue-tick review; they are not
  // re-encoded, so the width/height fields are unused.
  document: {
    folder: 'documents',
    maxWidth: 0,
    maxHeight: 0,
    label: 'مدارک',
  },
};

export const MAX_UPLOAD_BYTES = 2 * 1024 * 1024; // 2 MB
/** Documents (business licence, etc.) may be a bit larger. */
export const MAX_DOCUMENT_BYTES = 5 * 1024 * 1024; // 5 MB
/** Absolute ceiling for feed images; the admin setting picks a value below it. */
export const MAX_FEED_UPLOAD_BYTES = 20 * 1024 * 1024; // 20 MB
export const ALLOWED_IMAGE_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
];

export const ALLOWED_DOCUMENT_MIME = [
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
];
