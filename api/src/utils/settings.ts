import { getSupabase } from './supabase';

/**
 * Platform settings, read from the database rather than the environment so an
 * admin can change commission without a redeploy.
 *
 * Cached briefly: these are read on every settlement pass and change perhaps
 * a few times a year.
 */
export interface PlatformSettings {
  commissionPercent: number;
  confirmationWindowHours: number;
  freeCancelHours: number;
  halfFeeHours: number;
}

const DEFAULTS: PlatformSettings = {
  commissionPercent: 10,
  confirmationWindowHours: 12,
  freeCancelHours: 3,
  halfFeeHours: 1,
};

let cached: { value: PlatformSettings; at: number } | null = null;
const CACHE_MS = 60_000;

export async function getSettings(): Promise<PlatformSettings> {
  if (cached && Date.now() - cached.at < CACHE_MS) return cached.value;

  const { data, error } = await getSupabase()
    .from('platform_settings')
    .select('*')
    .eq('id', true)
    .maybeSingle();

  if (error || !data) {
    // Never let a settings read break a booking — fall back to the defaults
    // the migration seeds, which are the same numbers.
    if (error) console.error('[settings] read failed:', error.message);
    return DEFAULTS;
  }

  const value: PlatformSettings = {
    commissionPercent: Number(data.commission_percent) || DEFAULTS.commissionPercent,
    confirmationWindowHours:
      data.confirmation_window_hours ?? DEFAULTS.confirmationWindowHours,
    freeCancelHours: data.free_cancel_hours ?? DEFAULTS.freeCancelHours,
    halfFeeHours: data.half_fee_hours ?? DEFAULTS.halfFeeHours,
  };

  cached = { value, at: Date.now() };
  return value;
}

/** Called after an admin edits settings so the next read isn't stale. */
export function invalidateSettingsCache() {
  cached = null;
}

/** Split a booking total into Trimova's cut and the barber's share. */
export function splitCommission(total: number, commissionPercent: number) {
  const commission = Math.round(total * commissionPercent) / 100;
  const barberShare = Math.round((total - commission) * 100) / 100;
  return { commission, barberShare, commissionPercent };
}
