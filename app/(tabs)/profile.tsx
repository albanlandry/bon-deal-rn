// app/(tabs)/profile.tsx — Moi (docs/12 layout on direction B tokens).
// A solid brand header block (avatar with a white ring, name, "✓ Téléphone
// vérifié · membre depuis …", settings) with a white stats card overlapping
// its bottom edge (note · avis, ventes, en ligne — real numbers, "–" when
// unknown). Shortcuts as 2 × 2 tiles (Mes annonces, Achats et ventes,
// Favoris, Alertes), ONE completion suggestion (the next missing step), then
// the account rows. Tight corners only (radius.md cards, radius.sm icons).
import { Ionicons } from '@expo/vector-icons';
import { Href, useRouter } from 'expo-router';
import { useQuery } from '@tanstack/react-query';
import React from 'react';
import { RefreshControl, ScrollView, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useAuth } from '@/contexts/AuthContext';
import { likedPostsQuery, myPostsQuery } from '@/lib/api/posts';
import { savedSearchesQuery } from '@/lib/api/savedSearches';
import { parseServerDate, transactionsQuery } from '@/lib/api/transactions';
import Animated from 'react-native-reanimated';
import { enterFade, riseIn } from '@/components/motion/anim';
import { duration } from '@/theme/motion';
import { ColorTokens, createStyles, useStyles, useTheme } from '@/theme';
import {
  AppText,
  Button,
  FadeInView,
  ListGroup,
  ListRow,
  PressableScale,
  Skeleton,
  useFirstPaint,
  useScrollChrome,
  useTabBarInset,
} from '@/components/ui';
import ProfileHero, { PROFILE_HERO_OVERLAP, ProfileStatsCard } from '@/components/molecules/ProfileHero';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface CompletionStep {
  key: string;
  label: string;
  hint: string;
  done: boolean;
  route?: Href;
}

interface Shortcut {
  key: string;
  icon: IconName;
  tint: keyof ColorTokens;
  fg: keyof ColorTokens;
  label: string;
  /** Second line; undefined while loading (a skeleton line is shown). */
  detail?: string;
  a11y: string;
  onPress: () => void;
}

const plural = (n: number, one: string, many: string) => `${n} ${n > 1 ? many : one}`;

