// app/privacy-settings.tsx — Confidentialité (MB-PRF-03, MB-TS-02, MB-AUTH-09)
// What other members see of you (server-side privacy prefs, enforced on the
// public profile), the people you blocked (with unblock), and a copy of your
// data (10-minute export link opened in the browser).
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  Card,
  ErrorState,
  ListGroup,
  ListRow,
  ScreenHeader,
  showToast,
  Skeleton,
} from '@/components/ui';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError } from '@/lib/api';
import { createExportUrl } from '@/lib/api/account';
import { blocksQuery } from '@/lib/api/safety';
import { formatDayLabel } from '@/lib/format';
import { useBlockActions } from '@/lib/useBlock';
import { usePreferences } from '@/lib/usePreferences';

export default function PrivacySettingsScreen() {
  const t = useTheme();
  const { user } = useAuth();
  const { prefs, isLoading, isError, refetch, setPrivacy } = usePreferences();
  const blocks = useQuery(blocksQuery());
  const { confirmUnblock, busy } = useBlockActions();

  const exportMut = useMutation({
    mutationFn: createExportUrl,
    onSuccess: async (url) => {
      try {
        await Linking.openURL(url);
        showToast.info('Téléchargement lancé', 'Le lien reste valable 10 minutes.');
      } catch {
        showToast.error('Aucun navigateur', 'Impossible d’ouvrir le lien de téléchargement.');
      }
    },
    onError: (e) =>
      showToast.error(
        'Export impossible',
        e instanceof ApiError && e.status === 429 ? 'Trop de demandes. Réessayez dans une heure.' : 'Réessayez.',
      ),
  });

  const lastInitial = user?.last_name ? `${user.last_name[0]}.` : null;
  const nameExample = [user?.first_name, lastInitial].filter(Boolean).join(' ');

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Confidentialité" />
      <ScrollView contentContainerStyle={styles.content}>
        {isLoading ? (
          <View style={styles.loading}>
            <Skeleton height={56} radius={t.radius.md} />
            <Skeleton height={56} radius={t.radius.md} />
          </View>
        ) : isError || !prefs ? (
          <ErrorState message="Impossible de charger vos réglages." onRetry={() => refetch()} />
        ) : (
          <ListGroup title="Mon profil public">
            <ListRow
              icon="person-outline"
              title="Afficher mon nom complet"
              subtitle={
                prefs.privacy.show_last_name
                  ? 'Votre nom de famille est visible en entier'
                  : `Seule l’initiale du nom est visible${nameExample ? ` (« ${nameExample} »)` : ''}`
              }
              toggle={{ value: prefs.privacy.show_last_name, onChange: (v) => setPrivacy('show_last_name', v) }}
            />
            <ListRow
              icon="location-outline"
              title="Afficher mon quartier"
              subtitle="Sinon, seule votre ville apparaît sur votre profil"
              toggle={{ value: prefs.privacy.show_quartier, onChange: (v) => setPrivacy('show_quartier', v) }}
              last
            />
          </ListGroup>
        )}

        <ListGroup title="Membres bloqués">
          {blocks.isLoading ? (
            <View style={styles.pad}>
              <Skeleton height={44} />
            </View>
          ) : blocks.isError ? (
            <ListRow icon="refresh" title="Réessayer le chargement" onPress={() => blocks.refetch()} last />
          ) : (blocks.data?.length ?? 0) === 0 ? (
            <View style={styles.pad}>
              <AppText variant="small" color="inkMuted">
                Vous n’avez bloqué personne. Pour bloquer un membre, ouvrez son profil ou le menu d’une conversation.
              </AppText>
            </View>
          ) : (
            blocks.data!.map((b, i) => (
              <View
                key={b.user_id}
                style={[
                  styles.blockRow,
                  i < blocks.data!.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.colors.line },
                ]}>
                <Avatar uri={b.avatar_url} name={b.username} size={36} />
                <View style={styles.flex}>
                  <AppText variant="body" numberOfLines={1}>
                    {b.username}
                  </AppText>
                  {!!b.blocked_at && (
                    <AppText variant="caption" color="inkMuted">
                      Bloqué · {formatDayLabel(b.blocked_at).toLowerCase()}
                    </AppText>
                  )}
                </View>
                <Button
                  label="Débloquer"
                  size="sm"
                  variant="secondary"
                  disabled={busy}
                  onPress={() => confirmUnblock(b.user_id, b.username)}
                />
              </View>
            ))
          )}
        </ListGroup>

        <ListGroup title="Mes données">
          <ListRow
            icon="download-outline"
            title={exportMut.isPending ? 'Préparation du lien…' : 'Télécharger mes données'}
            subtitle="Profil, annonces, messages, transactions et avis (fichier JSON)"
            onPress={exportMut.isPending ? undefined : () => exportMut.mutate()}
            last
          />
        </ListGroup>

        <Card tone="trust" style={styles.info}>
          <Ionicons name="shield-checkmark-outline" size={20} color={t.colors.trust} />
          <View style={styles.flex}>
            <AppText variant="labelStrong">Vos données vous appartiennent</AppText>
            <AppText variant="caption" color="inkMuted">
              BonDeal ne vend pas vos données personnelles. Votre numéro de téléphone n’est jamais affiché aux
              autres membres. Pour tout effacer : Paramètres › Supprimer mon compte.
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
  loading: { gap: 12, marginBottom: 20 },
  pad: { padding: 16 },
  blockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: 16, paddingVertical: 10, minHeight: 56 },
  info: { flexDirection: 'row', gap: 12 },
  flex: { flex: 1 },
});
