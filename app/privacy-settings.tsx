// app/privacy-settings.tsx — Confidentialité
// TODO(backend): no endpoint for privacy settings yet (MB-PRF-03), and no
// block/report endpoints (MB-TS-02); settings are stored locally only
// (AsyncStorage) and are not yet enforced by the server.
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText, Card, ScreenHeader } from '@/components/ui';
import SettingsLocalToggles, { LocalToggleGroup } from '@/components/organisms/SettingsLocalToggles';

export const PRIVACY_SETTINGS_KEY = 'bondeal.settings.privacy.v1';

const GROUPS: LocalToggleGroup[] = [
  {
    title: 'Mon profil',
    items: [
      {
        id: 'profileVisibility',
        title: 'Profil public',
        description: 'Les autres membres peuvent voir votre profil et vos avis',
        icon: 'person-circle-outline',
        defaultValue: true,
      },
      {
        id: 'showLocation',
        title: 'Afficher mon quartier',
        description: 'Votre quartier apparaît sur votre profil',
        icon: 'location-outline',
        defaultValue: true,
      },
      {
        id: 'showPhone',
        title: 'Afficher mon téléphone',
        description: 'Désactivé par défaut. Préférez la messagerie BonDeal.',
        icon: 'call-outline',
        defaultValue: false,
      },
    ],
  },
  {
    title: 'Messages',
    items: [
      {
        id: 'allowMessages',
        title: 'Accepter les messages',
        description: 'Les membres peuvent vous contacter au sujet de vos annonces',
        icon: 'chatbubbles-outline',
        defaultValue: true,
      },
    ],
  },
];

export default function PrivacySettingsScreen() {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Confidentialité" />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsLocalToggles storageKey={PRIVACY_SETTINGS_KEY} groups={GROUPS} />
        <Card tone="trust" style={styles.info}>
          <Ionicons name="shield-checkmark-outline" size={20} color={t.colors.trust} />
          <View style={styles.flex}>
            <AppText variant="labelStrong">Vos données vous appartiennent</AppText>
            <AppText variant="caption" color="inkMuted">
              BonDeal ne vend pas vos données personnelles. Pour exporter ou supprimer vos
              données, passez par Paramètres › Supprimer mon compte ou contactez le support.
            </AppText>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  info: { flexDirection: 'row', gap: 12, marginTop: 20 },
  flex: { flex: 1 },
});
