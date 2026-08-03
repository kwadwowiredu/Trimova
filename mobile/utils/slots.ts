// Dynamic time-slot generation for the booking flow.
//
// A slot is bookable only if the WHOLE service fits before closing time and
// doesn't overlap an existing appointment. So if a 30-min cut is booked at
// 16:00 and the grid steps 15 min, the next free start is 16:30 — and if the
// following client picks a 45-min service, they'd be offered 16:30, 16:45, …
// only where the full 45 minutes stays clear.

export interface BusyBlock {
  /** "16:00" */
  start: string;
  /** "16:30" */
  end: string;
}

/** Step between offered start times, in minutes. */
export const SLOT_STEP = 15;

const toMins = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};
const toTime = (mins: number) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

export interface SlotOptions {
  /** Working hours for the chosen day. */
  openTime: string;
  closeTime: string;
  /** Appointments + breaks already taken for that barber that day. */
  busy: BusyBlock[];
  /** Duration of the service being booked. */
  durationMinutes: number;
  /** True when the chosen day is today — past times are then excluded. */
  isToday: boolean;
  /** Minimum notice before an appointment (barber's booking rules). */
  leadMinutes?: number;
}

/**
 * Returns every start time where the full service fits inside opening hours
 * without overlapping a busy block.
 */
export function generateSlots({
  openTime, closeTime, busy, durationMinutes, isToday, leadMinutes = 0,
}: SlotOptions): string[] {
  const open = toMins(openTime);
  const close = toMins(closeTime);
  const busyRanges = busy.map((b) => [toMins(b.start), toMins(b.end)] as const);

  // Earliest allowed start when booking for today (now + required notice).
  let earliest = open;
  if (isToday) {
    const now = new Date();
    earliest = Math.max(open, now.getHours() * 60 + now.getMinutes() + leadMinutes);
  }

  const slots: string[] = [];
  for (let start = open; start + durationMinutes <= close; start += SLOT_STEP) {
    if (start < earliest) continue;
    const end = start + durationMinutes;
    const overlaps = busyRanges.some(([bs, be]) => start < be && end > bs);
    if (!overlaps) slots.push(toTime(start));
  }
  return slots;
}

/** Group slots into Morning / Afternoon / Evening for a tidier picker. */
export function groupSlots(slots: string[]): { label: string; slots: string[] }[] {
  const groups = [
    { label: 'Morning',   slots: [] as string[] },
    { label: 'Afternoon', slots: [] as string[] },
    { label: 'Evening',   slots: [] as string[] },
  ];
  for (const s of slots) {
    const h = Number(s.split(':')[0]);
    if (h < 12) groups[0].slots.push(s);
    else if (h < 17) groups[1].slots.push(s);
    else groups[2].slots.push(s);
  }
  return groups.filter((g) => g.slots.length > 0);
}

// ─── Mock booked blocks (until the bookings API exists) ──────────────────────
// Keyed by `${professionalId}|${date}`.
const MOCK_BUSY: Record<string, BusyBlock[]> = {};

function seedKey(professionalId: string, date: string) {
  return `${professionalId}|${date}`;
}

/** Deterministic pseudo-bookings so the grid looks realistically occupied. */
export function getBusyBlocks(professionalId: string, date: string): BusyBlock[] {
  const key = seedKey(professionalId, date);
  if (!MOCK_BUSY[key]) {
    // Simple deterministic hash → 0–3 fake appointments for that barber/day.
    let hash = 0;
    for (let i = 0; i < key.length; i++) hash = (hash * 31 + key.charCodeAt(i)) | 0;
    const h = Math.abs(hash);
    const seeds: BusyBlock[] = [
      { start: '10:00', end: '10:45' },
      { start: '12:30', end: '13:00' },
      { start: '15:00', end: '16:00' },
      { start: '17:30', end: '18:15' },
    ];
    MOCK_BUSY[key] = seeds.filter((_, i) => (h >> i) % 2 === 0);
  }
  return MOCK_BUSY[key];
}

/** Called after a successful booking so the slot disappears for everyone else. */
export function reserveBlock(professionalId: string, date: string, block: BusyBlock) {
  const key = seedKey(professionalId, date);
  MOCK_BUSY[key] = [...(MOCK_BUSY[key] ?? []), block];
}
