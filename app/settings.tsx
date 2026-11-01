// app/settings.tsx — Paramètres
// Grouped list (Hick: few groups, one decision per row). Logout and account
// deletion are both reachable in ≤ 3 taps (ethics guardrail §2.4). Logout is
// a neutral row; deletion, the only irreversible action, sits alone at the
// bottom in red.
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { config } from '@/utils/config';
import { ApiError } from '@/lib/api';
import { createExportUrl, deleteAccount } from '@/lib/api/account';
import { clearSellDraft } from '@/lib/sellDraft';
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
  Stagger,
  TextField,
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
  const [confirmText, setConfirmText] = useState('');
  const confirmOk = confirmText.trim().toUpperCase() === 'SUPPRIMER';

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

  // Account deletion (R7 / MB-AUTH-08): DELETE /auth/me anonymises the
  // account at once (the token stops working). We then sign out locally only
  // — no server call can succeed any more — and drop every cache and the
  // local sell draft so nothing of the account stays on the phone.
  const deleteMut = useMutation({
    mutationFn: deleteAccount,
    onSuccess: async () => {
      setDeleteOpen(false);
      await qc.cancelQueries();
      qc.clear();
      try {
        await signOut({ local: true });
      } catch {
        // the server side is already done
      }
      clearSellDraft(qc);
      router.replace('/login');
      showToast.success('Compte supprimé', 'Vos données ont été effacées. À bientôt sur BonDeal.');
    },
    onError: (e) =>
      showToast.error(
        'Suppression impossible',
        e instanceof ApiError && e.status === 400 ? 'Tapez SUPPRIMER pour confirmer.' : 'Vérifiez votre connexion et réessayez.',
      ),
  });

  const exportMut = useMutation({
    mutationFn: createExportUrl,
    onSuccess: (url) =>
      Linking.openURL(url).catch(() => showToast.error('Aucun navigateur', 'Impossible d’ouvrir le lien.')),
    onError: (e) =>
      showToast.error(
        'Export impossible',
        e instanceof ApiError && e.status === 429 ? 'Trop de demandes. Réessayez dans une heure.' : 'Réessayez.',
      ),
  });

  const openDelete = () => {
    setConfirmText('');
    setDeleteOpen(true);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader large title="Paramètres" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Grouped cards; destructive actions last, in red (docs/09 §4). */}
        <Stagger>
        <ListGroup title="Compte">
          <ListRow icon="person-outline" title="Modifier le profil" onPress={() => router.push('/edit-profile')} />
          <ListRow
            icon="key-outline"
            title="Mot de passe"
            subtitle={user?.has_password ? 'Modifier votre mot de passe' : 'Se connecter sans attendre de SMS'}
            onPress={() => router.push({ pathname: '/set-password', params: { mode: 'settings' } })}
          />
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
          <View style={styles.themeRow}>
            <AppText variant="body">
              Thème
            </AppText>
            <SegmentedControl
              accessibilityLabel="Thème de l’application"
              segments={THEME_SEGMENTS}
              value={t.preference}
              onChange={t.setPreference}
            />
          </View>
        </ListGroup>

        <ListGroup title="Aide et informations">
          <ListRow icon="help-circle-outline" title="Aide & Support" onPress={() => router.push('/help-support')} />
          <ListRow
            icon="document-text-outline"
            title="Conditions d’utilisation"
            onPress={() => router.push({ pathname: '/terms-and-conditions', params: { mode: 'read' } } as Href)}
          />
          <ListRow
            icon="shield-outline"
            title="Confidentialité"
            subtitle="Visibilité, statistiques, export de vos données"
            onPress={() => router.push('/privacy-settings')}
          />
          <ListRow icon="information-circle-outline" title="À propos" onPress={() => router.push('/about' as Href)} last />
        </ListGroup>

        <ListGroup title="Session">
          <ListRow
            icon="log-out-outline"
            title={signingOut ? 'Déconnexion…' : 'Se déconnecter'}
            onPress={signingOut ? undefined : confirmSignOut}
            chevron={false}
            last
          />
        </ListGroup>

        <View style={styles.dangerZone}>
          <ListGroup title="Suppression du compte">
            <ListRow
              icon="trash-outline"
              title="Supprimer mon compte"
              subtitle="Définitif : efface votre profil et vos annonces"
              onPress={openDelete}
              destructive
              chevron={false}
              last
            />
          </ListGroup>
        </View>
        </Stagger>

        <AppText variant="caption" color="inkMuted" align="center">
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
            <Button
              label="Supprimer définitivement"
              variant="danger"
              icon="trash-outline"
              onPress={() => deleteMut.mutate()}
              loading={deleteMut.isPending}
              disabled={!confirmOk}
              disabledReason={!confirmOk ? 'Tapez SUPPRIMER pour confirmer.' : undefined}
              fullWidth
            />
            <Button label="Garder mon compte" variant="ghost" onPress={() => setDeleteOpen(false)} fullWidth />
          </View>
        }>
        <AppText variant="body" style={styles.para}>
          La suppression est immédiate et définitive. Elle efface :
        </AppText>
        {[
          'votre profil : nom, photo, quartier, ville, e-mail et numéro de téléphone ;',
          'vos annonces (retirées du site) et toutes leurs photos ;',
          'vos favoris, vos notifications, vos préférences et vos blocages.',
        ].map((line) => (
          <AppText key={line} variant="small" color="inkMuted">
            • {line}
          </AppText>
        ))}
        <AppText variant="small" color="inkMuted" style={styles.para}>
          Vos conversations et transactions restent visibles par l’autre membre, sous un nom anonyme,
          pour qu’il garde son historique. Les négociations en cours sont annulées. Votre numéro pourra servir à
          créer un nouveau compte.
        </AppText>
        <Button
          label={exportMut.isPending ? 'Préparation…' : 'Télécharger mes données avant'}
          icon="download-outline"
          variant="secondary"
          onPress={() => exportMut.mutate()}
          loading={exportMut.isPending}
          style={styles.exportBtn}
        />
        <TextField
          label="Pour confirmer, tapez SUPPRIMER"
          value={confirmText}
          onChangeText={setConfirmText}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="SUPPRIMER"
          containerStyle={styles.para}
        />
      </Sheet>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  themeRow: { paddingHorizontal: 16, paddingVertical: 12, gap: 8 },
  // Extra space above the irreversible action, away from the logout row.
  dangerZone: { marginTop: 16 },
  sheetActions: { gap: 8 },
  para: { marginTop: 12 },
  exportBtn: { alignSelf: 'flex-start', marginTop: 12 },
});
