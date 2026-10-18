/**
 * "Près de moi": one-shot foreground position for the feed's distance filter.
 * Asks permission only when the user taps the action (never at launch), uses
 * balanced accuracy with a timeout, and falls back to the last known fix.
 */
import * as Location from 'expo-location';
import { roundCoord } from '@/lib/api/posts';

export interface Coords {
  lat: number;
  lng: number;
}

export type LocationFailure = 'denied' | 'unavailable';

export type LocationResult = { ok: true; coords: Coords } | { ok: false; reason: LocationFailure };

export const LOCATION_MESSAGES: Record<LocationFailure, { title: string; message: string }> = {
  denied: {
    title: 'Position non autorisée',
    message: 'Autorisez la localisation dans les réglages pour voir les annonces près de vous.',
  },
  unavailable: {
    title: 'Position introuvable',
    message: 'Activez la localisation de votre téléphone puis réessayez.',
  },
};

const TIMEOUT_MS = 10_000;

function toCoords(loc: Location.LocationObject): Coords {
  return { lat: roundCoord(loc.coords.latitude), lng: roundCoord(loc.coords.longitude) };
}

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const id = setTimeout(() => reject(new Error('timeout')), ms);
    p.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

export async function getCurrentCoords(): Promise<LocationResult> {
  try {
    const perm = await Location.requestForegroundPermissionsAsync();
    if (perm.status !== 'granted') return { ok: false, reason: 'denied' };
  } catch {
    return { ok: false, reason: 'unavailable' };
  }
  try {
    const loc = await withTimeout(
      Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
      TIMEOUT_MS,
    );
    return { ok: true, coords: toCoords(loc) };
  } catch {
    try {
      const last = await Location.getLastKnownPositionAsync({ maxAge: 30 * 60_000 });
      if (last) return { ok: true, coords: toCoords(last) };
    } catch {
      // fall through
    }
    return { ok: false, reason: 'unavailable' };
  }
}
