/**
 * Nightly pricing for a stay.
 *
 * Each night uses the most specific matching rate (narrowest date range, then
 * day type) and falls back to the property's `basePrice`. Cleaning and extra
 * guest fees are added once/per-night, and a long-stay percentage discount is
 * applied to the nightly subtotal.
 */

export interface PricingRate {
  startDate: Date;
  endDate: Date;
  dayType: string;
  price: number;
  minNights: number | null;
}

export interface PricingProperty {
  basePrice: number;
  cleaningFee: number;
  extraGuestFee: number;
  baseGuests: number;
  longStayDiscountPercent: number;
  longStayMinNights: number;
  currency: string;
}

export interface PriceQuote {
  nights: number;
  nightly: Array<{ date: string; price: number }>;
  subtotal: number;
  discount: number;
  cleaningFee: number;
  extraGuestFee: number;
  total: number;
  currency: string;
}

function dateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function matchesDayType(dayType: string, date: Date): boolean {
  const weekday = date.getUTCDay();
  // Iranian weekend: Thursday and Friday.
  const weekend = weekday === 4 || weekday === 5;
  switch (dayType) {
    case 'WEEKEND':
      return weekend;
    case 'WEEKDAY':
      return !weekend;
    case 'HOLIDAY':
      // Holiday rates are explicit date ranges, so any night inside matches.
      return true;
    default:
      return true;
  }
}

function pickRate(rates: PricingRate[], date: Date): PricingRate | null {
  let best: PricingRate | null = null;
  let bestSpan = Number.POSITIVE_INFINITY;
  for (const rate of rates) {
    if (date < rate.startDate || date >= rate.endDate) continue;
    if (!matchesDayType(rate.dayType, date)) continue;
    const span = rate.endDate.getTime() - rate.startDate.getTime();
    if (span < bestSpan) {
      best = rate;
      bestSpan = span;
    }
  }
  return best;
}

export function quoteStay(
  property: PricingProperty,
  rates: PricingRate[],
  checkIn: Date,
  checkOut: Date,
  guests: number,
): PriceQuote {
  const nightly: Array<{ date: string; price: number }> = [];
  let subtotal = 0;
  const cursor = new Date(checkIn);
  while (cursor < checkOut) {
    const rate = pickRate(rates, cursor);
    const price = rate?.price ?? property.basePrice;
    nightly.push({ date: dateOnly(cursor), price });
    subtotal += price;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  const nights = nightly.length;
  const discount =
    property.longStayMinNights > 0 &&
    nights >= property.longStayMinNights &&
    property.longStayDiscountPercent > 0
      ? Math.round((subtotal * property.longStayDiscountPercent) / 100)
      : 0;
  const extraGuests = Math.max(0, guests - property.baseGuests);
  const extraGuestFee = extraGuests * property.extraGuestFee * nights;
  const cleaningFee = property.cleaningFee;
  const total = Math.max(
    0,
    subtotal - discount + cleaningFee + extraGuestFee,
  );
  return {
    nights,
    nightly,
    subtotal,
    discount,
    cleaningFee,
    extraGuestFee,
    total,
    currency: property.currency,
  };
}
