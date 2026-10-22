/**
 * Floating dock (docs/12 "barre d’onglets flottante", direction B): a dark
 * bar detached from the screen edges (12 px inset, 14 px + safe area from
 * the bottom, 64 dp, radius.lg, soft shadow). Five slots — Accueil ·
 * Rechercher · Vendre · Messages · Moi — with the centre action as a brand
 * square (radius 8). Active tab = white icon + label and a small dot that
 * springs to it; inactive = muted. The dock slides away on scroll down and
 * returns on scroll up (`useScrollChrome({ drivesTabBar: true })`).
 *
 * The dock is dark in both schemes (ink in light mode, a raised navy in dark
 * mode with a hairline), so its own colours are fixed: muted #8E9BB0 on
 * #0F1B2D is 6.3:1, white 17:1.
 *
 * Renders whatever routes it is given. Per route, the icon comes from
 * `options.tabBarIcon`, else the `icons` prop, else DEFAULT_TAB_ICONS; the
 * label from `options.tabBarLabel` / `options.title`, else DEFAULT_TAB_LABELS.
 *
 * Absolutely positioned: tab screens add `useTabBarInset()` as bottom padding.
 */
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useEffect, useState } from 'react';
import { LayoutChangeEvent, Platform, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import { haptics } from '@/lib/haptics';
import { darkColors, font, lightColors, radius, useTheme } from '@/theme';
import { slotOffset } from '@/theme/motion';
import { spring } from './anim';
import PressableScale from './PressableScale';
import { useTabBarHidden } from './ScrollChrome';

export const TAB_BAR_HEIGHT = 64;
/** Gap between the dock and the screen's bottom edge (above the safe area). */
export const TAB_BAR_BOTTOM = 14;
/** Side inset of the dock. */
export const TAB_BAR_SIDE = 12;
const SELL = 48;
const DOT = 4;

/** Bottom padding a tab screen's scroll content needs to clear the dock. */
export function useTabBarInset(): number {
  const insets = useSafeAreaInsets();
  return TAB_BAR_HEIGHT + TAB_BAR_BOTTOM + insets.bottom + 12;
}

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** Fallback [focused, unfocused] icons by route name. */
export const DEFAULT_TAB_ICONS: Record<string, [IconName, IconName]> = {
  home: ['home', 'home-outline'],
  search: ['search', 'search-outline'],
  favorites: ['heart', 'heart-outline'],
  chat: ['chatbubbles', 'chatbubbles-outline'],
  profile: ['person', 'person-outline'],
};

/** Fallback labels by route name, used only when a route has no title. */
export const DEFAULT_TAB_LABELS: Record<string, string> = {
  home: 'Accueil',
  search: 'Rechercher',
  sell: 'Vendre',
  favorites: 'Favoris',
  chat: 'Messages',
  profile: 'Moi',
};

const DOCK = {
  light: { bg: lightColors.ink, border: 'transparent' },
  dark: { bg: darkColors.surfaceAlt, border: darkColors.line },
  on: '#FFFFFF',
  off: '#8E9BB0',
  dot: darkColors.brand,
  badgeBg: darkColors.danger,
  badgeText: lightColors.ink,
} as const;

export interface AnimatedTabBarProps extends BottomTabBarProps {
  /** Route rendered as the centre action (e.g. "sell"). */
  centerRoute?: string;
  onCenterPress?: () => void;
  /** Per-route [focused, unfocused] icons; overrides DEFAULT_TAB_ICONS. */
  icons?: Record<string, [IconName, IconName]>;
  /** Icon of the centre action (default "add"). */
  centerIcon?: IconName;
}

export default function AnimatedTabBar({
  state,
  descriptors,
  navigation,
  centerRoute,
  onCenterPress,
  icons,
  centerIcon = 'add',
}: AnimatedTabBarProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const hidden = useTabBarHidden();
  const [width, setWidth] = useState(0);
  const slot = width / Math.max(state.routes.length, 1);
  const dotX = useSharedValue(-1);
  const bottom = TAB_BAR_BOTTOM + insets.bottom;
  const dock = t.isDark ? DOCK.dark : DOCK.light;
  const activeIsCenter = state.routes[state.index]?.name === centerRoute;

  useEffect(() => {
    if (!slot) return;
    const x = slotOffset(state.index, slot, (slot - DOT) / 2);
    dotX.value = dotX.value < 0 ? x : spring(x, 'default');
  }, [state.index, slot, dotX]);

  // Slides fully below the screen edge (transform only, UI thread).
  const barStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: (TAB_BAR_HEIGHT + bottom + 24) * hidden.value }],
  }));
  const dotStyle = useAnimatedStyle(() => ({
    opacity: dotX.value < 0 ? 0 : 1,
    transform: [{ translateX: Math.max(dotX.value, 0) }],
  }));

  return (
    <Animated.View
      style={[
        styles.dock,
        shadow,
        { bottom, backgroundColor: dock.bg, borderColor: dock.border, borderRadius: radius.lg },
        barStyle,
      ]}>
      <View style={styles.row} onLayout={(e: LayoutChangeEvent) => setWidth(e.nativeEvent.layout.width)}>
        {!activeIsCenter && (
          <Animated.View pointerEvents="none" style={[styles.dot, { backgroundColor: DOCK.dot }, dotStyle]} />
        )}
        {state.routes.map((route, index) => {
          const { options } = descriptors[route.key];
          const focused = state.index === index;
          const label =
            typeof options.tabBarLabel === 'string'
              ? options.tabBarLabel
              : typeof options.title === 'string'
                ? options.title
                : (DEFAULT_TAB_LABELS[route.name] ?? route.name);

          if (route.name === centerRoute) {
            return (
              <PressableScale
                key={route.key}
                accessibilityRole="button"
                accessibilityLabel={options.tabBarAccessibilityLabel ?? label}
                haptic="light"
                onPress={
                  onCenterPress ??
                  (() => {
                    const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
                    if (!focused && !event.defaultPrevented) navigation.navigate(route.name, route.params);
                  })
                }
                style={styles.slot}>
                <View style={[styles.sell, { backgroundColor: t.colors.brand }]}>
                  <Ionicons name={centerIcon} size={26} color={t.colors.onBrand} />
                </View>
              </PressableScale>
            );
          }

          const [on, off] = icons?.[route.name] ?? DEFAULT_TAB_ICONS[route.name] ?? ['ellipse', 'ellipse-outline'];
          const color = focused ? DOCK.on : DOCK.off;
          const badge = options.tabBarBadge;
          return (
            <PressableScale
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={
                options.tabBarAccessibilityLabel ?? (badge != null ? `${label}, ${badge} non lus` : label)
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
                {options.tabBarIcon ? (
                  options.tabBarIcon({ focused, color, size: 22 })
                ) : (
                  <Ionicons name={focused ? on : off} size={22} color={color} />
                )}
                {badge != null && (
                  <View style={[styles.badge, { backgroundColor: DOCK.badgeBg }]}>
                    <AppText style={[styles.badgeText, { color: DOCK.badgeText }]} maxFontSizeMultiplier={1.2}>
                      {String(badge)}
                    </AppText>
                  </View>
                )}
              </View>
              <AppText style={[styles.label, { color }]} numberOfLines={1} maxFontSizeMultiplier={1.2}>
                {label}
              </AppText>
            </PressableScale>
          );
        })}
      </View>
    </Animated.View>
  );
}

const shadow = Platform.select({
  android: { elevation: 12 },
  default: {
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.3,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 10 },
  },
});

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: TAB_BAR_SIDE,
    right: TAB_BAR_SIDE,
    height: TAB_BAR_HEIGHT,
    paddingHorizontal: 6,
    borderWidth: StyleSheet.hairlineWidth,
  },
  row: { flex: 1, flexDirection: 'row', alignItems: 'stretch' },
  slot: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 2 },
  iconBox: { height: 24, minWidth: 32, alignItems: 'center', justifyContent: 'center' },
  label: { ...font('600'), fontSize: 11, lineHeight: 14 },
  dot: { position: 'absolute', bottom: 5, left: 0, width: DOT, height: DOT, borderRadius: DOT / 2 },
  badge: {
    position: 'absolute',
    top: -5,
    left: 18,
    minWidth: 16,
    height: 16,
    paddingHorizontal: 3,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: { ...font('700'), fontSize: 9, lineHeight: 12 },
  sell: { width: SELL, height: SELL, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
});
