/**
 * App-wide offline cue (docs/10 X1). `apiFetch` flags the app offline when a
 * request gets no response at all, and online again on the next response.
 *
 * While offline: a small pill under the status bar ("Hors ligne"), cached data
 * stays on screen, and the app probes `/app-config` every 10 s and whenever it
 * returns to the foreground. Tapping the pill probes right away. When the
 * network is back the pill turns into "De retour en ligne" for a moment and
 * the visible queries refetch.
 *
 * No NetInfo: it is a native module and would need a dev-client rebuild, and a
 * failed request is the signal that matters to the user anyway.
 */
import { Ionicons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet } from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { apiFetch } from '@/lib/api';
import { useAppStatus } from '@/lib/appStatus';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import { enterFromTop, exitUp } from '../motion/anim';
import PressableScale from '../motion/PressableScale';

export const OFFLINE_PROBE_MS = 10_000;
const BACK_ONLINE_MS = 2_000;

export default function OfflineBanner() {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const { offline } = useAppStatus();
  const [backOnline, setBackOnline] = useState(false);
  const wasOffline = useRef(false);

  const probe = useCallback(() => {
    // Any response clears the flag inside apiFetch; errors are expected here.
    apiFetch('/app-config', { skipUnauthorized: true }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!offline) return;
    const timer = setInterval(probe, OFFLINE_PROBE_MS);
    const sub = AppState.addEventListener('change', (s) => s === 'active' && probe());
    return () => {
      clearInterval(timer);
      sub.remove();
    };
  }, [offline, probe]);

  useEffect(() => {
    if (offline) {
      wasOffline.current = true;
      setBackOnline(false);
      return;
    }
    if (!wasOffline.current) return;
    wasOffline.current = false;
    queryClient.refetchQueries({ type: 'active' });
    setBackOnline(true);
    const timer = setTimeout(() => setBackOnline(false), BACK_ONLINE_MS);
    return () => clearTimeout(timer);
  }, [offline, queryClient]);

  if (!offline && !backOnline) return null;
  const fg = offline ? t.colors.onOverlay : t.colors.success;
  return (
    <Animated.View
      entering={enterFromTop(250)}
      exiting={exitUp(200)}
      pointerEvents="box-none"
      style={[styles.wrap, { top: insets.top + 4 }]}>
      <PressableScale
        onPress={offline ? probe : undefined}
        disabled={!offline}
        accessibilityRole={offline ? 'button' : 'text'}
        accessibilityLiveRegion="polite"
        accessibilityLabel={
          offline ? 'Hors ligne. Les données affichées peuvent être anciennes. Réessayer' : 'De retour en ligne'
        }
        style={[
          styles.pill,
          {
            backgroundColor: offline ? t.colors.overlay : t.colors.successTint,
            borderRadius: t.radius.md,
          },
        ]}>
        <Ionicons name={offline ? 'cloud-offline-outline' : 'cloud-done-outline'} size={16} color={fg} />
        <AppText variant="labelStrong" style={{ color: fg }}>
          {offline ? 'Hors ligne · Réessayer' : 'De retour en ligne'}
        </AppText>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 16,
  },
});
