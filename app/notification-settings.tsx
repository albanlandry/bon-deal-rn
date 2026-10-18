// app/notification-settings.tsx — Notifications
// TODO(backend): no endpoint for notification preferences yet (MB-NOT-04);
// settings are stored locally only (AsyncStorage) and do not yet filter the
// pushes the server sends.
// Defaults (default effect, §1.5 / §2.3): messages and offers ON, marketing OFF.
import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { ScreenHeader } from '@/components/ui';
import SettingsLocalToggles, { LocalToggleGroup } from '@/components/organisms/SettingsLocalToggles';

export const NOTIFICATION_SETTINGS_KEY = 'bondeal.settings.notifications.v1';

const GROUPS: LocalToggleGroup[] = [
  {
    title: 'Général',
    items: [
      {
        id: 'push',
        title: 'Notifications push',
        description: 'Recevoir des notifications sur cet appareil',
        icon: 'notifications-outline',
        defaultValue: true,
      },
    ],
  },
  {
    title: 'Échanges',
    items: [
      {
        id: 'messages',
        title: 'Nouveaux messages',
        description: 'Quand un acheteur ou un vendeur vous écrit',
        icon: 'chatbubble-outline',
        defaultValue: true,
        dependsOn: 'push',
      },
      {
        id: 'offers',
        title: 'Offres et négociations',
        description: 'Offres reçues, contre-offres, offres acceptées',
        icon: 'pricetag-outline',
        defaultValue: true,
        dependsOn: 'push',
      },
      {
        id: 'sales',
        title: 'Ventes et transactions',
        description: 'Quand une vente est confirmée ou annulée',
        icon: 'checkmark-done-outline',
        defaultValue: true,
        dependsOn: 'push',
      },
    ],
  },
  {
    title: 'Mes annonces',
    items: [
      {
        id: 'likes',
        title: 'Favoris sur mes annonces',
        description: 'Quand quelqu’un ajoute votre annonce à ses favoris',
        icon: 'heart-outline',
        defaultValue: true,
        dependsOn: 'push',
      },
      {
        id: 'views',
        title: 'Vues sur mes annonces',
        description: 'Résumé des consultations de vos annonces',
        icon: 'eye-outline',
        defaultValue: false,
        dependsOn: 'push',
      },
    ],
  },
  {
    title: 'BonDeal',
    items: [
      {
        id: 'marketing',
        title: 'Actualités et bons plans',
        description: 'Nouveautés et conseils de BonDeal. Désactivé par défaut.',
        icon: 'megaphone-outline',
        defaultValue: false,
        dependsOn: 'push',
      },
    ],
  },
];

export default function NotificationSettingsScreen() {
  const t = useTheme();
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Notifications" />
      <ScrollView contentContainerStyle={styles.content}>
        <SettingsLocalToggles storageKey={NOTIFICATION_SETTINGS_KEY} groups={GROUPS} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
});
