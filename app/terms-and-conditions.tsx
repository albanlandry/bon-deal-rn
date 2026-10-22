// app/terms-and-conditions.tsx — Conditions d’utilisation (read-only)
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
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText, Button, Card, ScreenHeader } from '@/components/ui';
import { legalVersionsQuery } from '@/lib/api/account';

/** A plain, non-interactive row: what we use and why (no checkbox — nothing to toggle here). */
function DataUseRow({ icon, title, description }: { icon: React.ComponentProps<typeof Ionicons>['name']; title: string; description: string }) {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${title}. ${description}`}
      style={[styles.dataRow, { backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md }]}>
      <Ionicons name={icon} size={20} color={t.colors.inkMuted} style={styles.dataIcon} />
      <View style={styles.flex}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText variant="small" color="inkMuted">
          {description}
        </AppText>
      </View>
    </View>
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
      <ScreenHeader large title="Conditions d’utilisation" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcome}>
          <View style={[styles.icon, { backgroundColor: t.colors.brandTint }]}>
            <Ionicons name="document-text" size={28} color={t.colors.brandStrong} />
          </View>
          <AppText variant="h2">
            BonDeal et vos données
          </AppText>
          <AppText variant="small" color="inkMuted">
            Ce que nous utilisons pour faire fonctionner BonDeal, et ce que nous vous garantissons.
          </AppText>
          {legal.data && (
            <AppText variant="caption" color="inkSubtle">
              Conditions v{legal.data.terms_version} · Confidentialité v{legal.data.privacy_version}
            </AppText>
          )}
        </View>

        <AppText variant="h3" style={styles.sectionTitle}>
          Utilisation de vos données
        </AppText>
        <View style={styles.consents}>
          <DataUseRow
            icon="call-outline"
            title="Numéro de téléphone"
            description="Nous utilisons votre numéro de téléphone pour vous authentifier et sécuriser votre compte. Il n’est jamais affiché aux autres membres."
          />
          <DataUseRow
            icon="person-outline"
            title="Données de profil"
            description="Votre pseudo, votre photo, votre ville et votre quartier construisent votre identité sur la plateforme et la confiance entre membres. Vous choisissez ce qui est visible dans Paramètres › Confidentialité."
          />
          <DataUseRow
            icon="chatbubbles-outline"
            title="Annonces, messages et transactions"
            description="Ils sont conservés pour faire fonctionner le service, vous protéger en cas de litige et lutter contre les arnaques (modération des signalements)."
          />
          <DataUseRow
            icon="megaphone-outline"
            title="Communication marketing (facultatif)"
            description="Désactivée par défaut. Vous pouvez l’activer ou la couper à tout moment dans Paramètres › Notifications."
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
  welcome: { gap: 8, marginBottom: 24 },
  icon: { width: 56, height: 56, borderRadius: 8, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  sectionTitle: { marginBottom: 12, marginTop: 8 },
  consents: { gap: 8, marginBottom: 16 },
  dataRow: { flexDirection: 'row', gap: 12, padding: 16, borderWidth: 1 },
  dataIcon: { marginTop: 2 },
  bullet: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8 },
  manage: { marginTop: 16 },
  flex: { flex: 1 },
});
