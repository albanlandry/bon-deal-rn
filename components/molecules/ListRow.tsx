import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import PressableScale from '../motion/PressableScale';
import SpringSwitch from './SpringSwitch';
import { ColorTokens, useTheme } from '@/theme';
import AppText from '../atoms/AppText';

export interface ListRowProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  iconColor?: keyof ColorTokens;
  title: string;
  subtitle?: string;
  value?: string;
  onPress?: () => void;
  /** Renders a switch instead of a chevron. */
  toggle?: { value: boolean; onChange: (v: boolean) => void; disabled?: boolean };
  destructive?: boolean;
  chevron?: boolean;
  last?: boolean;
}

/** Settings-style grouped row, ≥ 56 dp tall. */
export default function ListRow({
  icon,
  iconColor = 'inkMuted',
  title,
  subtitle,
  value,
  onPress,
  toggle,
  destructive,
  chevron = !!onPress && !toggle,
  last,
}: ListRowProps) {
  const t = useTheme();
  const content = (
    <>
      {icon && (
        <View
          style={[
            styles.icon,
            { backgroundColor: destructive ? t.colors.dangerTint : t.colors.surfaceAlt, borderRadius: t.radius.sm },
          ]}>
          <Ionicons name={icon} size={20} color={destructive ? t.colors.danger : t.colors[iconColor]} />
        </View>
      )}
      <View style={styles.text}>
        <AppText variant={destructive ? 'bodyStrong' : 'body'} style={destructive ? { color: t.colors.danger } : undefined}>
          {title}
        </AppText>
        {!!subtitle && (
          <AppText variant="caption" color="inkMuted">
            {subtitle}
          </AppText>
        )}
      </View>
      {!!value && (
        <AppText variant="small" color="inkMuted" numberOfLines={1} style={styles.value}>
          {value}
        </AppText>
      )}
      {toggle && (
        <SpringSwitch value={toggle.value} disabled={toggle.disabled} />
      )}
      {chevron && <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />}
    </>
  );
  const rowStyle = [
    styles.row,
    { borderBottomColor: t.colors.line, borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth },
  ];
  if (toggle) {
    return (
      <PressableScale
        accessibilityRole="switch"
        accessibilityState={{ checked: toggle.value, disabled: toggle.disabled }}
        accessibilityLabel={subtitle ? `${title}. ${subtitle}` : title}
        haptic={toggle.disabled ? false : 'selection'}
        scaleTo={0.99}
        onPress={() => !toggle.disabled && toggle.onChange(!toggle.value)}
        style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  if (onPress) {
    return (
      <PressableScale accessibilityRole="button" accessibilityLabel={title} onPress={onPress} scaleTo={0.98} style={rowStyle}>
        {content}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{content}</View>;
}

/** Group wrapper with an optional section title. */
export function ListGroup({ title, children }: { title?: string; children: React.ReactNode }) {
  const t = useTheme();
  return (
    <View style={styles.group}>
      {!!title && (
        <AppText variant="captionStrong" color="inkMuted" style={styles.groupTitle} accessibilityRole="header">
          {title.toUpperCase()}
        </AppText>
      )}
      <View
        style={{
          backgroundColor: t.colors.surface,
          borderRadius: t.radius.md,
          borderWidth: 1,
          borderColor: t.colors.line,
          overflow: 'hidden',
        }}>
        {children}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 8 },
  icon: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  text: { flex: 1 },
  value: { maxWidth: '40%' },
  group: { marginBottom: 24 },
  groupTitle: { marginLeft: 4, marginBottom: 8, letterSpacing: 0.5 },
});
