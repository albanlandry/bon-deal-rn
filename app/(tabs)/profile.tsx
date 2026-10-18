// app/(tabs)/profile.tsx — Profil
// Avatar + verified badge, completeness ring (goal-gradient / endowed
// progress), real stats only (social proof), entries to listings, reviews,
// settings and about.
import { Href, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { myPostsQuery } from '@/lib/api/posts';
import { formatMemberSince } from '@/lib/format';
import { useTheme } from '@/theme';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  IconButton,
  ListGroup,
  ListRow,
  ProgressRing,
  RatingStars,
  Skeleton,
} from '@/components/ui';
import ProfileStat from '@/components/molecules/ProfileStat';

interface CompletionStep {
  key: string;
  label: string;
  done: boolean;
  route?: Href;
}

export default function ProfileScreen() {
  const router = useRouter();
  const t = useTheme();
  const { user, refreshUser } = useAuth();
  const mine = useQuery(myPostsQuery());

  const posts = mine.data?.posts ?? [];
  const activeCount = posts.filter((p) => p.state === 'published' || p.state === 'reserved').length;
  const soldCount = posts.filter((p) => p.state === 'sold').length;

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Utilisateur';
  const displayLocation = [user?.quartier, user?.city].filter(Boolean).join(', ') || null;
  const memberSince = formatMemberSince(user?.created_at);

  // Phone numbers on BonDeal accounts come from Firebase phone auth, i.e.
  // they were verified by SMS OTP. That is the only "verified" signal the
  // backend exposes for the current user, so the badge is shown only then.
  const phoneVerified = !!user?.phone_number;

  // Endowed progress: the first steps (account + phone) are already done
  // after signup, so the ring starts with a head start.
  const steps: CompletionStep[] = [
    { key: 'account', label: 'Compte créé', done: !!user },
    { key: 'phone', label: 'Téléphone vérifié', done: phoneVerified },
    { key: 'name', label: 'Ajouter votre nom', done: !!(user?.first_name || user?.last_name), route: '/edit-profile' },
    { key: 'place', label: 'Choisir votre quartier', done: !!user?.quartier, route: '/edit-profile' },
    { key: 'avatar', label: 'Ajouter une photo', done: !!user?.avatar_url, route: '/edit-profile' },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const nextStep = steps.find((s) => !s.done);

  const refreshing = mine.isRefetching;
  const onRefresh = () => {
    mine.refetch();
    refreshUser();
  };

  return (
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <View style={styles.header}>
        <AppText variant="h1" accessibilityRole="header">
          Profil
        </AppText>
        <IconButton icon="settings-outline" label="Paramètres" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.colors.brandStrong} colors={[t.colors.brandStrong]} />
        }>
        {/* Identity */}
        <Card style={styles.identity}>
          <Avatar uri={user?.avatar_url} name={displayName} size={80} verified={phoneVerified} />
          <View style={styles.identityText}>
            <AppText variant="h2" numberOfLines={1}>
              {displayName}
            </AppText>
            {!!user?.username && displayName !== user.username && (
              <AppText variant="small" color="inkMuted">
                @{user.username}
              </AppText>
            )}
            {!!displayLocation && (
              <AppText variant="small" color="inkMuted" numberOfLines={1}>
                {displayLocation}
              </AppText>
            )}
            <View style={styles.badges}>
              {phoneVerified && <Badge label="Téléphone vérifié" tone="trust" icon="shield-checkmark" />}
              {!!memberSince && <Badge label={memberSince} tone="neutral" />}
            </View>
          </View>
        </Card>

        {/* Completeness ring */}
        {doneCount < steps.length && (
          <Card tone="brand" style={styles.completion}>
            <ProgressRing
              progress={doneCount / steps.length}
              size={64}
              label={`Profil complété à ${Math.round((doneCount / steps.length) * 100)} %`}
            />
            <View style={styles.flex}>
              <AppText variant="labelStrong">
                {doneCount} étapes sur {steps.length} faites
              </AppText>
              <AppText variant="caption" color="inkMuted">
                Un profil complet rassure les acheteurs.
              </AppText>
              {nextStep?.route && (
                <Button
                  label={nextStep.label}
                  size="sm"
                  variant="secondary"
                  iconRight="arrow-forward"
                  onPress={() => router.push(nextStep.route!)}
                  style={styles.nextStep}
                />
              )}
            </View>
          </Card>
        )}

        {/* Stats — real numbers only */}
        <View style={styles.stats}>
          {mine.isLoading ? (
            <>
              <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
              <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
              <Skeleton height={72} style={styles.flex} radius={t.radius.md} />
            </>
          ) : (
            <>
              <ProfileStat
                value={String(activeCount)}
                label={activeCount > 1 ? 'Annonces actives' : 'Annonce active'}
                onPress={() => router.push('/my-listings')}
              />
              <ProfileStat
                value={String(soldCount)}
                label={soldCount > 1 ? 'Ventes' : 'Vente'}
                onPress={() => router.push('/my-listings')}
              />
              <ProfileStat
                value={String(user?.review_count ?? 0)}
                label="Avis"
                onPress={() =>
                  router.push({
                    pathname: '/reviews',
                    params: { userId: String(user?.id ?? ''), username: user?.username ?? '' },
                  } as Href)
                }
              />
            </>
          )}
        </View>
        {user?.avg_rating != null && (user?.review_count ?? 0) > 0 && (
          <View style={styles.rating}>
            <RatingStars value={user.avg_rating} count={user.review_count} size={16} />
          </View>
        )}

        <ListGroup title="Mes activités">
          <ListRow icon="pricetags-outline" title="Mes annonces" onPress={() => router.push('/my-listings')} />
          <ListRow icon="heart-outline" title="Favoris" onPress={() => router.push('/(tabs)/favorites')} />
          <ListRow
            icon="receipt-outline"
            title="Mes transactions"
            subtitle="Confirmer un échange, laisser un avis"
            onPress={() => router.push('/transactions' as Href)}
          />
          <ListRow
            icon="bookmark-outline"
            title="Mes recherches"
            subtitle="Recherches enregistrées et alertes"
            onPress={() => router.push('/saved-searches' as Href)}
          />
          <ListRow
            icon="star-outline"
            title="Mes avis"
            subtitle="Ce que les autres disent de vous"
            onPress={() =>
              router.push({
                pathname: '/reviews',
                params: { userId: String(user?.id ?? ''), username: user?.username ?? '' },
              } as Href)
            }
          />
          <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push('/notifications')} last />
        </ListGroup>

        <ListGroup title="Compte">
          <ListRow icon="person-outline" title="Modifier le profil" onPress={() => router.push('/edit-profile')} />
          <ListRow icon="settings-outline" title="Paramètres" onPress={() => router.push('/settings')} />
          <ListRow icon="help-circle-outline" title="Aide & Support" onPress={() => router.push('/help-support')} />
          <ListRow icon="information-circle-outline" title="À propos" onPress={() => router.push('/about' as Href)} last />
        </ListGroup>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 56,
  },
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  identityText: { flex: 1, gap: 2 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  completion: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  nextStep: { alignSelf: 'flex-start', marginTop: 8 },
  stats: { flexDirection: 'row', gap: 8 },
  rating: { alignItems: 'center', marginBottom: 4 },
  flex: { flex: 1 },
});
