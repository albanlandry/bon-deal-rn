import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import AppText from './AppText';

export type BadgeTone = 'neutral' | 'brand' | 'trust' | 'success' | 'warning' | 'danger' | 'overlay';

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  style?: StyleProp<ViewStyle>;
}

export default function Badge({ label, tone = 'neutral', icon, style }: BadgeProps) {
  const t = useTheme();
  const c = t.colors;
  const map: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: c.surfaceAlt, fg: c.inkMuted },
    brand: { bg: c.brandTint, fg: c.brandStrong },
    trust: { bg: c.trustTint, fg: c.trust },
    success: { bg: c.successTint, fg: c.success },
    warning: { bg: c.warningTint, fg: c.warning },
    danger: { bg: c.dangerTint, fg: t.isDark ? c.danger : c.ink },
    overlay: { bg: c.overlay, fg: c.onOverlay },
  };
  const p = map[tone];
  return (
    <View style={[styles.base, { backgroundColor: p.bg, borderRadius: t.radius.xs }, style]}>
      {icon && <Ionicons name={icon} size={12} color={p.fg} />}
      <AppText variant="captionStrong" style={{ color: p.fg }} numberOfLines={1}>
        {label}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
});
