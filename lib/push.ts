/**
 * FCM push registration — defensively gated.
 *
 * `@react-native-firebase/messaging` is a native module: it only fully works
 * after `expo prebuild` + a native rebuild. The import is wrapped in try/catch
 * and every call is guarded, so the JS bundle still runs (and Metro/`tsc`
 * still resolve) before that rebuild — every export becomes a logged no-op
 * when the native module is unavailable.
 */
import { useEffect } from 'react';
import { Platform } from 'react-native';
import { apiFetch } from '@/lib/api';
import { showToast } from '@/components/atoms/Toast';

let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch {
  messaging = null;
}

// Firebase AuthorizationStatus: DENIED=0, AUTHORIZED=1, PROVISIONAL=2.
const AUTHORIZED = 1;
const PROVISIONAL = 2;

async function getDeviceToken(): Promise<string | null> {
  if (!messaging) return null;
  try {
    return await messaging().getToken();
  } catch (e) {
    console.warn('[push] getToken failed:', e);
    return null;
  }
}

export async function registerPushToken(): Promise<void> {
  if (!messaging) {
    console.log('[push] messaging not linked — registerPushToken skipped');
    return;
  }
  try {
    const status = await messaging().requestPermission();
    if (status !== AUTHORIZED && status !== PROVISIONAL) {
      console.log('[push] notification permission not granted');
      return;
    }
    const token = await getDeviceToken();
    if (!token) return;
    await apiFetch('/push_tokens', {
      method: 'POST',
      body: { token, platform: Platform.OS },
    });
    console.log('[push] device token registered');
  } catch (e) {
    console.warn('[push] registerPushToken failed:', e);
  }
}

export async function unregisterPushToken(): Promise<void> {
  if (!messaging) return;
  try {
    const token = await getDeviceToken();
    if (!token) return;
    await apiFetch(`/push_tokens/${encodeURIComponent(token)}`, { method: 'DELETE' });
    console.log('[push] device token unregistered');
  } catch (e) {
    console.warn('[push] unregisterPushToken failed:', e);
  }
}

/**
 * Shows a toast when a push arrives while the app is in the foreground.
 * No-op when the native module is unavailable.
 */
export function useForegroundMessageHandler(): void {
  useEffect(() => {
    if (!messaging) return;
    try {
      const unsub = messaging().onMessage(async (msg: any) => {
        const title = msg?.notification?.title;
        const body = msg?.notification?.body;
        if (title || body) {
          showToast.info(title || 'Notification', body);
        }
      });
      return unsub;
    } catch (e) {
      console.warn('[push] onMessage handler failed:', e);
    }
  }, []);
}
