import React from 'react';
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import Animated, { FadeIn, FadeOut, SlideInDown, SlideOutDown } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';

export interface SheetProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max height as fraction of the screen (default 0.85). */
  maxHeight?: `${number}%`;
  scroll?: boolean;
}

/** Bottom sheet (thumb zone, Fitts). Respects reduce-motion via reanimated. */
export default function Sheet({
  visible,
  onClose,
  title,
  children,
  footer,
  maxHeight = '85%',
  scroll = true,
}: SheetProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onClose} statusBarTranslucent>
      {visible && (
        <KeyboardAvoidingView
          style={styles.fill}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <Animated.View
            entering={FadeIn.duration(t.duration(t.motion.enter))}
            exiting={FadeOut.duration(t.duration(t.motion.exit))}
            style={[StyleSheet.absoluteFill, { backgroundColor: t.colors.scrim }]}>
            <Pressable
              style={styles.fill}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Fermer"
            />
          </Animated.View>
          <Animated.View
            entering={SlideInDown.duration(t.duration(t.motion.enter))}
            exiting={SlideOutDown.duration(t.duration(t.motion.exit))}
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                maxHeight,
                backgroundColor: t.colors.surface,
                borderTopLeftRadius: t.radius.lg,
                borderTopRightRadius: t.radius.lg,
                paddingBottom: Math.max(insets.bottom, 12),
              },
              t.elevation.sheet as any,
            ]}>
            <View style={[styles.handle, { backgroundColor: t.colors.line }]} />
            <View style={styles.header}>
              <AppText variant="h3" style={styles.flex} accessibilityRole="header">
                {title}
              </AppText>
              <IconButton icon="close" label="Fermer" onPress={onClose} />
            </View>
            {scroll ? (
              <ScrollView
                style={styles.flexShrink}
                contentContainerStyle={styles.content}
                keyboardShouldPersistTaps="handled">
                {children}
              </ScrollView>
            ) : (
              <View style={[styles.content, styles.flexShrink]}>{children}</View>
            )}
            {footer && <View style={[styles.footer, { borderTopColor: t.colors.line }]}>{footer}</View>}
          </Animated.View>
        </KeyboardAvoidingView>
      )}
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  flexShrink: { flexShrink: 1 },
  sheet: { position: 'absolute', left: 0, right: 0, bottom: 0 },
  handle: { width: 40, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: 8 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: 20, paddingRight: 8, paddingTop: 4 },
  content: { paddingHorizontal: 20, paddingBottom: 12 },
  footer: { paddingHorizontal: 20, paddingTop: 12, borderTopWidth: StyleSheet.hairlineWidth },
});
