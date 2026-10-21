/**
 * Gesture-driven bottom sheet (docs/09 §3): Gesture Handler + Reanimated, no
 * extra library. Drag the handle/header between 2–3 `snapPoints` (fractions
 * of the screen height) or down to dismiss; springs use spring.default; the
 * scrim fades with the drag. With "reduce motion", positions jump.
 *
 * API-compatible with the previous `organisms/Sheet` (visible / onClose /
 * title / footer / maxHeight / scroll).
 */
import React, { useEffect, useMemo, useState } from 'react';
import {
  Dimensions,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { duration, pickSnap } from '@/theme/motion';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';
import { spring, timing } from './anim';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max height as fraction of the screen (default 85%) when no snapPoints. */
  maxHeight?: `${number}%`;
  scroll?: boolean;
  /** e.g. [0.5, 0.9]: fixed-height sheet that snaps between these heights. */
  snapPoints?: number[];
  /** Index into snapPoints to open at (default 0). */
  initialSnap?: number;
}

export { pickSnap };

export default function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '85%',
  scroll = true,
  snapPoints,
  initialSnap = 0,
}: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { height: H } = useWindowDimensions();
  const [mounted, setMounted] = useState(visible);
  const [measured, setMeasured] = useState(0);

  const fixedH = snapPoints?.length ? Math.round(Math.max(...snapPoints) * H) : 0;
  const snaps = useMemo(
    () => (snapPoints?.length ? snapPoints.map((p) => fixedH - Math.round(p * H)) : [0]),
    [snapPoints, fixedH, H],
  );
  const sheetH = fixedH || measured || H;
  const closeY = sheetH + 24;
  const openY = snaps[Math.min(initialSnap, snaps.length - 1)] ?? 0;

  const y = useSharedValue(H);
  // Android modals don't resize for the soft keyboard: sit the sheet on top
  // of it and cap its height to the space left (layout, not animation).
  const [kbH, setKbH] = useState(0);
  useEffect(() => {
    if (Platform.OS !== 'android' || !mounted) return;
    const show = Keyboard.addListener('keyboardDidShow', (e) =>
      // The modal spans the whole screen (incl. the nav bar), so measure from
      // the keyboard's top edge rather than its reported height.
      setKbH(Math.max(e.endCoordinates.height, Dimensions.get('screen').height - e.endCoordinates.screenY)),
    );
    const hide = Keyboard.addListener('keyboardDidHide', () => setKbH(0));
    return () => {
      show.remove();
      hide.remove();
      setKbH(0);
    };
  }, [mounted]);
  const start = useSharedValue(0);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  // Enter once mounted (and measured for content-sized sheets); exit on close.
  useEffect(() => {
    if (!mounted) return;
    if (visible) {
      if (!fixedH && !measured) return;
      if (y.value >= closeY - 1 || y.value === H) y.value = closeY;
      y.value = spring(openY, 'default');
    } else {
      y.value = timing(closeY, duration.exit, 'exit', (done) => {
        'worklet';
        if (done) runOnJS(setMounted)(false);
      });
    }
  }, [visible, mounted, measured, fixedH, openY, closeY]);

  // With the keyboard up, a snapping sheet opens fully (its height is capped).
  useEffect(() => {
    if (kbH && fixedH && visible) y.value = spring(Math.min(...snaps), 'default');
  }, [kbH]);

  const pan = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY([-6, 6])
        .onStart(() => {
          start.value = y.value;
        })
        .onUpdate((e) => {
          const top = Math.min(...snaps);
          const next = start.value + e.translationY;
          // Rubber-band above the highest snap.
          y.value = next < top ? top - Math.sqrt(top - next) * 2 : next;
        })
        .onEnd((e) => {
          const target = pickSnap(y.value, e.velocityY, snaps, closeY);
          if (target === closeY) {
            runOnJS(onClose)();
          } else {
            y.value = spring(target, 'default');
          }
        }),
    [snaps, closeY, onClose],
  );

  const sheetStyle = useAnimatedStyle(() => ({ transform: [{ translateY: y.value }] }));
  // Keep the footer on screen at lower snap points of a fixed-height sheet.
  const topSnap = Math.min(...snaps);
  const lowSnap = Math.max(...snaps);
  const footerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: -Math.max(Math.min(y.value, lowSnap) - topSnap, 0) }],
  }));
  const scrimStyle = useAnimatedStyle(() => ({
    opacity: interpolate(y.value, [Math.max(...snaps), closeY], [1, 0], 'clamp'),
  }));

  if (!mounted) return null;

  return (
    <Modal visible transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      <GestureHandlerRootView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }, scrimStyle]}>
            <Pressable style={styles.fill} onPress={onClose} accessibilityRole="button" accessibilityLabel="Fermer" />
          </Animated.View>
          <Animated.View
            accessibilityViewIsModal
            onLayout={(e) => {
              if (!fixedH) setMeasured(Math.round(e.nativeEvent.layout.height));
            }}
            style={[
              styles.sheet,
              {
                backgroundColor: t.colors.surface,
                borderTopLeftRadius: t.radius.lg + 4,
                borderTopRightRadius: t.radius.lg + 4,
                paddingBottom: Math.max(insets.bottom, 12),
              },
              fixedH ? { height: kbH ? Math.min(fixedH, H - kbH - insets.top - 8) : fixedH } : { maxHeight: kbH ? H - kbH - insets.top - 8 : maxHeight },
              kbH ? { bottom: kbH, paddingBottom: 8 } : null,
              t.elevation.sheet as any,
              sheetStyle,
            ]}>
            <GestureDetector gesture={pan}>
              <View collapsable={false}>
                <View style={styles.handleZone} accessibilityElementsHidden importantForAccessibility="no">
                  <View style={[styles.handle, { backgroundColor: t.colors.inkSubtle }]} />
                </View>
                <View style={styles.header}>
                  <AppText variant="h3" style={styles.flex} accessibilityRole="header">
                    {title}
                  </AppText>
                  <IconButton icon="close" label="Fermer" onPress={onClose} />
                </View>
              </View>
            </GestureDetector>
            {scroll ? (
              <ScrollView
                style={fixedH ? styles.flex : styles.flexShrink}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.content, fixedH ? styles.flex : styles.flexShrink]}>{children}</View>
            )}
            {footer && (
              <Animated.View
                style={[styles.footer, { borderTopColor: t.colors.line, backgroundColor: t.colors.surface }, fixedH ? footerStyle : null]}>
                {/* Covers the sheet body that sits below a lifted footer. */}
                {!!fixedH && <View pointerEvents="none" style={[styles.footerFill, { backgroundColor: t.colors.surface }]} />}
                {footer}
              </Animated.View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </GestureHandlerRootView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  handleZone: { alignItems: 'center', paddingTop: 10, paddingBottom: 4 },
  handle: { width: 40, height: 4, borderRadius: 2, opacity: 0.5 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
  footerFill: { position: 'absolute', top: '100%', left: 0, right: 0, height: 2000 },
});
