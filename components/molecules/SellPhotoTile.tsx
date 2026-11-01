/**
 * One photo tile of the Sell grid (docs/09 §4 Sell step 1). Photos fly in
 * (zoom + fade), siblings reflow with a spring when one moves, and a
 * long-press lifts the tile so it can be dragged to a new slot (Gesture
 * Handler Pan after long-press; transforms only). Screen readers get the
 * same moves through accessibility actions.
 */
import React, { useMemo, useState } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, ZoomIn } from 'react-native-reanimated';
import { haptics } from '@/lib/haptics';
import { duration } from '@/theme/motion';
import { ease, exitFade, layoutSpring, RM, spring } from '../motion/anim';
import { dropIndex } from './sellGrid';

export interface SellPhotoTileProps {
  index: number;
  count: number;
  cols: number;
  /** Cell width/height + gap (px); 0 until measured (drag disabled). */
  stepX: number;
  stepY: number;
  draggable: boolean;
  onMove: (from: number, to: number) => void;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
  accessibilityLabel?: string;
}

export default function SellPhotoTile({
  index,
  count,
  cols,
  stepX,
  stepY,
  draggable,
  onMove,
  style,
  children,
  accessibilityLabel,
}: SellPhotoTileProps) {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const lift = useSharedValue(0);
  const [dragging, setDragging] = useState(false);
  const enabled = draggable && count > 1 && stepX > 0;

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .enabled(enabled)
        .activateAfterLongPress(280)
        .onStart(() => {
          lift.value = spring(1, 'fast');
          runOnJS(setDragging)(true);
          runOnJS(haptics.selection)();
        })
        .onUpdate((e) => {
          tx.value = e.translationX;
          ty.value = e.translationY;
        })
        .onEnd((e) => {
          const to = dropIndex(index, e.translationX, e.translationY, cols, stepX, stepY, count);
          if (to !== index) runOnJS(onMove)(index, to);
        })
        .onFinalize(() => {
          tx.value = spring(0, 'default');
          ty.value = spring(0, 'default');
          lift.value = spring(0, 'fast');
          runOnJS(setDragging)(false);
        }),
    [enabled, index, cols, stepX, stepY, count, onMove],
  );

  const anim = useAnimatedStyle(() => ({
    transform: [{ translateX: tx.value }, { translateY: ty.value }, { scale: 1 + 0.06 * lift.value }],
    opacity: 1 - 0.1 * lift.value,
  }));

  const actions = [
    index > 0 ? { name: 'cover', label: 'Définir comme couverture' } : null,
    index > 0 ? { name: 'left', label: 'Déplacer à gauche' } : null,
    index < count - 1 ? { name: 'right', label: 'Déplacer à droite' } : null,
  ].filter(Boolean) as { name: string; label: string }[];

  return (
    <Animated.View
      entering={ZoomIn.duration(duration.medium).easing(ease.enter).reduceMotion(RM)}
      exiting={exitFade()}
      layout={layoutSpring()}
      style={[style, { zIndex: dragging ? 10 : 0, elevation: dragging ? 6 : 0 }]}
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={draggable ? actions : undefined}
      onAccessibilityAction={(e) => {
        const a = e.nativeEvent.actionName;
        if (a === 'cover') onMove(index, 0);
        else if (a === 'left') onMove(index, index - 1);
        else if (a === 'right') onMove(index, index + 1);
      }}>
      <GestureDetector gesture={pan}>
        <Animated.View style={[{ flex: 1 }, anim]}>{children}</Animated.View>
      </GestureDetector>
    </Animated.View>
  );
}
