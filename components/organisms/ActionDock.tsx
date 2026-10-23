/**
 * Floating action dock (docs/12 "Annonce"): a dark bar inset 12 dp from the
 * edges, above the safe area, radius.lg. It carries the screen's main
 * actions and, on top, the payment safety line (docs/06 guardrail: safety
 * advice is never hidden, so it lives next to the action, not below the
 * fold). Used by the item page, the deal page, the sell flow and
 * make-offer / boutique-eclair.
 *
 * The dock stays dark in both schemes (ink in light mode, a raised navy in
 * dark mode). `DockButton` renders the buttons for that dark ground:
 * `brand` (filled), `glass` (translucent white) and `danger`.
 *
 * Hosts pad their scroll content with `dockHeight + dockBottom(insets)`;
 * `onHeight` reports the measured height.
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import {
  ActivityIndicator,
  LayoutChangeEvent,
  StyleProp,
  StyleSheet,
  View,
  ViewStyle,
} from 'react-native';
import Animated from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { buttonRadius, font, useTheme } from '@/theme';
import { haptics } from '@/lib/haptics';
import AppText from '../atoms/AppText';
import PressableScale from '../motion/PressableScale';
import { exitDown, riseIn } from '../motion/anim';

/** Gap between the dock and the screen edges. */
export const DOCK_INSET = 12;

/** Colours of the dark dock ground, per scheme. */
export function useDockColors() {
  const t = useTheme();
  return t.isDark
    ? {
        bg: t.colors.surfaceAlt,
        border: t.colors.line,
        fg: t.colors.ink,
        fgMuted: t.colors.inkMuted,
        safety: t.colors.trust,
        glass: 'rgba(255,255,255,0.10)',
      }
    : {
        bg: t.colors.ink,
        border: t.colors.ink,
        fg: '#FFFFFF',
        fgMuted: '#B8C2D3', // 9.6:1 on ink
        safety: '#99E6DA', // light teal, 11:1 on ink
        glass: 'rgba(255,255,255,0.12)',
      };
}

/** Distance from the bottom of the screen to the dock's bottom edge. */
export function dockBottom(insetBottom: number) {
  return Math.max(insetBottom, 0) + DOCK_INSET;
}

export interface ActionDockProps {
  children: React.ReactNode;
  /** Safety line shown above the buttons; `true` = the default payment line. */
  safety?: string | boolean;
  /** Extra line under the buttons (e.g. why the next step is disabled). */
  note?: string;
  /** Content above the buttons (e.g. a progress line), on the dark ground. */
  top?: React.ReactNode;
  onHeight?: (h: number) => void;
  style?: StyleProp<ViewStyle>;
  /**
   * Entrance delay (ms): the dock rises in on mount (spring.default + fade)
   * and sinks out on unmount. Screens stagger it after their content, e.g.
   * `duration.step` after the item sheet.
   */
  enterDelay?: number;
}

export const DEFAULT_DOCK_SAFETY = 'Ne payez jamais d’avance. Remise en main propre.';

export default function ActionDock({ children, safety, note, top, onHeight, style, enterDelay = 0 }: ActionDockProps) {
  const t = useTheme();
  const c = useDockColors();
  const insets = useSafeAreaInsets();
  const line = safety === true ? DEFAULT_DOCK_SAFETY : safety || null;
  return (
    <Animated.View
      entering={riseIn({ delay: enterDelay })}
      exiting={exitDown()}
      onLayout={(e: LayoutChangeEvent) => onHeight?.(Math.round(e.nativeEvent.layout.height))}
      style={[
        styles.dock,
        {
          bottom: dockBottom(insets.bottom),
          backgroundColor: c.bg,
          borderColor: c.border,
          borderRadius: t.radius.lg,
        },
        style,
      ]}>
      {!!line && (
        <View style={styles.safety} accessibilityRole="text">
          <Ionicons name="shield-checkmark" size={14} color={c.safety} />
          <AppText variant="caption" style={[font('600'), styles.flex, { color: c.safety }]}>
            {line}
          </AppText>
        </View>
      )}
      {top}
      <View style={styles.row}>{children}</View>
      {!!note && (
        <AppText variant="caption" align="center" style={{ color: c.fgMuted }} accessibilityLiveRegion="polite">
          {note}
        </AppText>
      )}
    </Animated.View>
  );
}

export type DockButtonVariant = 'brand' | 'glass' | 'danger';

export interface DockButtonProps {
  label: string;
  onPress?: () => void;
  variant?: DockButtonVariant;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconRight?: React.ComponentProps<typeof Ionicons>['name'];
  loading?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  /** Fill the remaining width (default true). */
  grow?: boolean;
  accessibilityHint?: string;
  testID?: string;
}

/** A 48 dp button for the dark dock; corners = buttonRadius (8). */
export function DockButton({
  label,
  onPress,
  variant = 'brand',
  icon,
  iconRight,
  loading = false,
  disabled = false,
  haptic = false,
  grow = true,
  accessibilityHint,
  testID,
}: DockButtonProps) {
  const t = useTheme();
  const c = useDockColors();
  const p =
    variant === 'brand'
      ? { bg: t.colors.brand, fg: t.colors.onBrand }
      : variant === 'danger'
        ? { bg: t.colors.danger, fg: t.colors.onDanger }
        : { bg: c.glass, fg: c.fg };
  const inactive = disabled || loading;
  return (
    <PressableScale
      testID={testID}
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ disabled: inactive, busy: loading }}
      disabled={inactive}
      onPress={() => {
        if (haptic) haptics.light();
        onPress?.();
      }}
      style={[
        styles.btn,
        grow && styles.flex,
        { backgroundColor: p.bg, borderRadius: buttonRadius, opacity: disabled ? 0.45 : 1 },
      ]}>
      {loading ? (
        <ActivityIndicator color={p.fg} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={p.fg} />}
          <AppText variant="labelStrong" style={{ color: p.fg }} numberOfLines={1}>
            {label}
          </AppText>
          {iconRight && <Ionicons name={iconRight} size={18} color={p.fg} />}
        </>
      )}
    </PressableScale>
  );
}

const styles = StyleSheet.create({
  dock: {
    position: 'absolute',
    left: DOCK_INSET,
    right: DOCK_INSET,
    padding: 10,
    gap: 8,
    borderWidth: StyleSheet.hairlineWidth,
    shadowColor: '#0F1B2D',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 12 },
    elevation: 12,
  },
  safety: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 4 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  flex: { flex: 1 },
  btn: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 14,
  },
});
