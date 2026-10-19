/**
 * Haptic feedback (doc §3.2): light impact on like / send / step complete,
 * success notification on publish / sale.
 *
 * expo-haptics is a native module: until the dev client is rebuilt it is
 * absent, and every call here silently becomes a no-op.
 */
import { requireOptionalNativeModule } from 'expo';

let Haptics: typeof import('expo-haptics') | null = null;
try {
  if (requireOptionalNativeModule('ExpoHaptics')) {
    Haptics = require('expo-haptics');
  }
} catch {
  Haptics = null;
}

function safe(fn: () => Promise<void> | void) {
  try {
    const p = fn();
    if (p && typeof (p as Promise<void>).catch === 'function') (p as Promise<void>).catch(() => {});
  } catch {
    // ignore — haptics are a nicety
  }
}

export const haptics = {
  light: () => safe(() => Haptics?.impactAsync(Haptics.ImpactFeedbackStyle.Light)),
  selection: () => safe(() => Haptics?.selectionAsync()),
  success: () =>
    safe(() => Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Success)),
  warning: () =>
    safe(() => Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Warning)),
  error: () => safe(() => Haptics?.notificationAsync(Haptics.NotificationFeedbackType.Error)),
};
