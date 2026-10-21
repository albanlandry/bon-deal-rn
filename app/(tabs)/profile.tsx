// app/(tabs)/profile.tsx — Profil (docs/09 §4 Profile)
// Header: avatar inside the completeness ring that animates to its value
// (endowed progress), name, verified badge, member since. Stats tiles count
// up on first view (own stats only). A 2×2 grid of activity tiles replaces
// the long list; the account list stays below.
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { likedPostsQuery, myPostsQuery } from '@/lib/api/posts';
import { savedSearchesQuery } from '@/lib/api/savedSearches';
import { transactionsQuery } from '@/lib/api/transactions';
import { formatMemberSince } from '@/lib/format';
import { createStyles, useStyles, useTheme } from '@/theme';
import {
  AppText,
  Avatar,
  Badge,
  Button,
  Card,
  FadeInView,
  IconButton,
  ListGroup,
  ListRow,
  PressableScale,
  ProgressRing,
  RatingStars,
  Skeleton,
  useFirstPaint,
  useScrollChrome,
  useTabBarInset,
} from '@/components/ui';
import CountUp from '@/components/motion/CountUp';
import ProfileStat from '@/components/molecules/ProfileStat';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface CompletionStep {
  key: string;
  label: string;
  done: boolean;
  route?: Href;
}

interface ActivityTile {
  key: string;
  icon: IconName;
  label: string;
  count?: number;
  onPress: () => void;
}

