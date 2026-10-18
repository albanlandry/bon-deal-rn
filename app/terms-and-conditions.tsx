// app/terms-and-conditions.tsx — Conditions d'utilisation (read-only)
// What BonDeal does with your data, the guarantees, and the current legal
// versions (GET /legal). Acceptance is recorded on the server: new members
// accept at signup, and anyone who still has to accept the current version
// is sent to the blocking /consent screen before the tabs.
// Marketing messages are a notification preference (Paramètres ›
// Notifications), off by default.
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText, Button, Card, ScreenHeader } from '@/components/ui';
import { legalVersionsQuery } from '@/lib/api/account';

interface ConsentItemProps {
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

function ConsentItem({ title, description, isChecked, onToggle, disabled }: ConsentItemProps) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: isChecked, disabled }}
      accessibilityLabel={title}
      accessibilityHint={description}
      onPress={onToggle}
      disabled={disabled}
      style={({ pressed }) => [
        styles.consentItem,
        {
          backgroundColor: isChecked ? t.colors.brandTint : t.colors.surface,
          borderColor: isChecked ? t.colors.brandStrong : t.colors.line,
          borderRadius: t.radius.md,
          opacity: pressed ? 0.85 : 1,
        },
      ]}>
      {!disabled && (
        <View
          style={[
            styles.checkbox,
            {
              borderColor: isChecked ? t.colors.brand : t.colors.inkSubtle,
              backgroundColor: isChecked ? t.colors.brand : 'transparent',
            },
          ]}>
          {isChecked && <Ionicons name="checkmark" size={18} color={t.colors.onBrand} />}
        </View>
      )}
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color="inkMuted">
          {description}
        </AppText>
      </View>
    </Pressable>
  );
}

const GUARANTEES: { icon: React.ComponentProps<typeof Ionicons>['name']; text: string }[] = [
  { icon: 'shield-checkmark', text: 'Vos données sont cryptées et stockées en toute sécurité' },
  { icon: 'refresh', text: 'Vous pouvez modifier vos préférences à tout moment' },
  { icon: 'download', text: 'Vous pouvez télécharger une copie de vos données (Paramètres › Confidentialité)' },
  { icon: 'trash', text: 'Vous pouvez supprimer votre compte et vos données à tout moment' },
  { icon: 'lock-closed', text: 'Nous ne vendons jamais vos données à des tiers' },
  { icon: 'globe', text: 'Conformité RGPD et standards internationaux de protection des données' },
];

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const t = useTheme();
  const legal = useQuery(legalVersionsQuery());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Conditions d'utilisation" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcome}>
          <View style={[styles.icon, { backgroundColor: t.colors.brandTint }]}>
            <Ionicons name="document-text" size={40} color={t.colors.brandStrong} />
          </View>
          <AppText variant="h2" align="center">
            BonDeal et vos données
          </AppText>
          <AppText variant="small" color="inkMuted" align="center">
            Ce que nous utilisons pour faire fonctionner BonDeal, et ce que nous vous garantissons.
          </AppText>
          {legal.data && (
            <AppText variant="caption" color="inkSubtle" align="center">
              Conditions v{legal.data.terms_version} · Confidentialité v{legal.data.privacy_version}
            </AppText>
          )}
        </View>

        <AppText variant="h3" style={styles.sectionTitle}>
          Utilisation de vos données
        </AppText>
        <View style={styles.consents}>
          <ConsentItem
            title="Numéro de téléphone"
            description="Nous utilisons votre numéro de téléphone pour vous authentifier et sécuriser votre compte. Il n'est jamais affiché aux autres membres."
            isChecked
            onToggle={() => {}}
            disabled
          />
          <ConsentItem
            title="Données de profil"
            description="Votre pseudo, votre photo, votre ville et votre quartier construisent votre identité sur la plateforme et la confiance entre membres. Vous choisissez ce qui est visible dans Paramètres › Confidentialité."
            isChecked
            onToggle={() => {}}
            disabled
          />
          <ConsentItem
            title="Annonces, messages et transactions"
            description="Ils sont conservés pour faire fonctionner le service, vous protéger en cas de litige et lutter contre les arnaques (modération des signalements)."
            isChecked
            onToggle={() => {}}
            disabled
          />
          <ConsentItem
            title="Communication marketing (facultatif)"
            description="Désactivée par défaut. Vous pouvez l'activer ou la couper à tout moment dans Paramètres › Notifications."
            isChecked={false}
            onToggle={() => {}}
            disabled
          />
        </View>

        <AppText variant="h3" style={styles.sectionTitle}>
          Ce que nous garantissons
        </AppText>
        <Card>
          {GUARANTEES.map((g) => (
            <View key={g.text} style={styles.bullet}>
              <Ionicons name={g.icon} size={20} color={t.colors.success} />
              <AppText variant="small" style={styles.flex}>
                {g.text}
              </AppText>
            </View>
          ))}
        </Card>
        <Button
          label="Gérer ma confidentialité"
          icon="shield-outline"
          variant="secondary"
          onPress={() => router.push('/privacy-settings' as Href)}
          style={styles.manage}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  welcome: { alignItems: 'center', gap: 8, marginBottom: 24 },
  icon: { width: 80, height: 80, borderRadius: 40, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sectionTitle: { marginBottom: 12, marginTop: 8 },
  consents: { gap: 10, marginBottom: 16 },
  consentItem: { flexDirection: 'row', gap: 12, padding: 14, borderWidth: 1, minHeight: 56 },
  checkbox: { width: 26, height: 26, borderRadius: 6, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 6 },
  manage: { marginTop: 16 },
  flex: { flex: 1 },
});
