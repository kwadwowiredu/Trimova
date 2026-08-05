/**
 * Slot arithmetic, server side.
 *
 * A start time is offered only when the WHOLE service fits inside opening
 * hours without touching a busy block. So a 30-minute cut booked at 16:00
 * pushes the next free start to 16:30 — and a client picking a 45-minute
 * service is only offered starts where the full 45 minutes stays clear.
 *
 * Mirrors mobile/utils/slots.ts so both sides agree on what "available" means.
 */

export interface BusyBlock {
  /** "16:00" */
  start: string;
  /** "16:30" */
  end: string;
}

/** Step between offered start times, in minutes. */
export const SLOT_STEP = 15;

export const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

export const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export interface SlotOptions {
  openTime: string;
  closeTime: string;
  busy: BusyBlock[];
  durationMinutes: number;
  /** Minutes past midnight before which nothing may be booked (today only). */
  earliestMinutes?: number;
}

export function generateSlots({
  openTime,
  closeTime,
  busy,
  durationMinutes,
  earliestMinutes = 0,
}: SlotOptions): string[] {
  const open = toMins(openTime);
  const close = toMins(closeTime);
  const busyRanges = busy.map((b) => [toMins(b.start), toMins(b.end)] as const);

  const slots: string[] = [];
  for (let start = open; start + durationMinutes <= close; start += SLOT_STEP) {
    if (start < earliestMinutes) continue;
    const end = start + durationMinutes;
    const overlaps = busyRanges.some(([bs, be]) => start < be && end > bs);
    if (!overlaps) slots.push(toTime(start));
  }
  return slots;
}
