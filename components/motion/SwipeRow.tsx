/**
 * Swipe actions with spring snap (docs/09 §4 Messages / Notifications).
 * Swipe right → `left` action (e.g. "Marquer lu"), swipe left → `right`
 * action (e.g. "Archiver"). The action icon scales in as you drag; past the
 * threshold the action fires on release and the row springs back. Screen
 * readers get the same actions through `accessibilityActions`.
 */
import { Ionicons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { interpolate, runOnJS, type SharedValue, useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { SWIPE_THRESHOLD, swipeOutcome } from '@/theme/motion';
import AppText from '../atoms/AppText';
import { spring } from './anim';

export { SWIPE_THRESHOLD, swipeOutcome };

export interface SwipeAction {
  label: string;
  icon: React.ComponentProps<typeof Ionicons>['name'];
  /** Background + foreground of the revealed area. */
  color: string;
  onColor: string;
  onAction: () => void;
}

export interface SwipeRowProps {
  children: React.ReactNode;
  left?: SwipeAction;
  right?: SwipeAction;
  style?: StyleProp<ViewStyle>;
  enabled?: boolean;
}

function Reveal({ action, side, x }: { action: SwipeAction; side: 'left' | 'right'; x: SharedValue<number> }) {
  const iconStyle = useAnimatedStyle(() => {
    const d = side === 'left' ? x.value : -x.value;
    return {
      opacity: interpolate(d, [0, 24, SWIPE_THRESHOLD], [0, 0.6, 1], 'clamp'),
      transform: [{ scale: interpolate(d, [0, SWIPE_THRESHOLD, SWIPE_THRESHOLD + 30], [0.6, 1, 1.1], 'clamp') }],
    };
  });
  const bgStyle = useAnimatedStyle(() => ({
    opacity: side === 'left' ? (x.value > 0 ? 1 : 0) : x.value < 0 ? 1 : 0,
  }));
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        styles.reveal,
        { backgroundColor: action.color, justifyContent: side === 'left' ? 'flex-start' : 'flex-end' },
        bgStyle,
      ]}>
      <Animated.View style={[styles.revealInner, iconStyle]}>
        <Ionicons name={action.icon} size={22} color={action.onColor} />
        <AppText variant="captionStrong" style={{ color: action.onColor }}>
          {action.label}
        </AppText>
      </Animated.View>
    </Animated.View>
  );
}

export default function SwipeRow({ children, left, right, style, enabled = true }: SwipeRowProps) {
  const t = useTheme();
  const x = useSharedValue(0);
  const crossed = useSharedValue(0);

  const fire = (side: 'left' | 'right') => {
    const a = side === 'left' ? left : right;
    a?.onAction();
  };

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled && !!(left || right))
        .activeOffsetX([-14, 14])
        .failOffsetY([-10, 10])
        .onUpdate((e) => {
          let v = e.translationX;
          if (!left && v > 0) v = 0;
          if (!right && v < 0) v = 0;
          // Resistance past the threshold.
          const a = Math.abs(v);
          if (a > SWIPE_THRESHOLD) v = Math.sign(v) * (SWIPE_THRESHOLD + (a - SWIPE_THRESHOLD) * 0.35);
          x.value = v;
          const over = swipeOutcome(v) ? 1 : 0;
          if (over !== crossed.value) {
            crossed.value = over;
            if (over) runOnJS(haptics.selection)();
          }
        })
        .onEnd(() => {
          const out = swipeOutcome(x.value);
          x.value = spring(0, 'fast');
          crossed.value = 0;
          if (out) runOnJS(fire)(out);
        }),
    [enabled, left, right],
  );

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }] }));

  const actions = [left, right].filter(Boolean) as SwipeAction[];
  return (
    <View
      style={[styles.wrap, style]}
      accessibilityActions={actions.map((a) => ({ name: a.label, label: a.label }))}
      onAccessibilityAction={(e) => actions.find((a) => a.label === e.nativeEvent.actionName)?.onAction()}>
      {left && <Reveal action={left} side="left" x={x} />}
      {right && <Reveal action={right} side="right" x={x} />}
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ backgroundColor: t.colors.surface }, rowStyle]}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { overflow: 'hidden' },
  reveal: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 24 },
  revealInner: { alignItems: 'center', gap: 2, minWidth: 64 },
});
