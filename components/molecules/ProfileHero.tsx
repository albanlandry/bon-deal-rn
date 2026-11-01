// components/molecules/ProfileHero.tsx — profile header block (docs/12 "Moi").
// A solid brand block (brand → deeper blue gradient, flat bottom edge) with a
// round avatar in a white ring, the name, short trust lines and round header
// actions; `ProfileStatsCard` is the white card that overlaps its bottom edge
// (pull it up with `marginTop: -PROFILE_HERO_OVERLAP`). Used by Moi and the
// public seller profile.
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useState } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { blend, font, useTheme, withAlpha } from '@/theme';
import AppText from '../atoms/AppText';
import Avatar from '../atoms/Avatar';
import Skeleton from '../atoms/Skeleton';
import CountUp from '../motion/CountUp';
import PressableScale from '../motion/PressableScale';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

/** How far the stats card overlaps the hero. */
export const PROFILE_HERO_OVERLAP = 44;

export interface HeroAction {
  icon: IconName;
  label: string;
  onPress: () => void;
}

export interface ProfileHeroProps {
  name: string;
  avatarUri?: string | null;
  /** Secondary lines under the name (place, "✓ Téléphone vérifié · …"). */
  lines?: (string | null | undefined | false)[];
  onAvatarPress?: () => void;
  avatarLabel?: string;
  /** Back arrow on the left (stack screens). */
  back?: boolean;
  actions?: HeroAction[];
  /** Leave room under the content for the overlapping stats card. */
  overlap?: boolean;
}

function HeaderButton({ icon, label, onPress, fg }: HeroAction & { fg: string }) {
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={4}
      scaleTo={0.92}
      onPress={onPress}
      style={[styles.btn, { backgroundColor: withAlpha('#FFFFFF', 0.16) }]}>
      <Ionicons name={icon} size={22} color={fg} />
    </PressableScale>
  );
}

export default function ProfileHero({
  name,
  avatarUri,
  lines = [],
  onAvatarPress,
  avatarLabel = 'Modifier le profil',
  back = false,
  actions = [],
  overlap = true,
}: ProfileHeroProps) {
  const t = useTheme();
  const c = t.colors;
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Light status bar over the block, only while this screen is focused.
  const [focused, setFocused] = useState(false);
  useFocusEffect(
    useCallback(() => {
      setFocused(true);
      return () => setFocused(false);
    }, []),
  );

  // Light: brand → deeper blue (white text, ≥ 6.7:1). Dark: a deep blue tint
  // with ink text (≥ 9:1).
  const colors: [string, string] = t.isDark
    ? [blend(c.brand, c.canvas, 0.3), c.brandTint]
    : [c.brand, blend(c.ink, c.brand, 0.4)];
  const fg = t.isDark ? c.ink : c.onBrand;
  const shown = lines.filter(Boolean) as string[];

  const avatar = (
    <View style={[styles.ring, { borderColor: withAlpha('#FFFFFF', t.isDark ? 0.25 : 0.45) }]}>
      <Avatar uri={avatarUri} name={name} size={64} />
    </View>
  );

  return (
    <LinearGradient
      colors={colors}
      start={{ x: 0, y: 0 }}
      end={{ x: 0.6, y: 1 }}
      style={[
        styles.block,
        { paddingTop: insets.top + (back ? 4 : 16), paddingBottom: 16 + (overlap ? PROFILE_HERO_OVERLAP : 0) },
      ]}>
      {focused && !t.isDark && <StatusBar style="light" />}
      {back && (
        <View style={styles.topBar}>
          <HeaderButton
            icon="arrow-back"
            label="Retour"
            fg={fg}
            onPress={() => (router.canGoBack() ? router.back() : router.replace('/(tabs)/home'))}
          />
        </View>
      )}
      <View style={styles.identity}>
        {onAvatarPress ? (
          <PressableScale accessibilityRole="button" accessibilityLabel={avatarLabel} onPress={onAvatarPress}>
            {avatar}
          </PressableScale>
        ) : (
          avatar
        )}
        <View style={styles.text}>
          <AppText variant="h2" numberOfLines={1} accessibilityRole="header" style={[styles.name, { color: fg }]}>
            {name}
          </AppText>
          {shown.map((line) => (
            <AppText key={line} variant="caption" numberOfLines={1} style={[styles.line, { color: fg }]}>
              {line}
            </AppText>
          ))}
        </View>
        {actions.map((a) => (
          <HeaderButton key={a.label} {...a} fg={fg} />
        ))}
      </View>
    </LinearGradient>
  );
}

export interface StatItem {
  /** A number counts up; a string is shown as-is ("4,8", "–"). */
  value: number | string;
  label: string;
  a11y: string;
  onPress?: () => void;
}

/** White card with three values overlapping the hero — real numbers only. */
export function ProfileStatsCard({ items, loading }: { items: StatItem[]; loading?: boolean }) {
  const t = useTheme();
  return (
    <View style={[styles.card, { backgroundColor: t.colors.surface, borderRadius: t.radius.md }]}>
      {loading
        ? items.map((it) => <Skeleton key={it.label} height={52} style={styles.flex} radius={t.radius.sm} />)
        : items.map((it, i) => {
            const middle = i > 0 && i < items.length - 1;
            const content = (
              <>
                {typeof it.value === 'number' ? (
                  <CountUp value={it.value} variant="h1" style={styles.value} />
                ) : (
                  <AppText variant="h1" style={styles.value}>
                    {it.value}
                  </AppText>
                )}
                <AppText variant="caption" color="inkSubtle" numberOfLines={1}>
                  {it.label}
                </AppText>
              </>
            );
            const style = [styles.stat, middle && [styles.middle, { borderColor: t.colors.line }]];
            return it.onPress ? (
              <PressableScale
                key={it.label}
                accessibilityRole="button"
                accessibilityLabel={it.a11y}
                onPress={it.onPress}
                style={style}>
                {content}
              </PressableScale>
            ) : (
              <View key={it.label} accessible accessibilityLabel={it.a11y} style={style}>
                {content}
              </View>
            );
          })}
    </View>
  );
}

const styles = StyleSheet.create({
  block: { paddingHorizontal: 16 },
  topBar: { flexDirection: 'row', marginBottom: 8, marginLeft: -4 },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  ring: { borderWidth: 3, borderRadius: 999 },
  text: { flex: 1, gap: 2 },
  name: { ...font('800'), fontSize: 22, lineHeight: 27, letterSpacing: -0.3 },
  line: { opacity: 0.88 },
  btn: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  card: {
    flexDirection: 'row',
    paddingVertical: 14,
    paddingHorizontal: 4,
    gap: 4,
    ...Platform.select({
      android: { elevation: 4 },
      default: {
        shadowColor: '#0F1B2D',
        shadowOpacity: 0.12,
        shadowRadius: 12,
        shadowOffset: { width: 0, height: 6 },
      },
    }),
  },
  stat: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 56, paddingHorizontal: 4 },
  middle: { borderLeftWidth: StyleSheet.hairlineWidth, borderRightWidth: StyleSheet.hairlineWidth },
  value: { ...font('800'), letterSpacing: -0.5, fontVariant: ['tabular-nums'] },
  flex: { flex: 1 },
});
