/**
 * Screen header. Default: compact 56 dp bar (back arrow, h3 title, right
 * actions). `large` (docs/12 "grands titres"): a 30 px bold title, left
 * aligned, with optional right actions on its line; the back arrow, when
 * shown, sits on its own row above the title.
 */
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { font, useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show the back arrow (default true). */
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  /** Large left-aligned title (28–32 px) with the actions on its line. */
  large?: boolean;
  border?: boolean;
  style?: StyleProp<ViewStyle>;
}

/** Large-title text style, shared with screens that draw their own header. */
export const LARGE_TITLE = { ...font('700'), fontSize: 30, lineHeight: 36, letterSpacing: -0.6 } as const;

export default function ScreenHeader({
  title,
  subtitle,
  back = true,
  onBack,
  right,
  large = false,
  border = false,
  style,
}: ScreenHeaderProps) {
  const t = useTheme();
  const router = useRouter();
  const goBack = onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')));

  if (large) {
    return (
      <View
        style={[
          styles.large,
          { backgroundColor: t.colors.canvas, borderBottomColor: border ? t.colors.line : 'transparent' },
          style,
        ]}>
        {back && (
          <View style={styles.backRow}>
            <IconButton icon="arrow-back" label="Retour" onPress={goBack} />
          </View>
        )}
        <View style={[styles.largeRow, !back && { paddingTop: t.spacing.xs }]}>
          <View style={styles.flex}>
            {!!title && (
              <AppText
                style={[LARGE_TITLE, { color: t.colors.ink }]}
                numberOfLines={2}
                maxFontSizeMultiplier={1.3}
                accessibilityRole="header">
                {title}
              </AppText>
            )}
            {!!subtitle && (
              <AppText variant="small" color="inkMuted" numberOfLines={2} style={styles.subtitle}>
                {subtitle}
              </AppText>
            )}
          </View>
          {right ? <View style={styles.right}>{right}</View> : null}
        </View>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.canvas,
          borderBottomColor: border ? t.colors.line : 'transparent',
          paddingLeft: back ? 4 : t.spacing.md,
        },
        style,
      ]}>
      {back && <IconButton icon="arrow-back" label="Retour" onPress={goBack} />}
      <View style={styles.titles}>
        {!!title && (
          <AppText variant="h3" numberOfLines={1} accessibilityRole="header">
            {title}
          </AppText>
        )}
        {!!subtitle && (
          <AppText variant="caption" color="inkMuted" numberOfLines={1}>
            {subtitle}
          </AppText>
        )}
      </View>
      {right ? <View style={styles.right}>{right}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 56,
    paddingRight: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
  },
  titles: { flex: 1, paddingHorizontal: 4 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  large: { paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  backRow: { flexDirection: 'row', paddingLeft: 4, minHeight: 48, alignItems: 'center' },
  largeRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingLeft: 16, paddingRight: 8 },
  flex: { flex: 1 },
  subtitle: { marginTop: 2 },
});
