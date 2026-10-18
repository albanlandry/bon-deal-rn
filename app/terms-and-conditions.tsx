// app/terms-and-conditions.tsx — Conditions d'utilisation
// Themed restyle; content unchanged. Two modes:
//  - signup flow (default): consent checklist + "Accepter et continuer" → /verify-number
//  - `?mode=read` (from Settings / Help / About): read-only, no footer.
// Ethics fix (§2.3): analytics and marketing consents are optional toggles,
// default OFF, persisted locally. Only the terms themselves (phone + profile
// data needed to run the service) are required. "Refuser" is always available.
// TODO(backend): no endpoint to record consent choices/versions yet (MB-AUTH-03);
// optional consents are stored locally only (AsyncStorage).
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText, Button, Card, ScreenHeader } from '@/components/ui';

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
  { icon: 'trash', text: 'Vous pouvez supprimer vos données personnelles à tout moment' },
  { icon: 'lock-closed', text: 'Nous ne vendons jamais vos données à des tiers' },
  { icon: 'globe', text: 'Conformité RGPD et standards internationaux de protection des données' },
];

export const CONSENT_SETTINGS_KEY = 'bondeal.settings.consents.v1';

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const t = useTheme();
  const { mode } = useLocalSearchParams<{ mode?: string }>();
  const readOnly = mode === 'read';
  const [consents, setConsents] = useState({
    phoneNumber: false,
    personalData: false,
    analytics: false,
    marketing: false,
  });

  // Load the saved optional consents (analytics / marketing, default OFF).
  useEffect(() => {
    AsyncStorage.getItem(CONSENT_SETTINGS_KEY)
      .then((raw) => {
        if (!raw) return;
        const saved = JSON.parse(raw);
        setConsents((prev) => ({
          ...prev,
          analytics: !!saved?.analytics,
          marketing: !!saved?.marketing,
        }));
      })
      .catch(() => {});
  }, []);

  const handleConsentToggle = (key: keyof typeof consents) => {
    setConsents((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      if (key === 'analytics' || key === 'marketing') {
        AsyncStorage.setItem(
          CONSENT_SETTINGS_KEY,
          JSON.stringify({ analytics: next.analytics, marketing: next.marketing }),
        ).catch(() => {});
      }
      return next;
    });
  };

  // Only the terms themselves are required; analytics and marketing are optional.
  const requiredAccepted = consents.phoneNumber && consents.personalData;

  const leave = () => (router.canGoBack() ? router.back() : router.replace('/login'));

  const handleAccept = () => {
    if (requiredAccepted) leave();
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Conditions d'utilisation" />

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.welcome}>
          <View style={[styles.icon, { backgroundColor: t.colors.brandTint }]}>
            <Ionicons name="document-text" size={40} color={t.colors.brandStrong} />
          </View>
          <AppText variant="h2" align="center">
            Bienvenue sur BonDeal
          </AppText>
          <AppText variant="small" color="inkMuted" align="center">
            Pour offrir la meilleure expérience possible, nous avons besoin de votre consentement
            concernant l'utilisation de vos données personnelles.
          </AppText>
        </View>

        <AppText variant="h3" style={styles.sectionTitle}>
          {readOnly ? 'Utilisation de vos données' : 'Votre consentement'}
        </AppText>
        <View style={styles.consents}>
          <ConsentItem
            title="Numéro de téléphone"
            description="Nous utilisons votre numéro de téléphone pour vous authentifier, envoyer des codes de vérification et faciliter les échanges entre acheteurs et vendeurs."
            isChecked={consents.phoneNumber}
            onToggle={() => handleConsentToggle('phoneNumber')}
            disabled={readOnly}
          />
          <ConsentItem
            title="Données personnelles"
            description="Votre nom, photo de profil et informations de profil sont utilisés pour créer votre identité sur la plateforme et faciliter la confiance entre utilisateurs."
            isChecked={consents.personalData}
            onToggle={() => handleConsentToggle('personalData')}
            disabled={readOnly}
          />
          <ConsentItem
            title="Données d'analyse (optionnel)"
            description="Nous collectons des données d'utilisation pour améliorer notre service, détecter les bugs et optimiser les fonctionnalités de l'application."
            isChecked={consents.analytics}
            onToggle={() => handleConsentToggle('analytics')}
          />
          <ConsentItem
            title="Communication marketing (optionnel)"
            description="Recevez des notifications sur les meilleures offres, promotions exclusives et nouveautés BonDeal. Vous pouvez vous désabonner à tout moment."
            isChecked={consents.marketing}
            onToggle={() => handleConsentToggle('marketing')}
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
      </ScrollView>

      {!readOnly && (
        <View style={[styles.footer, { backgroundColor: t.colors.surface, borderTopColor: t.colors.line }]}>
          <Button label="Refuser" variant="secondary" onPress={leave} style={styles.flex} />
          <Button
            label="Accepter"
            onPress={handleAccept}
            disabled={!requiredAccepted}
            style={styles.flex2}
          />
        </View>
      )}
      {!readOnly && !requiredAccepted && (
        <AppText
          variant="caption"
          color="inkSubtle"
          align="center"
          style={[styles.reason, { backgroundColor: t.colors.surface }]}>
          Cochez les deux premières cases pour accepter les conditions.
        </AppText>
      )}
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
  footer: { flexDirection: 'row', gap: 12, padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
  reason: { paddingBottom: 12 },
  flex: { flex: 1 },
  flex2: { flex: 2 },
});