export default function ProfileScreen() {
  const router = useRouter();
  const t = useTheme();
  const s = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
  const { user, refreshUser, isAuthenticated } = useAuth();
  const mine = useQuery(myPostsQuery());
  const liked = useQuery({ ...likedPostsQuery(), enabled: isAuthenticated });
  const txns = useQuery({ ...transactionsQuery(), enabled: isAuthenticated });
  const searches = useQuery({ ...savedSearchesQuery(), enabled: isAuthenticated });
  const chrome = useScrollChrome({ drivesTabBar: true });
  const bottomInset = useTabBarInset();
  const firstPaint = useFirstPaint(!!user);

  const posts = mine.data?.posts ?? [];
  const onlineCount = posts.filter((p) => p.state === 'published' || p.state === 'reserved').length;
  const soldCount = posts.filter((p) => p.state === 'sold').length;
  const draftCount = posts.filter((p) => p.state === 'draft').length;
  const ongoing = (txns.data ?? []).filter((x) => x.status === 'pending' || x.status === 'disputed');
  const ongoingCount = ongoing.length;
  const meetingCount = ongoing.filter((x) => {
    const at = parseServerDate((x as { meeting_at?: string | null }).meeting_at);
    return !!at && at.getTime() > Date.now();
  }).length;

  const displayName =
    [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.username || 'Utilisateur';
  const displayLocation = [user?.quartier, user?.city].filter(Boolean).join(', ') || null;

  // Phone numbers on BonDeal accounts come from Firebase phone auth, i.e.
  // they were verified by SMS OTP. That is the only "verified" signal the
  // backend exposes for the current user, so the badge is shown only then.
  const phoneVerified = !!user?.phone_number;
  const memberYear = parseServerDate(user?.created_at)?.getFullYear() ?? null;
  const trustLine = [
    phoneVerified ? '✓ Téléphone vérifié' : null,
    memberYear ? `membre depuis ${memberYear}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  // Endowed progress: the first steps (account + phone) are already done
  // after signup. Only the NEXT missing step is suggested.
  const steps: CompletionStep[] = [
    { key: 'account', label: 'Compte créé', hint: '', done: !!user },
    { key: 'phone', label: 'Téléphone vérifié', hint: '', done: phoneVerified },
    {
      key: 'name',
      label: 'Ajouter mon nom',
      hint: 'Ajoutez votre nom : les acheteurs savent à qui ils parlent.',
      done: !!(user?.first_name || user?.last_name),
      route: '/edit-profile',
    },
    {
      key: 'place',
      label: 'Choisir mon quartier',
      hint: 'Indiquez votre quartier pour voir les annonces près de chez vous.',
      done: !!user?.quartier,
      route: '/edit-profile',
    },
    {
      key: 'avatar',
      label: 'Ajouter une photo',
      hint: 'Ajoutez une photo : les acheteurs vous reconnaîtront.',
      done: !!user?.avatar_url,
      route: '/edit-profile',
    },
    {
      key: 'password',
      label: 'Choisir un mot de passe',
      hint: 'Un mot de passe vous permet de vous connecter sans SMS.',
      done: !!user?.has_password,
      route: { pathname: '/set-password', params: { mode: 'settings' } },
    },
  ];
  const doneCount = steps.filter((x) => x.done).length;
  const completion = doneCount / steps.length;
  const nextStep = steps.find((x) => !x.done);

  // A failed count must not just vanish (docs/10 A5): one error row with a
  // retry for whichever of the four queries failed.
  const failed = [mine, liked, txns, searches].filter((q) => q.isError);
  const retryFailed = () => failed.forEach((q) => q.refetch());
  const retrying = failed.some((q) => q.isFetching);
  const postsUnavailable = !mine.data && mine.isError;

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

  const reviewCount = user?.review_count ?? 0;
  const rating = user?.avg_rating != null && reviewCount > 0 ? user.avg_rating : null;

  const favCount = liked.data?.posts?.length;
  const searchCount = searches.data?.length;

  /** Detail line for a query-backed tile: undefined = loading, '–' = failed. */
  const detail = (q: { isLoading: boolean; isError: boolean; data?: unknown }, text: () => string) =>
    q.data !== undefined ? text() : q.isError ? '–' : q.isLoading ? undefined : '–';

  const shortcuts: Shortcut[] = [
    {
      key: 'listings',
      icon: 'pricetags-outline',
      tint: 'brandTint',
      fg: 'brandStrong',
      label: 'Mes annonces',
      detail: detail(mine, () =>
        [`${onlineCount} en ligne`, draftCount > 0 ? plural(draftCount, 'brouillon', 'brouillons') : null]
          .filter(Boolean)
          .join(' · '),
      ),
      a11y: `Mes annonces, ${onlineCount} en ligne${draftCount > 0 ? `, ${plural(draftCount, 'brouillon', 'brouillons')}` : ''}`,
      onPress: () => router.push('/my-listings'),
    },
    {
      key: 'txns',
      icon: 'swap-horizontal-outline',
      tint: 'trustTint',
      fg: 'trust',
      label: 'Achats et ventes',
      detail: isAuthenticated
        ? detail(txns, () =>
            meetingCount > 0
              ? plural(meetingCount, 'rendez-vous', 'rendez-vous')
              : ongoingCount > 0
                ? `${ongoingCount} en cours`
                : 'Aucun en cours',
          )
        : '–',
      a11y: `Achats et ventes${ongoingCount > 0 ? `, ${ongoingCount} en cours` : ''}${meetingCount > 0 ? `, ${plural(meetingCount, 'rendez-vous', 'rendez-vous')}` : ''}`,
      onPress: () => router.push('/transactions' as Href),
    },
    {
      key: 'favs',
      icon: 'heart-outline',
      tint: 'dangerTint',
      fg: 'danger',
      label: 'Favoris',
      detail: isAuthenticated
        ? detail(liked, () => (favCount ? plural(favCount, 'annonce', 'annonces') : 'Aucune annonce'))
        : '–',
      a11y: `Favoris${favCount != null ? `, ${favCount}` : ''}`,
      onPress: () => router.push('/favorites'),
    },
    {
      key: 'searches',
      icon: 'notifications-outline',
      tint: 'warningTint',
      fg: 'warning',
      label: 'Alertes',
      detail: isAuthenticated
        ? detail(searches, () => (searchCount ? plural(searchCount, 'recherche', 'recherches') : 'Aucune alerte'))
        : '–',
      a11y: `Alertes de recherche${searchCount != null ? `, ${searchCount}` : ''}`,
      onPress: () => router.push('/saved-searches' as Href),
    },
  ];

  // First paint only: header fades, the stats card rises over it, the four
  // tiles follow 30 ms apart, then the remaining sections.
  const TILE_INDEX = 2;
  let section = TILE_INDEX + 4;
  const enter = (child: React.ReactNode) => (
    <FadeInView index={section++} animate={firstPaint}>
      {child}
    </FadeInView>
  );

  const c = t.colors;
  const ratingText =
    rating != null ? rating.toLocaleString('fr-FR', { minimumFractionDigits: 1, maximumFractionDigits: 1 }) : '–';

  return (
    <View style={s.container}>
      <ScrollView
        contentContainerStyle={{ paddingBottom: bottomInset + 16 }}
        showsVerticalScrollIndicator={false}
        onScroll={chrome.onScroll}
        scrollEventThrottle={chrome.scrollEventThrottle}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={c.brandStrong}
            colors={[c.brandStrong]}
            progressBackgroundColor={c.surface}
            progressViewOffset={insets.top}
          />
        }>
        <Animated.View entering={firstPaint ? enterFade(duration.medium) : undefined}>
          <ProfileHero
            name={displayName}
            avatarUri={user?.avatar_url}
            onAvatarPress={() => router.push('/edit-profile')}
            lines={[displayLocation, trustLine]}
            actions={[{ icon: 'settings-outline', label: 'Paramètres', onPress: () => router.push('/settings') }]}
          />
        </Animated.View>

        <View style={s.body}>
          {/* Stats card overlapping the header — real numbers only. */}
          <Animated.View entering={firstPaint ? riseIn({ dy: 24, delay: duration.step }) : undefined}>
          <ProfileStatsCard
            loading={mine.isLoading}
            items={[
              {
                value: ratingText,
                label: plural(reviewCount, 'avis', 'avis'),
                a11y:
                  rating != null
                    ? `Note ${rating.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} sur 5, ${plural(reviewCount, 'avis', 'avis')}. Voir mes avis`
                    : 'Aucun avis pour l’instant. Voir mes avis',
                onPress: openReviews,
              },
              {
                value: postsUnavailable ? '–' : soldCount,
                label: soldCount > 1 ? 'ventes' : 'vente',
                a11y: postsUnavailable ? 'Ventes indisponibles' : plural(soldCount, 'vente', 'ventes'),
                onPress: () => router.push('/my-listings'),
              },
              {
                value: postsUnavailable ? '–' : onlineCount,
                label: 'en ligne',
                a11y: postsUnavailable ? 'Annonces indisponibles' : `${onlineCount} en ligne`,
                onPress: () => router.push('/my-listings'),
              },
            ]}
          />
          </Animated.View>

          {/* Shortcuts as 2 × 2 tiles, staggered on first paint. */}
          <View style={s.grid}>
            {[shortcuts.slice(0, 2), shortcuts.slice(2, 4)].map((pair, r) => (
              <View key={r} style={s.gridRow}>
                {pair.map((tile, i) => (
                  <FadeInView key={tile.key} index={TILE_INDEX + r * 2 + i} animate={firstPaint} style={s.flex}>
                    <PressableScale
                      accessibilityRole="button"
                      accessibilityLabel={tile.a11y}
                      scaleTo={0.97}
                      onPress={tile.onPress}
                      style={[s.tile, { backgroundColor: c.surface, borderColor: c.line }]}>
                      <View style={[s.tileIcon, { backgroundColor: c[tile.tint] }]}>
                        <Ionicons name={tile.icon} size={20} color={c[tile.fg]} />
                      </View>
                      <AppText variant="labelStrong" numberOfLines={1} style={s.tileTitle}>
                        {tile.label}
                      </AppText>
                      {tile.detail === undefined ? (
                        <Skeleton width={90} height={12} radius={t.radius.xs} style={s.tileSkeleton} />
                      ) : (
                        <AppText variant="caption" color="inkSubtle" numberOfLines={1} style={s.num}>
                          {tile.detail}
                        </AppText>
                      )}
                    </PressableScale>
                  </FadeInView>
                ))}
              </View>
            ))}
          </View>

          {/* ONE completion suggestion: the next missing step. */}
          {completion < 1 && nextStep?.route && (
            enter(
              <View style={[s.suggest, { backgroundColor: c.brandTint }]}>
                <View style={s.flex}>
                  <AppText variant="labelStrong">Profil complété à {Math.round(completion * 100)} %</AppText>
                  <AppText variant="caption" color="inkMuted">
                    {nextStep.hint}
                  </AppText>
                </View>
                <Button label={nextStep.label} size="sm" onPress={() => router.push(nextStep.route!)} />
              </View>,
            )
          )}

          {failed.length > 0 && (
            <View style={[s.errorRow, { backgroundColor: c.dangerTint }]} accessibilityRole="alert">
              <Ionicons name="cloud-offline-outline" size={20} color={c.danger} />
              <AppText variant="small" style={s.flex}>
                Certains chiffres n’ont pas pu être chargés.
              </AppText>
              <Button label="Réessayer" variant="ghost" onPress={retryFailed} loading={retrying} />
            </View>
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
        </View>
      </ScrollView>
    </View>
  );
}

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  body: { paddingHorizontal: 16, gap: 16, marginTop: -PROFILE_HERO_OVERLAP },
  num: { fontVariant: ['tabular-nums'] },
  grid: { gap: 10 },
  gridRow: { flexDirection: 'row', gap: 10 },
  tile: { flex: 1, padding: 14, borderRadius: t.radius.md, borderWidth: 1, minHeight: 112 },
  tileIcon: { width: 40, height: 40, borderRadius: t.radius.sm, alignItems: 'center', justifyContent: 'center' },
  tileTitle: { marginTop: 10 },
  tileSkeleton: { marginTop: 4 },
  suggest: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderRadius: t.radius.md },
  errorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingLeft: 16,
    paddingRight: 4,
    minHeight: 56,
    borderRadius: t.radius.md,
  },
  flex: { flex: 1 },
}));
