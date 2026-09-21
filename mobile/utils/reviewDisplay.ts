// Presentation helpers for reviews. The data itself comes from
// services/reviews.ts — this is only about how it looks.

// Distinct fallback avatar colours for clients without a profile photo.
const AVATAR_COLORS = ['#3c3cb9', '#0a8a44', '#B7791F', '#C05621', '#6B46C1', '#2B6CB0', '#B83280'];

/** Deterministic colour per client name, so the same person always looks the same. */
export function avatarColorFor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = (hash * 31 + name.charCodeAt(i)) | 0;
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

/** "12 Aug 2026" */
export function fmtReviewDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}
