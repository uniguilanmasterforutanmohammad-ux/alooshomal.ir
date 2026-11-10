import Image from 'next/image';
import { ImageOff } from 'lucide-react';

interface Props {
  images?: string[];
  name: string;
}

/** Public photo gallery of a business; opens the full image in a new tab. */
export function BusinessGallery({ images = [], name }: Props) {
  if (images.length === 0) {
    return (
      <div className="biz-gallery-empty">
        <ImageOff className="size-7 text-[var(--vintage-border)]" aria-hidden />
        <p className="text-sm text-muted">تصویری از این کسب‌وکار ثبت نشده است.</p>
      </div>
    );
  }

  return (
    <ul className="biz-gallery">
      {images.map((src, index) => (
        <li key={`${src}-${index}`}>
          <a href={src} target="_blank" rel="noreferrer" className="biz-gallery-item">
            <Image
              src={src}
              alt={`${name} — تصویر ${index + 1}`}
              fill
              sizes="(max-width: 640px) 45vw, 220px"
              className="object-cover"
              unoptimized
            />
          </a>
        </li>
      ))}
    </ul>
  );
}
