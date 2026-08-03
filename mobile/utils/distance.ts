/** Great-circle distance in kilometres between two coordinates. */
export function distanceKm(
  aLat: number, aLng: number, bLat: number, bLng: number,
): number {
  const R = 6371; // Earth radius, km
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(bLat - aLat);
  const dLng = toRad(bLng - aLng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(aLat)) * Math.cos(toRad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

export interface TravelCheck {
  /** null when we can't tell (no client location, or barber has no base set). */
  distance: number | null;
  withinRange: boolean;
  radius: number | null;
  /** True only when we positively know the client is too far. */
  needsRequest: boolean;
}

/**
 * Is the client inside a mobile barber's travel radius?
 *
 * Requires the client's coordinates — without location permission we can't
 * measure, so we stay optimistic (`needsRequest: false`) and let the barber
 * decide, rather than blocking a booking on a guess.
 */
export function checkTravelRange(
  client: { lat: number; lng: number } | null | undefined,
  barber: { lat?: number | null; lng?: number | null; serviceRadius?: number | null },
): TravelCheck {
  const radius = barber.serviceRadius ?? null;
  if (!client || barber.lat == null || barber.lng == null || !radius) {
    return { distance: null, withinRange: true, radius, needsRequest: false };
  }
  const distance = distanceKm(client.lat, client.lng, barber.lat, barber.lng);
  const withinRange = distance <= radius;
  return { distance, withinRange, radius, needsRequest: !withinRange };
}
