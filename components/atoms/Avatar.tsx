import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppImage from './AppImage';
import AppText from './AppText';

export interface AvatarProps {
  uri?: string | null;
  name?: string | null;
  size?: number;
  /** Teal verified badge — only pass true when backed by real data. */
  verified?: boolean;
}

function initials(name?: string | null): string {
  if (!name) return '';
  const parts = name.trim().split(/\s+/).slice(0, 2);
  return parts.map((p) => p[0]?.toUpperCase() ?? '').join('');
}

export default function Avatar({ uri, name, size = 40, verified = false }: AvatarProps) {
  const t = useTheme();
  const badge = Math.max(14, Math.round(size * 0.32));
  return (
    <View
      style={{ width: size, height: size }}
      accessibilityLabel={name ? `${name}${verified ? ', vérifié' : ''}` : undefined}>
      {uri ? (
        <AppImage uri={uri} style={{ width: size, height: size, borderRadius: size / 2 }} />
      ) : (
        <View
          style={[
            styles.fallback,
            { width: size, height: size, borderRadius: size / 2, backgroundColor: t.colors.brandTint },
          ]}>
          {initials(name) ? (
            <AppText
              variant={size >= 64 ? 'h2' : 'labelStrong'}
              style={{ color: t.colors.brandStrong }}>
              {initials(name)}
            </AppText>
          ) : (
            <Ionicons name="person" size={size * 0.5} color={t.colors.brandStrong} />
          )}
        </View>
      )}
      {verified && (
        <View
          style={[
            styles.badge,
            {
              width: badge,
              height: badge,
              borderRadius: badge / 2,
              backgroundColor: t.colors.trust,
              borderColor: t.colors.surface,
            },
          ]}>
          <Ionicons name="checkmark" size={badge * 0.65} color={t.isDark ? '#1C1917' : '#FFFFFF'} />
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: { alignItems: 'center', justifyContent: 'center' },
  badge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
