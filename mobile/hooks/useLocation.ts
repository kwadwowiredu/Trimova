import { useCallback, useEffect, useState } from 'react';
import { Linking } from 'react-native';
import * as Location from 'expo-location';
import { useLocationStore } from '@/stores/locationStore';

/**
 * Foreground location, used to sort barbers by distance.
 *
 * The OS only shows its permission dialog while it's still willing to ask.
 * After a denial iOS never asks again (and Android stops after "don't ask
 * again"), so `requestForegroundPermissionsAsync` returns "denied" instantly
 * with no dialog. That's why an in-app prompt that just says "allow location"
 * feels broken: there's nothing left for it to trigger.
 *
 * So this tracks `canAskAgain` and exposes the right action for each state —
 * ask the system, or send the user to Settings.
 */
export function useLocation() {
  const { coordinates, hasPermission, setCoordinates, setPermission } = useLocationStore();
  const [canAskAgain, setCanAskAgain] = useState(true);
  const [checking, setChecking] = useState(true);

  const fetchPosition = useCallback(async () => {
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    setCoordinates({ lat: location.coords.latitude, lng: location.coords.longitude });
  }, [setCoordinates]);

  /** Ask the OS. Only produces a dialog while `canAskAgain` is true. */
  const request = useCallback(async () => {
    try {
      const { status, canAskAgain: mayAsk } = await Location.requestForegroundPermissionsAsync();
      setCanAskAgain(mayAsk);
      const granted = status === 'granted';
      setPermission(granted);
      if (granted) await fetchPosition();
      return granted;
    } catch {
      // Denied, unavailable, or timed out — the app works fine without it.
      setPermission(false);
      return false;
    }
  }, [fetchPosition, setPermission]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        // Read the current state before asking, so we know whether a dialog
        // is even possible.
        const existing = await Location.getForegroundPermissionsAsync();
        if (cancelled) return;

        setCanAskAgain(existing.canAskAgain);

        if (existing.granted) {
          setPermission(true);
          await fetchPosition();
        } else if (existing.canAskAgain) {
          // First run: this is what shows the system dialog.
          await request();
        } else {
          setPermission(false);
        }
      } catch {
        if (!cancelled) setPermission(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** Opens this app's page in the system settings, for a hard denial. */
  const openSettings = useCallback(() => Linking.openSettings(), []);

  return {
    coordinates,
    hasPermission,
    /** True while the OS will still show its own dialog. */
    canAskAgain,
    /** True until the initial permission check finishes. */
    checking,
    request,
    openSettings,
    refresh: request,
  };
}
