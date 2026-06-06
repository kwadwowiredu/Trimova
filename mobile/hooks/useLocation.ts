import { useEffect } from 'react';
import * as Location from 'expo-location';
import { useLocationStore } from '@/stores/locationStore';

export function useLocation() {
  const { coordinates, hasPermission, setCoordinates, setPermission } = useLocationStore();

  useEffect(() => {
    requestAndFetch();
  }, []);

  async function requestAndFetch() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    const granted = status === 'granted';
    setPermission(granted);

    if (granted) {
      const location = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoordinates({ lat: location.coords.latitude, lng: location.coords.longitude });
    }
  }

  return { coordinates, hasPermission, refresh: requestAndFetch };
}
