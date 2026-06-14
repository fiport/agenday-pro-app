import * as Location from 'expo-location';
import { useEffect, useRef, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';

export type UserLocation = {
  lat: number;
  lng: number;
  city: string | null;
};

type LocationState = {
  location: UserLocation | null;
  permission: 'undetermined' | 'granted' | 'denied';
  loading: boolean;
  requestPermission: () => Promise<void>;
};

export function useLocation(): LocationState {
  const [location, setLocation] = useState<UserLocation | null>(null);
  const [permission, setPermission] = useState<'undetermined' | 'granted' | 'denied'>('undetermined');
  const [loading, setLoading] = useState(false);
  const appState = useRef(AppState.currentState);

  useEffect(() => {
    checkPermission();

    const sub = AppState.addEventListener('change', (next: AppStateStatus) => {
      if (appState.current.match(/inactive|background/) && next === 'active') {
        checkPermission();
      }
      appState.current = next;
    });

    return () => sub.remove();
  }, []);

  async function checkPermission() {
    const { status } = await Location.getForegroundPermissionsAsync();
    if (status === 'granted') {
      fetchLocation();
    } else {
      setPermission(status === 'denied' ? 'denied' : 'undetermined');
    }
  }

  async function fetchLocation() {
    setLoading(true);
    try {
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [geo] = await Location.reverseGeocodeAsync({
        latitude: pos.coords.latitude,
        longitude: pos.coords.longitude,
      });
      const city = geo?.city ?? geo?.subregion ?? null;
      setLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude, city });
      setPermission('granted');
    } catch {
      // noop
    } finally {
      setLoading(false);
    }
  }

  async function requestPermission() {
    setLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        await fetchLocation();
      } else {
        setPermission('denied');
        setLoading(false);
      }
    } catch {
      setLoading(false);
    }
  }

  return { location, permission, loading, requestPermission };
}

// Haversine distance in km
export function distanceKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)}m`;
  return `${km.toFixed(1).replace('.', ',')}km`;
}
