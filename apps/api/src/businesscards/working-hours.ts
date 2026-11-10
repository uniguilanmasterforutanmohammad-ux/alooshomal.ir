import { Prisma } from '@prisma/client';

const WORKING_DAYS = [
  'saturday',
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
] as const;

/**
 * Keep only the known weekdays and valid `HH:mm` values, so a crafted payload
 * cannot store arbitrary keys/values in the JSON column. Returns `Prisma.DbNull`
 * when the owner explicitly cleared the weekly hours.
 */
export function sanitizeWorkingHours(
  input: unknown,
): Prisma.InputJsonValue | typeof Prisma.DbNull | undefined {
  if (input === undefined) return undefined;
  if (!input || typeof input !== 'object' || Array.isArray(input)) return undefined;
  const source = input as Record<string, unknown>;
  const result: Record<string, { open?: string; close?: string; closed?: boolean }> =
    {};
  const time = /^\d{2}:\d{2}$/;
  for (const day of WORKING_DAYS) {
    const raw = source[day];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) continue;
    const value = raw as Record<string, unknown>;
    const open =
      typeof value.open === 'string' && time.test(value.open)
        ? value.open
        : undefined;
    const close =
      typeof value.close === 'string' && time.test(value.close)
        ? value.close
        : undefined;
    if (value.closed === true) {
      result[day] = { closed: true };
    } else if (open || close) {
      result[day] = { ...(open ? { open } : {}), ...(close ? { close } : {}) };
    }
  }
  if (Object.keys(result).length === 0) return Prisma.DbNull;
  return result as Prisma.InputJsonValue;
}
