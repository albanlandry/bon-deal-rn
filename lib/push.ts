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
import { markRead } from '@/lib/api/notifications';
import { openNotificationTarget } from '@/lib/notificationTarget';
import { queryClient } from '@/lib/queryClient';

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

// A push's FCM data: the notification's type and ids, all as strings.
function openFromPush(msg: any): void {
  const data = msg?.data;
  if (!data?.type) return;
  const id = Number(data.notification_id);
  if (id > 0) {
    markRead(id)
      .then(() => queryClient.invalidateQueries({ queryKey: ['notifications'] }))
      .catch(() => {});
  }
  openNotificationTarget({ type: data.type, conversation_id: data.conversation_id, payload: data });
}

/**
 * Opens the screen a tapped push points to, whether the tap woke the app from
 * the background or launched it. No-op when the native module is unavailable.
 */
export function usePushTapHandler(): void {
  useEffect(() => {
    if (!messaging) return;
    try {
      messaging()
        .getInitialNotification()
        .then((msg: any) => {
          // Let the root stack mount before pushing onto it.
          if (msg) setTimeout(() => openFromPush(msg), 0);
        })
        .catch(() => {});
      return messaging().onNotificationOpenedApp(openFromPush);
    } catch (e) {
      console.warn('[push] tap handler failed:', e);
    }
  }, []);
}
