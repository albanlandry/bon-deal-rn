// app/notification-settings.tsx — Notifications (MB-NOT-04)
// Stored on the server (GET/PUT /auth/me/preferences), so they filter the
// pushes BonDeal sends to every device. In-app notifications are always
// kept. Defaults (default effect, §1.5 / §2.3): everything ON except
// marketing. Moderation messages are always delivered.
// When the phone itself blocks BonDeal's notifications, a warning says so
// (re-checked when the user comes back from the system settings).
import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText, Button, ErrorState, ListGroup, ListRow, ScreenHeader, Skeleton } from '@/components/ui';
import { usePreferences } from '@/lib/usePreferences';
import type { BdNotificationPrefs } from '@/constants/types';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

// Same defensive import as lib/push.ts: a no-op until the native module is linked.
let messaging: any = null;
try {
  messaging = require('@react-native-firebase/messaging').default;
} catch {
  messaging = null;
}
// Firebase AuthorizationStatus: DENIED = 0.
const DENIED = 0;

/** True when the OS blocks BonDeal's notifications; null while unknown. */
function useOsNotificationsBlocked(): boolean | null {
  const [blocked, setBlocked] = useState<boolean | null>(null);
  const check = useCallback(() => {
    if (!messaging) return;
    Promise.resolve()
      .then(() => messaging().hasPermission())
      .then((status: number) => setBlocked(status === DENIED))
      .catch(() => setBlocked(null));
  }, []);
  useEffect(() => {
    check();
    const sub = AppState.addEventListener('change', (st) => st === 'active' && check());
    return () => sub.remove();
  }, [check]);
  return blocked;
}

const GROUPS: { title: string; items: { id: keyof BdNotificationPrefs; title: string; description: string; icon: IconName }[] }[] = [
  {
    title: 'Échanges',
    items: [
      {
        id: 'messages',
        title: 'Nouveaux messages',
        description: 'Quand un acheteur ou un vendeur vous écrit',
        icon: 'chatbubble-outline',
      },
      {
        id: 'offers',
        title: 'Offres et négociations',
        description: 'Offres reçues, contre-offres, offres acceptées ou refusées',
        icon: 'pricetag-outline',
      },
    ],
  },
  {
    title: 'Mes annonces et recherches',
    items: [
      {
        id: 'listings',
        title: 'Expiration de mes annonces',
        description: 'Trois jours avant l’expiration, puis à l’expiration',
        icon: 'hourglass-outline',
      },
      {
        id: 'saved_searches',
        title: 'Alertes de recherche',
        description: 'Nouvelles annonces qui correspondent à vos recherches enregistrées',
        icon: 'bookmark-outline',
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
      },
    ],
  },
];

export default function NotificationSettingsScreen() {
  const t = useTheme();
  const { prefs, isLoading, isError, refetch, setNotification } = usePreferences();
  const osBlocked = useOsNotificationsBlocked();
  const loaded = !isLoading && !isError && !!prefs;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader large title="Notifications" />
      <ScrollView contentContainerStyle={styles.content}>
        {osBlocked && (
          <View
            style={[styles.warning, { backgroundColor: t.colors.warningTint, borderRadius: t.radius.md }]}
            accessibilityRole="alert">
            <Ionicons name="notifications-off-outline" size={20} color={t.colors.warning} />
            <View style={styles.flex}>
              <AppText variant="bodyStrong">Notifications bloquées par le téléphone</AppText>
              <AppText variant="small" color="inkMuted">
                Vous ne recevrez aucune notification push, quels que soient les choix ci-dessous.
              </AppText>
              <Button
                label="Ouvrir les réglages du téléphone"
                variant="ghost"
                icon="settings-outline"
                onPress={() => Linking.openSettings().catch(() => {})}
                style={styles.warningAction}
              />
            </View>
          </View>
        )}
        {isLoading ? (
          <View style={styles.loading}>
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} height={56} radius={t.radius.md} />
            ))}
          </View>
        ) : isError || !prefs ? (
          <ErrorState message="Impossible de charger vos réglages." onRetry={() => refetch()} />
        ) : (
          GROUPS.map((g) => (
            <ListGroup key={g.title} title={g.title}>
              {g.items.map((item, idx) => (
                <ListRow
                  key={item.id}
                  icon={item.icon}
                  title={item.title}
                  subtitle={item.description}
                  toggle={{ value: !!prefs.notifications[item.id], onChange: (v) => setNotification(item.id, v) }}
                  last={idx === g.items.length - 1}
                />
              ))}
            </ListGroup>
          ))
        )}
        {loaded && (
          <>
            <View style={styles.note}>
              <Ionicons name="information-circle-outline" size={16} color={t.colors.inkMuted} />
              <AppText variant="caption" color="inkMuted" style={styles.flex}>
                Ces choix s’appliquent aux notifications push sur tous vos appareils. Tout reste visible dans
                l’onglet Notifications de l’application. Les messages de l’équipe de modération sont toujours envoyés.
              </AppText>
            </View>
            {!osBlocked && (
              <Button
                label="Autorisations du téléphone"
                icon="phone-portrait-outline"
                variant="ghost"
                onPress={() => Linking.openSettings().catch(() => {})}
                style={styles.system}
              />
            )}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  loading: { gap: 12 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  flex: { flex: 1 },
  warning: { flexDirection: 'row', gap: 12, padding: 16, marginBottom: 16 },
  warningAction: { alignSelf: 'flex-start', marginTop: 4 },
  system: { alignSelf: 'flex-start', marginTop: 8 },
});
