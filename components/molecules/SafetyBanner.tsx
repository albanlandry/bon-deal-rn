import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

export interface SafetyBannerProps {
  title?: string;
  tips?: string[];
  onDismiss?: () => void;
  compact?: boolean;
}

export const DEFAULT_SAFETY_TIPS = [
  'Ne payez jamais d’avance, même un acompte.',
  'Rencontrez-vous dans un lieu public et fréquenté.',
  'Vérifiez l’article avant de payer.',
];

/**
 * Loss-framed safety advice (prospect theory) from BonDeal (authority).
 * Safety beats conversion: never hidden to reduce friction.
 */
export default function SafetyBanner({
  title = 'Ne perdez pas votre argent',
  tips = DEFAULT_SAFETY_TIPS,
  onDismiss,
  compact = false,
}: SafetyBannerProps) {
  const t = useTheme();
  return (
    <View
      accessibilityRole="summary"
      style={[
        styles.wrap,
        { backgroundColor: t.colors.trustTint, borderRadius: t.radius.md, borderColor: t.colors.trust },
      ]}>
      <Ionicons name="shield-checkmark" size={22} color={t.colors.trust} />
      <View style={styles.text}>
        <AppText variant="labelStrong" style={{ color: t.colors.ink }}>
          {title}
        </AppText>
        {(compact ? tips.slice(0, 1) : tips).map((tip) => (
          <AppText key={tip} variant="caption" color="inkMuted">
            • {tip}
          </AppText>
        ))}
        <AppText variant="caption" style={{ color: t.colors.trust, fontWeight: '600', marginTop: 2 }}>
          Conseils de sécurité BonDeal
        </AppText>
      </View>
      {onDismiss && (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Masquer les conseils de sécurité"
          onPress={onDismiss}
          hitSlop={12}
          style={styles.close}>
          <Ionicons name="close" size={18} color={t.colors.inkMuted} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', gap: 10, padding: 12, borderLeftWidth: 3 },
  text: { flex: 1, gap: 2 },
  close: { width: 32, height: 32, alignItems: 'center', justifyContent: 'center', marginTop: -6, marginRight: -6 },
});
