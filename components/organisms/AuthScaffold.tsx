/** Shared layout for auth screens: brand mark, title, subtitle, content. */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import IconButton from '@/components/atoms/IconButton';
import { useTheme } from '@/theme';

export interface AuthScaffoldProps {
  title: string;
  subtitle?: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  onBack?: () => void;
  /** Rendered above the title (e.g. a progress ring). */
  hero?: React.ReactNode;
  footer?: React.ReactNode;
  children: React.ReactNode;
}

export default function AuthScaffold({
  title,
  subtitle,
  icon = 'pricetags',
  onBack,
  hero,
  footer,
  children,
}: AuthScaffoldProps) {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.canvas }]}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.topBar}>
          {onBack ? <IconButton icon="arrow-back" label="Retour" onPress={onBack} /> : <View style={styles.spacer} />}
        </View>
        <ScrollView
          contentContainerStyle={[styles.scroll, { paddingHorizontal: t.spacing.xl }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {hero ?? (
            <View style={[styles.mark, { backgroundColor: t.colors.brand, borderRadius: t.radius.lg }]}>
              <Ionicons name={icon} size={28} color={t.colors.onBrand} />
            </View>
          )}
          <AppText variant="h1" accessibilityRole="header" style={styles.title}>
            {title}
          </AppText>
          {!!subtitle && (
            <AppText variant="body" color="inkMuted" style={styles.subtitle}>
              {subtitle}
            </AppText>
          )}
          <View style={styles.content}>{children}</View>
          {footer && <View style={styles.footer}>{footer}</View>}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  topBar: { minHeight: 52, justifyContent: 'center', paddingHorizontal: 4 },
  spacer: { height: 48 },
  scroll: { flexGrow: 1, paddingBottom: 32 },
  mark: { width: 56, height: 56, alignItems: 'center', justifyContent: 'center', marginBottom: 20 },
  title: { marginBottom: 8 },
  subtitle: { marginBottom: 8 },
  content: { marginTop: 24 },
  footer: { marginTop: 'auto', paddingTop: 32, alignItems: 'center' },
});
