// app/settings.tsx — Paramètres
// Grouped list (Hick: few groups, one decision per row). Logout and account
// deletion are both reachable in ≤ 3 taps (ethics guardrail §2.4).
import { useQueryClient } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/utils/config';
import { ThemePreference, useTheme } from '@/theme';
import {
  AppText,
  Button,
  ListGroup,
  ListRow,
  QuartierPickerSheet,
  ScreenHeader,
  SegmentedControl,
  Sheet,
  showToast,
} from '@/components/ui';

export const SUPPORT_EMAIL = 'support@bondeal.com';

const THEME_SEGMENTS: { value: ThemePreference; label: string }[] = [
  { value: 'system', label: 'Système' },
  { value: 'light', label: 'Clair' },
  { value: 'dark', label: 'Sombre' },
];

export default function SettingsScreen() {
  const router = useRouter();
  const t = useTheme();
  const qc = useQueryClient();
  const { user, signOut } = useAuth();
  const [quartierOpen, setQuartierOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  // Logout (MB-AUTH-05): signOut() unregisters this device's push token
  // (DELETE /push_tokens/{token}) then signs out of Firebase, whose listener
  // clears the JWT, secure storage and profile. We also drop every cached
  // query so the next account never sees this one's data. Local sell drafts
  // are intentionally kept.
  const doSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
    } catch {
      showToast.error('Déconnexion incomplète', 'Réessayez si le problème persiste.');
    } finally {
      qc.clear();
      setSigningOut(false);
      router.replace('/login');
    }
  };

  const confirmSignOut = () => {
    Alert.alert('Se déconnecter ?', 'Vous pourrez vous reconnecter avec votre numéro de téléphone.', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Se déconnecter', style: 'destructive', onPress: doSignOut },
    ]);
  };

  // TODO(backend): no account-deletion endpoint yet (R7 / MB-AUTH-08). Until it
  // exists, the request is sent to support by e-mail, prefilled with the
  // account identifiers so it can be processed without back-and-forth.
  const requestDeletion = () => {
    const subject = encodeURIComponent('Demande de suppression de compte');
    const body = encodeURIComponent(
      `Bonjour,\n\nJe souhaite supprimer mon compte BonDeal et les données associées.\n\nNom d'utilisateur : ${user?.username ?? ''}\nIdentifiant : ${user?.id ?? ''}\nTéléphone : ${user?.phone_number ?? ''}\n\nMerci.`,
    );
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${subject}&body=${body}`).catch(() =>
      showToast.error('Aucune application e-mail', `Écrivez-nous à ${SUPPORT_EMAIL}`),
    );
    setDeleteOpen(false);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Paramètres" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListGroup title="Compte">
          <ListRow icon="person-outline" title="Modifier le profil" onPress={() => router.push('/edit-profile')} />
          <ListRow
            icon="location-outline"
            title="Mon quartier"
            value={user?.quartier ?? 'Non défini'}
            onPress={() => setQuartierOpen(true)}
            last
          />
        </ListGroup>

        <ListGroup title="Préférences">
          <ListRow
            icon="notifications-outline"
            title="Notifications"
            onPress={() => router.push('/notification-settings')}
          />
          <ListRow icon="shield-outline" title="Confidentialité" onPress={() => router.push('/privacy-settings')} />
          <View style={styles.themeRow}>
            <AppText variant="body" style={styles.themeLabel}>
              Thème
            </AppText>
            <SegmentedControl
              accessibilityLabel="Thème de l'application"
              segments={THEME_SEGMENTS}
              value={t.preference}
              onChange={t.setPreference}
            />
          </View>
        </ListGroup>

        <ListGroup title="Aide">
          <ListRow icon="help-circle-outline" title="Aide & Support" onPress={() => router.push('/help-support')} />
          <ListRow
            icon="document-text-outline"
            title="Conditions d'utilisation"
            onPress={() => router.push({ pathname: '/terms-and-conditions', params: { mode: 'read' } } as Href)}
          />
          <ListRow icon="information-circle-outline" title="À propos" onPress={() => router.push('/about' as Href)} last />
        </ListGroup>

        <ListGroup>
          <ListRow
            icon="log-out-outline"
            title={signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            onPress={signingOut ? undefined : confirmSignOut}
            destructive
            chevron={false}
          />
          <ListRow
            icon="trash-outline"
            title="Supprimer mon compte"
            onPress={() => setDeleteOpen(true)}
            destructive
            chevron={false}
            last
          />
        </ListGroup>

        <AppText variant="caption" color="inkSubtle" align="center">
          {config.app.name} v{config.app.version}
        </AppText>
      </ScrollView>

      <QuartierPickerSheet visible={quartierOpen} onClose={() => setQuartierOpen(false)} />

      <Sheet
        visible={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Supprimer votre compte"
        footer={
          <View style={styles.sheetActions}>
            <Button label="Envoyer la demande" variant="danger" icon="mail-outline" onPress={requestDeletion} fullWidth />
            <Button label="Garder mon compte" variant="ghost" onPress={() => setDeleteOpen(false)} fullWidth />
          </View>
        }>
        <AppText variant="body" style={styles.para}>
          La suppression est définitive. Elle efface :
        </AppText>
        {[
          'votre profil (nom, photo, quartier, téléphone) ;',
          'vos annonces et leurs photos ;',
          'vos favoris et vos notifications.',
        ].map((line) => (
          <AppText key={line} variant="small" color="inkMuted">
            • {line}
          </AppText>
        ))}
        <AppText variant="small" color="inkMuted" style={styles.para}>
          Certaines données liées à des transactions peuvent être conservées si la loi l’exige.
        </AppText>
        <AppText variant="small" style={styles.para}>
          Pour l’instant, la suppression est traitée par notre équipe : un e-mail pré-rempli va
          s’ouvrir, il suffit de l’envoyer. Nous vous confirmerons la suppression par e-mail.
        </AppText>
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  themeRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  themeLabel: { marginBottom: 2 },
  sheetActions: { gap: 4 },
  para: { marginTop: 12 },
});
