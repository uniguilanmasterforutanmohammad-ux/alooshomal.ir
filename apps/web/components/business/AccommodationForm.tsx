'use client';

import { useState } from 'react';

import type { AccommodationProperty } from '@/lib/api';

export interface AccommodationFormValues {
  title: string;
  description?: string;
  propertyType: string;
  address?: string;
  maxGuests: number;
  bedrooms: number;
  beds: number;
  bathrooms: number;
  basePrice: number;
  depositAmount: number;
  minNights: number;
  checkInTime?: string;
  checkOutTime?: string;
  amenities: string[];
  status: 'DRAFT' | 'PUBLISHED' | 'PAUSED';
}

const PROPERTY_TYPES = [
  { value: 'APARTMENT', label: 'آپارتمان' },
  { value: 'VILLA', label: 'ویلا' },
  { value: 'SUITE', label: 'سوئیت' },
  { value: 'HOUSE', label: 'خانه' },
  { value: 'COTTAGE', label: 'کلبه' },
  { value: 'OTHER', label: 'سایر' },
];

export function AccommodationForm({
  initial,
  submitLabel,
  submitting,
  onSubmit,
}: {
  initial?: Partial<AccommodationProperty>;
  submitLabel: string;
  submitting: boolean;
  onSubmit: (values: AccommodationFormValues) => Promise<void>;
}) {
  const [title, setTitle] = useState(initial?.title ?? '');
  const [description, setDescription] = useState(initial?.description ?? '');
  const [propertyType, setPropertyType] = useState(
    initial?.propertyType ?? 'APARTMENT',
  );
  const [address, setAddress] = useState(initial?.address ?? '');
  const [maxGuests, setMaxGuests] = useState(initial?.maxGuests ?? 2);
  const [bedrooms, setBedrooms] = useState(initial?.bedrooms ?? 1);
  const [beds, setBeds] = useState(initial?.beds ?? 1);
  const [bathrooms, setBathrooms] = useState(initial?.bathrooms ?? 1);
  const [basePrice, setBasePrice] = useState(initial?.basePrice ?? 0);
  const [depositAmount, setDepositAmount] = useState(
    initial?.depositAmount ?? 0,
  );
  const [minNights, setMinNights] = useState(initial?.minNights ?? 1);
  const [checkInTime, setCheckInTime] = useState(initial?.checkInTime ?? '');
  const [checkOutTime, setCheckOutTime] = useState(initial?.checkOutTime ?? '');
  const [amenities, setAmenities] = useState(
    (initial?.amenities ?? []).join('، '),
  );
  const [status, setStatus] = useState<'DRAFT' | 'PUBLISHED' | 'PAUSED'>(
    (initial?.status as 'DRAFT' | 'PUBLISHED' | 'PAUSED') ?? 'DRAFT',
  );

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    await onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      propertyType,
      address: address.trim() || undefined,
      maxGuests,
      bedrooms,
      beds,
      bathrooms,
      basePrice,
      depositAmount,
      minNights,
      checkInTime: checkInTime.trim() || undefined,
      checkOutTime: checkOutTime.trim() || undefined,
      amenities: amenities
        .split(/[،,]/)
        .map((item) => item.trim())
        .filter(Boolean),
      status,
    });
  }

  const field =
    'w-full rounded-lg border border-[var(--vintage-border)] bg-[var(--vintage-surface)] px-3 py-2 text-sm text-ink outline-none focus:border-brand';
  const label = 'mb-1 block text-xs font-bold text-muted';

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div>
        <label className={label}>عنوان اقامتگاه</label>
        <input
          className={field}
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
          minLength={2}
          maxLength={160}
          placeholder="مثلاً ویلای ساحلی نوشهر"
        />
      </div>
      <div>
        <label className={label}>توضیحات</label>
        <textarea
          className={field}
          rows={4}
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="موقعیت، امکانات، قوانین اقامتگاه…"
        />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div>
          <label className={label}>نوع اقامتگاه</label>
          <select
            className={field}
            value={propertyType}
            onChange={(event) => setPropertyType(event.target.value)}
          >
            {PROPERTY_TYPES.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className={label}>وضعیت</label>
          <select
            className={field}
            value={status}
            onChange={(event) =>
              setStatus(event.target.value as 'DRAFT' | 'PUBLISHED' | 'PAUSED')
            }
          >
            <option value="DRAFT">پیش‌نویس</option>
            <option value="PUBLISHED">منتشرشده</option>
            <option value="PAUSED">موقتاً متوقف</option>
          </select>
        </div>
        <div>
          <label className={label}>آدرس</label>
          <input
            className={field}
            value={address}
            onChange={(event) => setAddress(event.target.value)}
            placeholder="شهر، محله، خیابان"
          />
        </div>
        <div>
          <label className={label}>حداکثر مهمان</label>
          <input
            className={field}
            type="number"
            min={1}
            value={maxGuests}
            onChange={(event) => setMaxGuests(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>اتاق خواب</label>
          <input
            className={field}
            type="number"
            min={0}
            value={bedrooms}
            onChange={(event) => setBedrooms(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>تخت</label>
          <input
            className={field}
            type="number"
            min={0}
            value={beds}
            onChange={(event) => setBeds(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>سرویس بهداشتی</label>
          <input
            className={field}
            type="number"
            min={0}
            value={bathrooms}
            onChange={(event) => setBathrooms(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>قیمت هر شب (تومان)</label>
          <input
            className={field}
            type="number"
            min={0}
            value={basePrice}
            onChange={(event) => setBasePrice(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>ودیعه‌ی رزرو (تومان)</label>
          <input
            className={field}
            type="number"
            min={0}
            value={depositAmount}
            onChange={(event) => setDepositAmount(Number(event.target.value))}
          />
          <p className="mt-1 text-[10px] text-muted">
            مهمان برای ثبت رزرو این مبلغ را آنلاین پرداخت می‌کند (۰ = بدون ودیعه).
          </p>
        </div>
        <div>
          <label className={label}>حداقل شب اقامت</label>
          <input
            className={field}
            type="number"
            min={1}
            value={minNights}
            onChange={(event) => setMinNights(Number(event.target.value))}
          />
        </div>
        <div>
          <label className={label}>ساعت ورود</label>
          <input
            className={field}
            value={checkInTime}
            onChange={(event) => setCheckInTime(event.target.value)}
            placeholder="14:00"
          />
        </div>
        <div>
          <label className={label}>ساعت خروج</label>
          <input
            className={field}
            value={checkOutTime}
            onChange={(event) => setCheckOutTime(event.target.value)}
            placeholder="12:00"
          />
        </div>
      </div>
      <div>
        <label className={label}>امکانات (با ویرگول جدا کنید)</label>
        <input
          className={field}
          value={amenities}
          onChange={(event) => setAmenities(event.target.value)}
          placeholder="استخر، پارکینگ، اینترنت، آشپزخانه"
        />
      </div>
      <button
        type="submit"
        disabled={submitting}
        className="indeed-btn indeed-btn-primary self-start disabled:opacity-60"
      >
        {submitting ? 'در حال ذخیره…' : submitLabel}
      </button>
    </form>
  );
}
