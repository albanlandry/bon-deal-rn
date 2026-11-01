/**
 * A listing's real engagement counts: favourites (likes_count), views
 * (views_count) and chats opened (chats_count: conversations with at least one
 * message). Icon + number, never invented (docs/06 guardrail 1).
 *
 * - `compact` (cards): icon + number only, 12 px, tight.
 * - `full` (item page): icon + number + French noun, 16 px.
 * - `onImage`: white text for cards drawn over a photo (hero carousel).
 */
import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import type { BdPost } from '@/constants/types';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

type Stat = { icon: React.ComponentProps<typeof Ionicons>['name']; n: number; one: string; many: string };

function statsOf(post: Pick<BdPost, 'likes_count' | 'views_count'> & { chats_count?: number | null }): Stat[] {
  return [
    { icon: 'heart-outline', n: post.likes_count ?? 0, one: 'favori', many: 'favoris' },
    { icon: 'eye-outline', n: post.views_count ?? 0, one: 'vue', many: 'vues' },
    { icon: 'chatbubble-outline', n: post.chats_count ?? 0, one: 'discussion', many: 'discussions' },
  ];
}

const noun = (s: Stat) => (s.n > 1 ? s.many : s.one);

export interface PostStatsProps {
  post: Pick<BdPost, 'likes_count' | 'views_count'> & { chats_count?: number | null };
  size?: 'compact' | 'full';
  onImage?: boolean;
  style?: StyleProp<ViewStyle>;
}

export default function PostStats({ post, size = 'compact', onImage = false, style }: PostStatsProps) {
  const t = useTheme();
  const stats = statsOf(post);
  const full = size === 'full';
  const color = onImage ? t.colors.onOverlay : t.colors.inkMuted;
  return (
    <View
      accessible
      accessibilityLabel={stats.map((s) => `${s.n} ${noun(s)}`).join(', ')}
      style={[styles.row, full && styles.rowFull, style]}>
      {stats.map((s) => (
        <View key={s.icon} style={styles.item}>
          <Ionicons name={s.icon} size={full ? 16 : 12} color={color} />
          <AppText variant={full ? 'small' : 'caption'} style={[styles.num, { color }]}>
            {full ? `${s.n} ${noun(s)}` : String(s.n)}
          </AppText>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowFull: { gap: 16, flexWrap: 'wrap' },
  item: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  num: { fontVariant: ['tabular-nums'] },
});
