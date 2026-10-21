/**
 * Bottom tab bar (docs/09 §2 "Labelled tabs ≤ 5"): text labels stay, the
 * active tab gets a pill indicator that slides (spring.default) with a
 * selection haptic, and the bar slides away on scroll down / returns on
 * scroll up (`useScrollChrome({ drivesTabBar: true })`).
 *
 * The bar is absolutely positioned so screens extend underneath it; lists add
 * `useTabBarInset()` as bottom padding.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { slotOffset } from '@/theme/motion';
import { spring } from './anim';
import PressableScale from './PressableScale';
import { useTabBarHidden } from './ScrollChrome';

export const TAB_BAR_HEIGHT = 64;
const PILL_W = 60;
const PILL_H = 32;

/** Bottom padding a tab screen's scroll content needs to clear the bar. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + Math.max(insets.bottom, 8) + 8;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

export interface AnimatedTabBarProps extends BottomTabBarProps {
  /** Route rendered as the raised centre action (e.g. "sell"). */
  centerRoute?: string;
  onCenterPress?: () => void;
  icons: Record<string, [IconName, IconName]>;
}

export default function AnimatedTabBar({ state, descriptors, navigation, centerRoute, onCenterPress, icons }: AnimatedTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();
  const [width, setWidth] = useState(0);
  const slot = width / Math.max(state.routes.length, 1);
  const pillX = useSharedValue(-1);
  const bottomPad = Math.max(insets.bottom, 8);
  const barH = TAB_BAR_HEIGHT + bottomPad;

  useEffect(() => {
    if (!slot) return;
    const x = slotOffset(state.index, slot, (slot - PILL_W) / 2);
    pillX.value = pillX.value < 0 ? x : spring(x, 'default');
  }, [state.index, slot, pillX]);

  const barStyle = useAnimatedStyle(() => ({ transform: [{ translateY: (barH + 16) * hidden.value }] }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillX.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(pillX.value, 0) }],
  }));
  const activeIsCenter = state.routes[state.index]?.name === centerRoute;

  return (
    <Animated.View
      style={[
        styles.bar,
        { height: barH, paddingBottom: bottomPad, backgroundColor: t.colors.surface, borderTopColor: t.colors.line },
        Platform.select({ android: { elevation: 8 }, default: t.elevation.sheet as object }),
        barStyle,
      ]}>
      <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {!activeIsCenter && (
          <Animated.View
            pointerEvents="none"
            style={[styles.pill, { backgroundColor: t.colors.brandTint }, pillStyle]}
          />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label = typeof options.title === 'string' ? options.title : route.name;

          if (route.name === centerRoute) {
            return (
              <PressableScale
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                haptic="light"
                onPress={onCenterPress}
                style={styles.slot}>
                <View
                  style={[
                    styles.center,
                    { backgroundColor: t.colors.brand, borderColor: t.colors.surface },
                    Platform.select({ android: { elevation: 4 }, default: t.elevation.card as object }),
                  ]}>
                  <Ionicons name="add" size={30} color={t.colors.onBrand} />
                </View>
                <AppText variant="captionStrong" style={{ color: t.colors.ink, marginTop: 2 }}>
                  {label}
                </AppText>
              </PressableScale>
            );
          }

          const [on, off] = icons[route.name] ?? ['ellipse', 'ellipse-outline'];
          const color = focused ? t.colors.brandStrong : t.colors.inkMuted;
          const badge = options.tabBarBadge;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ??
                (badge != null ? `${label}, ${badge} non lus` : label)
              }
              testID={options.tabBarButtonTestID}
              onPress={() => {
                const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                if (!focused && !event.defaultPrevented) {
                  haptics.selection();
                  navigation.navigate(route.name, route.params);
                }
              }}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={styles.slot}>
              <View style={styles.iconBox}>
                <Ionicons name={focused ? on : off} size={24} color={color} />
                {badge != null && (
                  <View style={[styles.badge, { backgroundColor: t.colors.brand, borderColor: t.colors.surface }]}>
                    <AppText variant="captionStrong" style={{ color: t.colors.onBrand, fontSize: 11, lineHeight: 14 }}>
                      {String(badge)}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText variant="captionStrong" style={{ color: focused ? t.colors.brandStrong : t.colors.inkMuted }} numberOfLines={1}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  bar: { position: 'absolute', left: 0, right: 0, bottom: 0, borderTopWidth: StyleSheet.hairlineWidth },
  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 6, minHeight: 56, gap: 2 },
  pill: { position: 'absolute', top: 6, left: 0, width: PILL_W, height: PILL_H, borderRadius: PILL_H / 2 },
  iconBox: { width: PILL_W, height: PILL_H, alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    top: -2,
    right: 8,
    minWidth: 20,
    height: 20,
    paddingHorizontal: 5,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    marginTop: -26,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
