import { StyleSheet } from 'react-native';

/**
 * Client-side design tokens — premium SaaS structure.
 *
 * 60-30-10:
 *   60%  canvas        soft off-white base every screen sits on
 *   30%  card + text   crisp white surfaces and deep midnight type
 *   10%  accent        #221ea2, ONLY on dominant actions / active tabs / focus
 *
 * Depth is built with three stacked surface layers, never with heavy borders:
 *   Layer 0  canvas   #f9f9ff
 *   Layer 1  card     #ffffff   (pops forward off the canvas)
 *   Layer 2  input    #f1f3ff   (recessed, carved into the card)
 */
export const T = {
  // ── Layer 0 · base canvas ────────────────────────────────────
  canvas: '#f9f9ff',

  // ── Layer 1 · content cards ──────────────────────────────────
  card: '#ffffff',

  // ── Layer 2 · recessed inputs / wells ────────────────────────
  input: '#f1f3ff',
  inputDeep: '#e8eeff',

  // ── Hairline structure ───────────────────────────────────────
  // Felt, not seen: one soft blue-tinted cool gray, always hairline width.
  border: '#E2E8F8',

  // ── Color-tinted neutrals (never pure black) ─────────────────
  text: '#161c27',        // rich midnight navy-black
  textMuted: '#464554',
  textFaint: '#8a89a3',
  textDisabled: '#c7c5d6',

  // ── Accent · the 10% ─────────────────────────────────────────
  accent: '#023047',
  accentPressed: '#3c3cb9',
  accentWash: '#eef0ff',  // soft tint for accent chips/icon wells
  onAccent: '#ffffff',

  // ── Semantic soft-tint containers (dual-tone, never solid) ───
  successWash: '#e3f8ec', onSuccess: '#007243',
  warnWash: '#fff4e0',    onWarn: '#7b5804',
  errorWash: '#ffe9e9',   onError: '#d00000',
  infoWash: '#eef0ff',    onInfo: '#221ea2',

  star: '#f5b301',
} as const;

/** Hairline border — thin enough to be felt rather than seen. */
export const HAIRLINE = StyleSheet.hairlineWidth;

/** Layer 1: a crisp white card resting on the canvas. */
export const cardSurface = {
  backgroundColor: T.card,
  borderRadius: 18,
  borderWidth: HAIRLINE,
  borderColor: T.border,
} as const;

/** Layer 2: a recessed well inside a card (inputs, read-only values). */
export const inputSurface = {
  backgroundColor: T.input,
  borderRadius: 14,
  borderWidth: HAIRLINE,
  borderColor: T.border,
} as const;

/** Very soft elevation. Depth comes from layering, not heavy shadows. */
export const softShadow = {
  shadowColor: '#221ea2',
  shadowOffset: { width: 0, height: 4 },
  shadowOpacity: 0.05,
  shadowRadius: 12,
  elevation: 2,
} as const;

/** Dual-tone status chip: soft wash background + deep semantic label. */
export function chip(tone: 'success' | 'warn' | 'error' | 'info' | 'neutral') {
  switch (tone) {
    case 'success': return { bg: T.successWash, fg: T.onSuccess };
    case 'warn':    return { bg: T.warnWash,    fg: T.onWarn };
    case 'error':   return { bg: T.errorWash,   fg: T.onError };
    case 'info':    return { bg: T.infoWash,    fg: T.onInfo };
    default:        return { bg: T.input,       fg: T.textMuted };
  }
}
