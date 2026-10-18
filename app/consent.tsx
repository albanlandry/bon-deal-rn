// app/consent.tsx — Blocking legal consent (MB-AUTH-03). Shown before the
// tabs whenever GET /auth/me reports `consent_required` (new account, or the
// terms / privacy policy changed). Accepting records the CURRENT versions
// (POST /auth/me/consents). The only other way out is signing out.
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Href, Redirect, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { BackHandler, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { AppText, Button, Card, showToast } from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { acceptConsents, legalVersionsQuery } from '@/lib/api/account';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export default function ConsentScreen() {
  const t = useTheme();
  const router = useRouter();
  const qc = useQueryClient();
  const { user, refreshUser, signOut } = useAuth();
  const legal = useQuery(legalVersionsQuery());
  const [checked, setChecked] = useState(false);
  const required = user?.consent_required ?? [];
  // Seen before (accepted an older version) vs. brand-new acceptance.
  const isUpdate = !!user?.created_at && Date.now() - new Date(user.created_at).getTime() > 86400000;

  // Hardware back must not skip the gate.
  useFocusEffect(
    React.useCallback(() => {
      const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
      return () => sub.remove();
    }, []),
  );

  const accept = useMutation({
    mutationFn: () => acceptConsents(required.length ? required : undefined),
    onSuccess: async () => {
      haptics.success();
      await refreshUser();
      router.replace('/(tabs)/home');
    },
    onError: () => showToast.error('Échec', 'Impossible d’enregistrer votre accord. Réessayez.'),
  });

  const leave = async () => {
    try {
      await signOut();
    } finally {
      qc.clear();
      router.replace('/login');
    }
  };

  if (user && required.length === 0) return <Redirect href="/(tabs)/home" />;

  const docs = [
    required.includes('terms') && {
      label: 'Conditions d’utilisation',
      version: legal.data?.terms_version,
    },
    required.includes('privacy') && {
      label: 'Politique de confidentialité',
      version: legal.data?.privacy_version,
    },
  ].filter(Boolean) as { label: string; version?: string }[];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.icon, { backgroundColor: t.colors.brandTint }]}>
            <Ionicons name="document-text" size={40} color={t.colors.brandStrong} />
          </View>
          <AppText variant="h2" align="center" accessibilityRole="header">
            {isUpdate ? 'Nos conditions évoluent' : 'Bienvenue sur BonDeal'}
          </AppText>
          <AppText variant="small" color="inkMuted" align="center">
            {isUpdate
              ? 'Pour continuer à utiliser BonDeal, prenez connaissance des nouvelles versions ci-dessous et acceptez-les.'
              : 'Avant de commencer, prenez connaissance de nos conditions et de la façon dont nous protégeons vos données.'}
          </AppText>
        </View>

        <Card style={styles.docs}>
          {docs.map((d) => (
            <View key={d.label} style={styles.docRow}>
              <Ionicons name="document-outline" size={20} color={t.colors.inkMuted} />
              <View style={styles.flex}>
                <AppText variant="bodyStrong">{d.label}</AppText>
                {!!d.version && (
                  <AppText variant="caption" color="inkMuted">
                    Version {d.version}
                  </AppText>
                )}
              </View>
            </View>
          ))}
          <Button
            label="Lire les conditions"
            icon="open-outline"
            variant="secondary"
            size="sm"
            onPress={() => router.push({ pathname: '/terms-and-conditions', params: { mode: 'read' } } as Href)}
            style={styles.read}
          />
        </Card>

        <Pressable
          accessibilityRole="checkbox"
          accessibilityState={{ checked }}
          onPress={() => {
            haptics.selection();
            setChecked((c) => !c);
          }}
          style={[
            styles.check,
            {
              borderColor: checked ? t.colors.brandStrong : t.colors.line,
              backgroundColor: checked ? t.colors.brandTint : t.colors.surface,
              borderRadius: t.radius.md,
            },
          ]}>
          <View
            style={[
              styles.box,
              { borderColor: checked ? t.colors.brand : t.colors.inkSubtle, backgroundColor: checked ? t.colors.brand : 'transparent' },
            ]}>
            {checked && <Ionicons name="checkmark" size={18} color={t.colors.onBrand} />}
          </View>
          <AppText variant="body" style={styles.flex}>
            J’ai lu et j’accepte les conditions d’utilisation et la politique de confidentialité de BonDeal.
          </AppText>
        </Pressable>

        <AppText variant="caption" color="inkMuted" style={styles.note}>
          Les messages marketing restent désactivés tant que vous ne les activez pas dans Paramètres › Notifications.
        </AppText>
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.line }]}>
        <Button
          label="Accepter et continuer"
          onPress={() => accept.mutate()}
          loading={accept.isPending}
          disabled={!checked}
          disabledReason={!checked ? 'Cochez la case pour accepter.' : undefined}
          fullWidth
          size="lg"
        />
        <Button label="Refuser et me déconnecter" variant="ghost" onPress={leave} fullWidth />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 24, gap: 16 },
  hero: { alignItems: 'center', gap: 8, marginTop: 16 },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  docs: { gap: 12 },
  docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  read: { alignSelf: 'flex-start' },
  check: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderWidth: 1, minHeight: 56 },
  box: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  note: { paddingHorizontal: 4 },
  footer: { padding: 16, gap: 4, borderTopWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1 },
});
