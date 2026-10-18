/**
 * Toggle list persisted in AsyncStorage (load on mount, save on every change).
 * Used by notification and privacy settings while the backend has no
 * endpoint for them.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useCallback, useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Skeleton from '../atoms/Skeleton';
import ListRow, { ListGroup } from '../molecules/ListRow';
import { Ionicons } from '@expo/vector-icons';

export interface LocalToggleItem {
  id: string;
  title: string;
  description: string;
  icon?: React.ComponentProps<typeof Ionicons>['name'];
  defaultValue: boolean;
  /** Disabled when the given toggle id is off (e.g. everything depends on push). */
  dependsOn?: string;
}

export interface LocalToggleGroup {
  title: string;
  items: LocalToggleItem[];
}

export function useLocalSettings(storageKey: string, groups: LocalToggleGroup[]) {
  const defaults = Object.fromEntries(
    groups.flatMap((g) => g.items.map((i) => [i.id, i.defaultValue])),
  ) as Record<string, boolean>;
  const [values, setValues] = useState<Record<string, boolean>>(defaults);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(storageKey)
      .then((raw) => {
        if (raw) {
          const saved = JSON.parse(raw);
          if (saved && typeof saved === 'object') setValues((v) => ({ ...v, ...saved }));
        }
      })
      .catch(() => {})
      .finally(() => setLoaded(true));
  }, [storageKey]);

  const set = useCallback(
    (id: string, value: boolean) => {
      setValues((prev) => {
        const next = { ...prev, [id]: value };
        AsyncStorage.setItem(storageKey, JSON.stringify(next)).catch(() => {});
        return next;
      });
    },
    [storageKey],
  );

  return { values, set, loaded };
}

export default function SettingsLocalToggles({
  storageKey,
  groups,
}: {
  storageKey: string;
  groups: LocalToggleGroup[];
}) {
  const t = useTheme();
  const { values, set, loaded } = useLocalSettings(storageKey, groups);

  if (!loaded) {
    return (
      <View style={styles.loading}>
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} height={56} radius={t.radius.md} />
        ))}
      </View>
    );
  }

  return (
    <>
      {groups.map((g) => (
        <ListGroup key={g.title} title={g.title}>
          {g.items.map((item, idx) => {
            const blocked = !!item.dependsOn && !values[item.dependsOn];
            return (
              <ListRow
                key={item.id}
                icon={item.icon}
                title={item.title}
                subtitle={item.description}
                toggle={{
                  value: values[item.id] && !blocked,
                  onChange: (v) => set(item.id, v),
                  disabled: blocked,
                }}
                last={idx === g.items.length - 1}
              />
            );
          })}
        </ListGroup>
      ))}
      <View style={styles.note}>
        <Ionicons name="phone-portrait-outline" size={16} color={t.colors.inkMuted} />
        <AppText variant="caption" color="inkMuted" style={styles.flex}>
          Ces réglages sont enregistrés automatiquement sur cet appareil uniquement.
        </AppText>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loading: { gap: 12 },
  note: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', paddingHorizontal: 4 },
  flex: { flex: 1 },
});
