import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';

export interface ScreenHeaderProps {
  title?: string;
  subtitle?: string;
  /** Show the back arrow (default true). */
  back?: boolean;
  onBack?: () => void;
  right?: React.ReactNode;
  large?: boolean;
  border?: boolean;
}

export default function ScreenHeader({
  title,
  subtitle,
  back = true,
  onBack,
  right,
  large = false,
  border = false,
}: ScreenHeaderProps) {
  const t = useTheme();
  const router = useRouter();
  return (
    <View
      style={[
        styles.bar,
        {
          backgroundColor: t.colors.canvas,
          borderBottomColor: border ? t.colors.line : 'transparent',
          paddingLeft: back ? 4 : t.spacing.md,
        },
      ]}>
      {back && (
        <IconButton
          icon="arrow-back"
          label="Retour"
          onPress={onBack ?? (() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home')))}
        />
      )}
      <View style={styles.titles}>
        {!!title && (
          <AppText variant={large ? 'h1' : 'h3'} numberOfLines={1} accessibilityRole="header">
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
  right: { flexDirection: 'row', alignItems: 'center' },
});
