import type { Request, Response } from 'express';
import { getSupabase } from '../utils/supabase';
import { sendSuccess, sendError } from '../utils/response';

// Screen day order (Mon→Sun) mapped to SQL day_of_week (0=Sun..6=Sat).
const DAYS: { day: string; dow: number }[] = [
  { day: 'Monday', dow: 1 }, { day: 'Tuesday', dow: 2 }, { day: 'Wednesday', dow: 3 },
  { day: 'Thursday', dow: 4 }, { day: 'Friday', dow: 5 }, { day: 'Saturday', dow: 6 },
  { day: 'Sunday', dow: 0 },
];

interface DaySchedule {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
  breaks: { start: string; end: string }[];
}

const hhmm = (t: unknown) => String(t ?? '').slice(0, 5);

export const workingHoursController = {
  /** GET /working-hours/me — the full week in the app's DaySchedule shape (or null if unset). */
  async getMine(req: Request, res: Response) {
    const supabase = getSupabase();
    const barberId = req.user!.sub;

    const [{ data: hours }, { data: breaks }] = await Promise.all([
      supabase.from('working_hours').select('*').eq('barber_id', barberId),
      supabase.from('breaks').select('*').eq('barber_id', barberId),
    ]);

    if (!hours || hours.length === 0) {
      sendSuccess(res, null); // nothing saved yet — client uses its default
      return;
    }

    const schedule: DaySchedule[] = DAYS.map(({ day, dow }) => {
      const wh = hours.find((h) => h.day_of_week === dow);
      const dayBreaks = (breaks ?? [])
        .filter((b) => b.day_of_week === dow)
        .map((b) => ({ start: hhmm(b.start_time), end: hhmm(b.end_time) }));
      return {
        day,
        isOpen:    wh ? !!wh.is_active : false,
        openTime:  wh ? hhmm(wh.start_time) : '09:00',
        closeTime: wh ? hhmm(wh.end_time)   : '18:00',
        breaks:    dayBreaks,
      };
    });

    sendSuccess(res, schedule);
  },

  /** PUT /working-hours/me { schedule } — replace the whole week. */
  async saveMine(req: Request, res: Response) {
    const { schedule } = req.body as { schedule?: DaySchedule[] };
    if (!Array.isArray(schedule)) {
      sendError(res, 'A schedule array is required.');
      return;
    }
    const supabase = getSupabase();
    const barberId = req.user!.sub;

    const dowFor = (name: string) => DAYS.find((d) => d.day === name)?.dow;

    const hourRows = schedule.flatMap((d) => {
      const dow = dowFor(d.day);
      if (dow === undefined) return [];
      return [{
        barber_id:   barberId,
        day_of_week: dow,
        start_time:  d.openTime || '09:00',
        end_time:    d.closeTime || '18:00',
        is_active:   !!d.isOpen,
      }];
    });

    const breakRows = schedule.flatMap((d) => {
      const dow = dowFor(d.day);
      if (dow === undefined) return [];
      return (d.breaks ?? []).map((b) => ({
        barber_id:   barberId,
        day_of_week: dow,
        start_time:  b.start,
        end_time:    b.end,
      }));
    });

    // Replace-all (simplest correct strategy for a small weekly set).
    const del1 = await supabase.from('working_hours').delete().eq('barber_id', barberId);
    const del2 = await supabase.from('breaks').delete().eq('barber_id', barberId);
    if (del1.error || del2.error) { sendError(res, 'Failed to save schedule.', 500); return; }

    if (hourRows.length) {
      const { error } = await supabase.from('working_hours').insert(hourRows);
      if (error) { sendError(res, 'Failed to save working hours.', 500); return; }
    }
    if (breakRows.length) {
      const { error } = await supabase.from('breaks').insert(breakRows);
      if (error) { sendError(res, 'Failed to save breaks.', 500); return; }
    }

    sendSuccess(res, schedule, 'Schedule saved.');
  },
};
