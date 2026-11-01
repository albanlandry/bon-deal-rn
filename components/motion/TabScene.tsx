/**
 * Tab content entrance (docs/09 §3): when a tab GAINS focus its content
 * fades in and settles from `offset.tab` dp below in `duration.tab` ms.
 *
 * Driven by the tab navigator's active route, not `useIsFocused`, so it does
 * not replay when a pushed stack screen (item page, chat…) is popped back to
 * the tab, nor on re-renders. Used once, as the tab navigator's
 * `screenLayout`. ReduceMotion.System: content appears at once.
 */
import { useNavigationState } from '@react-navigation/native';
import React, { useEffect } from 'react';
import { StyleSheet } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { duration, offset } from '@/theme/motion';
import { timing } from './anim';

export default function TabScene({ routeKey, children }: { routeKey: string; children: React.ReactNode }) {
  const active = useNavigationState((s) => s?.routes?.[s.index ?? 0]?.key === routeKey);
  const v = useSharedValue(active ? 0 : 1);

  useEffect(() => {
    if (!active) return;
    v.value = 0;
    v.value = timing(1, duration.tab, 'enter');
  }, [active, v]);

  const style = useAnimatedStyle(() => ({
    opacity: v.value,
    transform: [{ translateY: (1 - v.value) * offset.tab }],
  }));

  return <Animated.View style={[styles.fill, style]}>{children}</Animated.View>;
}

const styles = StyleSheet.create({ fill: { flex: 1 } });
