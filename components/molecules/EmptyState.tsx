import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';

export interface EmptyStateProps {
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
  secondaryLabel?: string;
  onSecondary?: () => void;
  tone?: 'neutral' | 'error';
}

/** Illustration + one clear next step (every list has one, MB-QA-02). */
export default function EmptyState({
  icon = 'sparkles-outline',
  title,
  message,
  actionLabel,
  onAction,
  secondaryLabel,
  onSecondary,
  tone = 'neutral',
}: EmptyStateProps) {
  const t = useTheme();
  const err = tone === 'error';
  return (
    <View style={styles.wrap} accessibilityRole={err ? 'alert' : undefined}>
      <View
        style={[
          styles.circle,
          { backgroundColor: err ? t.colors.dangerTint : t.colors.brandTint },
        ]}>
        <Ionicons name={icon} size={40} color={err ? t.colors.danger : t.colors.brandStrong} />
      </View>
      <AppText variant="h3" align="center" style={styles.title}>
        {title}
      </AppText>
      {!!message && (
        <AppText variant="small" color="inkMuted" align="center" style={styles.message}>
          {message}
        </AppText>
      )}
      {!!actionLabel && onAction && (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      )}
      {!!secondaryLabel && onSecondary && (
        <Button label={secondaryLabel} onPress={onSecondary} variant="ghost" />
      )}
    </View>
  );
}

export function ErrorState({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <EmptyState
      tone="error"
      icon="cloud-offline-outline"
      title="Oups, ça n'a pas chargé"
      message={message ?? 'Vérifiez votre connexion puis réessayez.'}
      actionLabel={onRetry ? 'Réessayer' : undefined}
      onAction={onRetry}
    />
  );
}

const styles = StyleSheet.create({
  wrap: { flexGrow: 1, alignItems: 'center', justifyContent: 'center', padding: 32 },
  circle: { width: 88, height: 88, borderRadius: 44, alignItems: 'center', justifyContent: 'center' },
  title: { marginTop: 16 },
  message: { marginTop: 6, maxWidth: 300 },
  action: { marginTop: 20 },
});
