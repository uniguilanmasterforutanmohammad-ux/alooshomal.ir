/**
 * Minimal iCalendar (RFC 5545) helpers for the OTA calendar sync.
 *
 * Only the subset the rental module needs is implemented: read `VEVENT`
 * start/end/uid/summary and write an all-day calendar of blocked ranges and
 * bookings. No external dependency is required.
 */

export interface IcalEvent {
  uid: string;
  start: Date;
  end: Date;
  summary?: string;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

/** `YYYYMMDD` in UTC — the all-day form used by both sides. */
export function formatIcalDate(date: Date): string {
  return `${date.getUTCFullYear()}${pad(date.getUTCMonth() + 1)}${pad(
    date.getUTCDate(),
  )}`;
}

function parseIcalDate(value: string): Date | null {
  const raw = value.trim();
  const dateOnly = /^(\d{4})(\d{2})(\d{2})$/.exec(raw);
  if (dateOnly) {
    return new Date(
      Date.UTC(Number(dateOnly[1]), Number(dateOnly[2]) - 1, Number(dateOnly[3])),
    );
  }
  const dateTime = /^(\d{4})(\d{2})(\d{2})T(\d{2})(\d{2})(\d{2})Z?$/.exec(raw);
  if (dateTime) {
    return new Date(
      Date.UTC(
        Number(dateTime[1]),
        Number(dateTime[2]) - 1,
        Number(dateTime[3]),
        Number(dateTime[4]),
        Number(dateTime[5]),
        Number(dateTime[6]),
      ),
    );
  }
  const parsed = new Date(raw);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function unfold(text: string): string[] {
  return text
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .reduce<string[]>((lines, line) => {
      if (/^[ \t]/.test(line) && lines.length) {
        lines[lines.length - 1] += line.slice(1);
      } else {
        lines.push(line);
      }
      return lines;
    }, []);
}

function unescapeText(value: string): string {
  return value
    .replace(/\\n/gi, ' ')
    .replace(/\\,/g, ',')
    .replace(/\\;/g, ';')
    .replace(/\\\\/g, '\\');
}

/** Parse every `VEVENT` in an iCal feed. Invalid events are skipped. */
export function parseIcalEvents(text: string): IcalEvent[] {
  const events: IcalEvent[] = [];
  let current: Record<string, string> | null = null;
  for (const line of unfold(text)) {
    if (line.startsWith('BEGIN:VEVENT')) {
      current = {};
      continue;
    }
    if (line.startsWith('END:VEVENT')) {
      if (current) {
        const start = current.DTSTART ? parseIcalDate(current.DTSTART) : null;
        const end = current.DTEND ? parseIcalDate(current.DTEND) : null;
        if (start && end && end > start) {
          events.push({
            uid:
              current.UID?.trim() ||
              `${start.toISOString()}-${end.toISOString()}`,
            start,
            end,
            summary: current.SUMMARY
              ? unescapeText(current.SUMMARY)
              : undefined,
          });
        }
      }
      current = null;
      continue;
    }
    if (!current) continue;
    const index = line.indexOf(':');
    if (index <= 0) continue;
    const rawKey = line.slice(0, index);
    const key = rawKey.split(';')[0].toUpperCase();
    current[key] = line.slice(index + 1);
  }
  return events;
}

function escapeText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n');
}

export interface IcalBlock {
  uid: string;
  start: Date;
  end: Date;
  summary: string;
}

/** Serialise blocked ranges/bookings into a downloadable iCal feed. */
export function buildIcalCalendar(
  calendarName: string,
  blocks: IcalBlock[],
): string {
  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}Z$/, 'Z');
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Alooshomal//Accommodation Calendar//FA',
    'CALSCALE:GREGORIAN',
    `X-WR-CALNAME:${escapeText(calendarName)}`,
  ];
  for (const block of blocks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${block.uid}`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${formatIcalDate(block.start)}`,
      `DTEND;VALUE=DATE:${formatIcalDate(block.end)}`,
      `SUMMARY:${escapeText(block.summary)}`,
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}
