import * as Haptics from 'expo-haptics';

// Subtle tactile feedback on major touch surfaces (cards, tabs, filters,
// back buttons). Fire-and-forget — haptics failing must never break a tap.

/** Light tap — cards, list rows, chips, back buttons. */
export function tapLight() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
}

/** Selection tick — tab switches, toggles, segmented controls. */
export function tapSelect() {
  Haptics.selectionAsync().catch(() => {});
}

/** Medium thump — primary actions (Book, Apply filters, Submit). */
export function tapMedium() {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
}