export default function ProfileScreen() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles(makeStyles);
  const { user, refreshUser, isAuthenticated } = useAuth();
  const mine = useQuery(myPostsQuery());
  const liked = useQuery({ ...likedPostsQuery(), enabled: isAuthenticated });
  const txns = useQuery({ ...transactionsQuery(), enabled: isAuthenticated });
  const searches = useQuery({ ...savedSearchesQuery(), enabled: isAuthenticated });
  const chrome = useScrollChrome({ drivesTabBar: true });
  const bottomInset = useTabBarInset();
  const firstPaint = useFirstPaint(!!user);

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
  const doneCount = steps.filter((x) => x.done).length;
  const completion = doneCount / steps.length;
  const nextStep = steps.find((x) => !x.done);

  const refreshing = mine.isRefetching;
  const onRefresh = () => {
    mine.refetch();
    liked.refetch();
    txns.refetch();
    searches.refetch();
    refreshUser();
  };

  const openReviews = () =>
    router.push({
      pathname: '/reviews',
      params: { userId: String(user?.id ?? ''), username: user?.username ?? '' },
    } as Href);

  const tiles: ActivityTile[] = [
    { key: 'listings', icon: 'pricetags', label: 'Mes annonces', count: mine.data ? posts.length : undefined, onPress: () => router.push('/my-listings') },
    { key: 'txns', icon: 'receipt', label: 'Transactions', count: txns.data?.length, onPress: () => router.push('/transactions' as Href) },
    { key: 'searches', icon: 'bookmark', label: 'Recherches', count: searches.data?.length, onPress: () => router.push('/saved-searches' as Href) },
    { key: 'favs', icon: 'heart', label: 'Favoris', count: liked.data?.posts?.length, onPress: () => router.push('/(tabs)/favorites') },
  ];

  let section = 0;
  const enter = (child: React.ReactNode) => (
    <FadeInView index={section++} animate={firstPaint}>
      {child}
    </FadeInView>
  );

  return (
    <SafeAreaView edges={['top']} style={s.container}>
      <View style={s.header}>
        <AppText variant="h1" accessibilityRole="header">
          Profil
        </AppText>
        <IconButton icon="settings-outline" label="Paramètres" onPress={() => router.push('/settings')} />
      </View>

      <ScrollView
        contentContainerStyle={[s.content, { paddingBottom: bottomInset + 16 }]}
        showsVerticalScrollIndicator={false}
        onScroll={chrome.onScroll}
        scrollEventThrottle={chrome.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.colors.brandStrong}
            colors={[t.colors.brandStrong]}
            progressBackgroundColor={t.colors.surface}
          />
        }>
        {/* Identity + completeness ring */}
        {enter(
          <Card style={s.identity} elevated>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Profil complété à ${Math.round(completion * 100)} %. Modifier le profil`}
              onPress={() => router.push('/edit-profile')}
              style={s.ringWrap}>
              <ProgressRing progress={completion} size={104} stroke={5} color={t.colors.brandStrong}>
                <Avatar uri={user?.avatar_url} name={displayName} size={84} verified={phoneVerified} />
              </ProgressRing>
              {completion < 1 && (
                <View style={[s.ringPct, { backgroundColor: t.colors.ink }]}>
                  <AppText variant="captionStrong" style={{ color: t.colors.surface }}>
                    {Math.round(completion * 100)} %
                  </AppText>
                </View>
              )}
            </PressableScale>
            <View style={s.identityText}>
              <AppText variant="h2" numberOfLines={1} align="center">
                {displayName}
              </AppText>
              {!!user?.username && displayName !== user.username && (
                <AppText variant="small" color="inkMuted" align="center">
                  @{user.username}
                </AppText>
              )}
              {!!displayLocation && (
                <View style={s.place}>
                  <Ionicons name="location-outline" size={14} color={t.colors.inkMuted} />
                  <AppText variant="small" color="inkMuted" numberOfLines={1}>
                    {displayLocation}
                  </AppText>
                </View>
              )}
              <View style={s.badges}>
                {phoneVerified && <Badge label="Téléphone vérifié" tone="trust" icon="shield-checkmark" />}
                {!!memberSince && <Badge label={memberSince} tone="neutral" icon="calendar-outline" />}
              </View>
              {user?.avg_rating != null && (user?.review_count ?? 0) > 0 && (
                <PressableScale accessibilityRole="button" accessibilityLabel="Voir mes avis" onPress={openReviews} style={s.rating}>
                  <RatingStars value={user.avg_rating} count={user.review_count} size={16} />
                </PressableScale>
              )}
            </View>
            {completion < 1 && nextStep?.route && (
              <View style={[s.nextBox, { backgroundColor: t.colors.brandTint }]}>
                <View style={s.flex}>
                  <AppText variant="labelStrong">
                    {doneCount} étapes sur {steps.length} faites
                  </AppText>
                  <AppText variant="caption" color="inkMuted">
                    Un profil complet rassure les acheteurs.
                  </AppText>
                </View>
                <Button
                  label={nextStep.label}
                  size="sm"
                  variant="secondary"
                  iconRight="arrow-forward"
                  onPress={() => router.push(nextStep.route!)}
                />
              </View>
            )}
          </Card>,
        )}

        {/* Stats — real numbers only, count up on first view */}
        {enter(
          <View style={s.stats}>
            {mine.isLoading ? (
              <>
                <Skeleton height={92} style={s.flex} radius={t.radius.md} />
                <Skeleton height={92} style={s.flex} radius={t.radius.md} />
                <Skeleton height={92} style={s.flex} radius={t.radius.md} />
              </>
            ) : (
              <>
                <ProfileStat
                  value={activeCount}
                  icon="pricetag"
                  label={activeCount > 1 ? 'Annonces actives' : 'Annonce active'}
                  onPress={() => router.push('/my-listings')}
                />
                <ProfileStat
                  value={soldCount}
                  icon="bag-check"
                  label={soldCount > 1 ? 'Ventes' : 'Vente'}
                  onPress={() => router.push('/my-listings')}
                />
                <ProfileStat value={user?.review_count ?? 0} icon="star" label="Avis" onPress={openReviews} />
              </>
            )}
          </View>,
        )}

        {/* Activity tiles 2×2 */}
        {enter(
          <View>
            <AppText variant="captionStrong" color="inkMuted" style={s.groupTitle} accessibilityRole="header">
              MES ACTIVITÉS
            </AppText>
            <View style={s.grid}>
              {tiles.map((tile) => (
                <PressableScale
                  key={tile.key}
                  accessibilityRole="button"
                  accessibilityLabel={tile.count != null ? `${tile.label}, ${tile.count}` : tile.label}
                  onPress={tile.onPress}
                  style={s.tile}>
                  <View style={s.tileTop}>
                    <View style={[s.tileIcon, { backgroundColor: t.colors.brandTint }]}>
                      <Ionicons name={tile.icon} size={22} color={t.colors.brandStrong} />
                    </View>
                    {tile.count != null && <CountUp value={tile.count} variant="h2" />}
                  </View>
                  <View style={s.tileBottom}>
                    <AppText variant="labelStrong" numberOfLines={1} style={s.flex}>
                      {tile.label}
                    </AppText>
                    <Ionicons name="chevron-forward" size={16} color={t.colors.inkSubtle} />
                  </View>
                </PressableScale>
              ))}
            </View>
          </View>,
        )}

        {enter(
          <View>
            <ListGroup title="Compte">
              <ListRow icon="person-outline" title="Modifier le profil" onPress={() => router.push('/edit-profile')} />
              <ListRow icon="star-outline" title="Mes avis" subtitle="Ce que les autres disent de vous" onPress={openReviews} />
              <ListRow icon="notifications-outline" title="Notifications" onPress={() => router.push('/notifications')} />
              <ListRow icon="settings-outline" title="Paramètres" onPress={() => router.push('/settings')} />
              <ListRow icon="help-circle-outline" title="Aide & Support" onPress={() => router.push('/help-support')} />
              <ListRow icon="information-circle-outline" title="À propos" onPress={() => router.push('/about' as Href)} last />
            </ListGroup>
          </View>,
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 56,
  },
  content: { padding: 16, gap: 16 },
  identity: { alignItems: 'center', gap: 12, paddingTop: 20, borderRadius: t.radius.lg },
  ringWrap: { alignItems: 'center' },
  ringPct: {
    position: 'absolute',
    bottom: -6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: t.radius.full,
  },
  identityText: { alignItems: 'center', gap: 2, alignSelf: 'stretch' },
  place: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 6, marginTop: 8 },
  rating: { marginTop: 6, minHeight: 48, justifyContent: 'center', paddingHorizontal: 8 },
  nextBox: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 12,
    padding: 12,
    borderRadius: t.radius.md,
  },
  stats: { flexDirection: 'row', gap: 8 },
  groupTitle: { marginLeft: 4, marginBottom: 8, letterSpacing: 0.5 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: {
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 112,
    padding: 14,
    justifyContent: 'space-between',
    backgroundColor: t.colors.surface,
    borderColor: t.colors.line,
    borderWidth: 1,
    borderRadius: t.radius.lg,
    ...(t.elevation.card as object),
  },
  tileTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tileIcon: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  tileBottom: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 12 },
  flex: { flex: 1 },
}));
