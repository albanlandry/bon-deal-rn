/**
 * Scroll-driven "chrome": the collapsing header and the bottom tab bar hide
 * on scroll down and come back on scroll up (docs/09 §4 Home, §2 tabs).
 *
 * Direction is detected on the JS thread from any list's `onScroll` (works
 * with FlashList, FlatList, ScrollView alike); the hide/show itself is a
 * UI-thread timing, so latency in detection never shows as jank.
 */
import { useFocusEffect } from 'expo-router';
import React, { createContext, useCallback, useContext, useMemo, useRef } from 'react';
import type { NativeScrollEvent, NativeSyntheticEvent } from 'react-native';
import { makeMutable, type SharedValue, useSharedValue } from 'react-native-reanimated';
import { duration, nextChromeHidden } from '@/theme/motion';
import { timing } from './anim';

interface ChromeCtx {
  /** 0 = tab bar shown, 1 = hidden (animated). */
  tabBarHidden: SharedValue<number>;
}

const fallback: ChromeCtx = { tabBarHidden: makeMutable(0) };
const Ctx = createContext<ChromeCtx>(fallback);

export function ScrollChromeProvider({ children }: { children: React.ReactNode }) {
  const tabBarHidden = useSharedValue(0);
  const value = useMemo(() => ({ tabBarHidden }), [tabBarHidden]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useTabBarHidden(): SharedValue<number> {
  return useContext(Ctx).tabBarHidden;
}

/** Imperatively show the tab bar (e.g. when a screen without lists focuses). */
export function useShowTabBarOnFocus() {
  const hidden = useTabBarHidden();
  useFocusEffect(
    useCallback(() => {
      hidden.value = timing(0, duration.medium);
    }, [hidden]),
  );
}

export interface ScrollChrome {
  /** Animated 0 (shown) → 1 (collapsed) for this screen's header. */
  progress: SharedValue<number>;
  onScroll: (e: NativeSyntheticEvent<NativeScrollEvent>) => void;
  scrollEventThrottle: number;
}

/**
 * Hook for a scrollable screen. Pass `drivesTabBar` on tab screens so the
 * bottom bar follows the header.
 */
export function useScrollChrome({ drivesTabBar = false }: { drivesTabBar?: boolean } = {}): ScrollChrome {
  const tabBarHidden = useTabBarHidden();
  const progress = useSharedValue(0);
  const last = useRef({ y: 0, hidden: false });

  useFocusEffect(
    useCallback(() => {
      // Coming back to a screen always shows the chrome.
      last.current.hidden = false;
      progress.value = timing(0, duration.medium);
      if (drivesTabBar) tabBarHidden.value = timing(0, duration.medium);
    }, [drivesTabBar, progress, tabBarHidden]),
  );

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y = e.nativeEvent.contentOffset.y;
      const st = last.current;
      const next = nextChromeHidden(st.hidden, y, y - st.y);
      st.y = y;
      if (next === st.hidden) return;
      st.hidden = next;
      const to = next ? 1 : 0;
      progress.value = timing(to, next ? duration.exit : duration.medium, next ? 'exit' : 'enter');
      if (drivesTabBar) tabBarHidden.value = timing(to, next ? duration.exit : duration.medium, next ? 'exit' : 'enter');
    },
    [drivesTabBar, progress, tabBarHidden],
  );

  return { progress, onScroll, scrollEventThrottle: 16 };
}
