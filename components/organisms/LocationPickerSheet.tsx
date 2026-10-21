/**
 * Country → city → quartier picker fed by /geo (docs/08 §A).
 *
 * - The country step only appears when more than one country is enabled.
 * - Searchable lists that ignore accents and case ("lambarene" → Lambaréné).
 * - Cities show how many quartiers they have; a city without any can be
 *   validated directly.
 * - Quartier is optional ("Toute la ville") unless `requireQuartier`.
 *
 * The caller persists the choice in `onConfirm` (a rejected promise keeps the
 * sheet open; the caller shows the error).
 */
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useTheme } from '@/theme';
import { BdCity, BdCountry, BdGeoQuartier, citiesQuery, cityQuartiersQuery, useCountries, useResolvedCity } from '@/lib/api/geo';
import { haptics } from '@/lib/haptics';
import { searchByName, sameName } from '@/lib/textSearch';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import Skeleton from '../atoms/Skeleton';
import TextField from '../atoms/TextField';
import { ErrorState } from '../molecules/EmptyState';
import Sheet from './Sheet';

export interface LocationChoice {
  countryIso2: string;
  city: string;
  quartier: string | null;
}

export interface LocationPickerSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Current values, to preselect and to start on the quartier step. */
  city?: string | null;
  quartier?: string | null;
  /** 'quartier' opens on the quartier list of `city` (when it resolves). */
  initialStep?: 'city' | 'quartier';
  /** Hide the quartier step: choose a city only. */
  cityOnly?: boolean;
  onConfirm: (choice: LocationChoice) => Promise<unknown> | void;
}

type Step = 'country' | 'city' | 'quartier';

function plural(n: number, one: string, many: string) {
  return `${n.toLocaleString('fr-FR')} ${n > 1 ? many : one}`;
}

export default function LocationPickerSheet({
  visible,
  onClose,
  city: currentCity,
  quartier: currentQuartier,
  initialStep = 'city',
  cityOnly = false,
  onConfirm,
}: LocationPickerSheetProps) {
  const t = useTheme();
  const { height } = useWindowDimensions();
  const geo = useCountries();
  const resolved = useResolvedCity(visible ? currentCity : null);

  const [step, setStep] = useState<Step>('city');
  const [iso2, setIso2] = useState<string | null>(null);
  const [city, setCity] = useState<BdCity | null>(null);
  const [filter, setFilter] = useState('');
  const [saving, setSaving] = useState<string | null>(null);

  // Reset each time the sheet opens.
  useEffect(() => {
    if (!visible) return;
    setFilter('');
    setSaving(null);
    setIso2(resolved.countryIso2 ?? geo.defaultIso2);
    if (initialStep === 'quartier' && resolved.city && !cityOnly) {
      setCity(resolved.city);
      setStep('quartier');
    } else {
      setCity(resolved.city);
      setStep('city');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible, resolved.city?.id, resolved.countryIso2, geo.defaultIso2]);

  const country: BdCountry | undefined = geo.countries.find((c) => c.iso2 === iso2);
  const cities = useQuery({ ...citiesQuery(iso2), enabled: visible && !!iso2 && step !== 'country' });
  const quartiers = useQuery({ ...cityQuartiersQuery(city?.id), enabled: visible && step === 'quartier' && !!city });

  const go = (next: Step) => {
    setFilter('');
    setStep(next);
  };

  const finish = async (c: BdCity, q: string | null) => {
    setSaving(q ?? c.name);
    try {
      await onConfirm({ countryIso2: iso2 ?? geo.defaultIso2, city: c.name, quartier: q });
      haptics.success();
    } catch {
      // the caller showed the error; stay open so the user can retry
    } finally {
      setSaving(null);
    }
  };

  const pickCity = (c: BdCity) => {
    if (cityOnly || c.quartier_count === 0) {
      finish(c, null);
      return;
    }
    setCity(c);
    go('quartier');
  };

  const countryRows = useMemo(
    () => searchByName(geo.countries, filter, (c) => c.name),
    [geo.countries, filter],
  );
  const cityRows = useMemo(() => searchByName(cities.data ?? [], filter, (c) => c.name), [cities.data, filter]);
  const quartierRows = useMemo(
    () => searchByName(quartiers.data ?? [], filter, (q) => q.name),
    [quartiers.data, filter],
  );

  const title =
    step === 'country' ? 'Choisir un pays' : step === 'city' ? 'Choisir une ville' : `Quartier à ${city?.name ?? ''}`;

  const loading = (n = 6) => (
    <View style={styles.skeletons}>
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} height={44} />
      ))}
    </View>
  );

  const row = (
    key: string | number,
    label: string,
    opts: { selected?: boolean; caption?: string; leading?: React.ReactNode; chevron?: boolean; onPress: () => void },
  ) => (
    <Pressable
      key={key}
      accessibilityRole="button"
      accessibilityState={{ selected: !!opts.selected, busy: saving === label }}
      accessibilityLabel={opts.caption ? `${label}, ${opts.caption}` : label}
      disabled={!!saving}
      onPress={opts.onPress}
      style={({ pressed }) => [
        styles.row,
        { borderBottomColor: t.colors.line },
        pressed && { backgroundColor: t.colors.surfaceAlt },
      ]}>
      {opts.leading}
      <View style={styles.flex}>
        <AppText variant={opts.selected ? 'bodyStrong' : 'body'} numberOfLines={1}>
          {label}
        </AppText>
        {!!opts.caption && (
          <AppText variant="caption" color="inkMuted">
            {opts.caption}
          </AppText>
        )}
      </View>
      {saving === label ? (
        <AppText variant="caption" color="inkMuted">
          Enregistrement…
        </AppText>
      ) : opts.selected ? (
        <Ionicons name="checkmark" size={20} color={t.colors.brandStrong} />
      ) : opts.chevron ? (
        <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
      ) : null}
    </Pressable>
  );

  const empty = (text: string) => (
    <AppText variant="small" color="inkMuted" style={styles.empty}>
      {text}
    </AppText>
  );

  let body: React.ReactNode;
  if (step === 'country') {
    body = geo.isLoading ? (
      loading()
    ) : geo.isError ? (
      <ErrorState onRetry={() => geo.refetch()} />
    ) : (
      <FlatList
        data={countryRows}
        keyExtractor={(c) => c.iso2}
        keyboardShouldPersistTaps="handled"
        ListEmptyComponent={empty('Aucun pays ne correspond.')}
        renderItem={({ item }) =>
          row(item.iso2, item.name, {
            selected: item.iso2 === iso2,
            leading: <AppText variant="h3">{item.flag ?? '🏳️'}</AppText>,
            chevron: true,
            onPress: () => {
              setIso2(item.iso2);
              setCity(null);
              go('city');
            },
          })
        }
      />
    );
  } else if (step === 'city') {
    body = cities.isLoading ? (
      loading()
    ) : cities.isError ? (
      <ErrorState onRetry={() => cities.refetch()} />
    ) : (
      <FlatList
        data={cityRows}
        keyExtractor={(c) => String(c.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        ListEmptyComponent={empty(filter ? 'Aucune ville ne correspond.' : 'Aucune ville disponible pour le moment.')}
        renderItem={({ item }) =>
          row(item.id, item.name, {
            selected: sameName(item.name, currentCity),
            caption: item.quartier_count
              ? plural(item.quartier_count, 'quartier', 'quartiers')
              : 'Aucun quartier référencé',
            chevron: !cityOnly && item.quartier_count > 0,
            onPress: () => pickCity(item),
          })
        }
      />
    );
  } else {
    const noneLabel = 'Toute la ville';
    body = quartiers.isLoading ? (
      loading()
    ) : quartiers.isError ? (
      <ErrorState onRetry={() => quartiers.refetch()} />
    ) : (
      <FlatList
        data={quartierRows}
        keyExtractor={(q: BdGeoQuartier) => String(q.id)}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={20}
        ListHeaderComponent={
          filter
            ? null
            : row('none', noneLabel, {
                selected: !!city && sameName(city.name, currentCity) && !currentQuartier,
                caption: 'Sans quartier précis',
                leading: <Ionicons name="business-outline" size={20} color={t.colors.inkMuted} />,
                onPress: () => city && finish(city, null),
              })
        }
        ListEmptyComponent={empty(filter ? 'Aucun quartier ne correspond.' : 'Aucun quartier référencé.')}
        renderItem={({ item }) =>
          row(item.id, item.name, {
            selected: !!city && sameName(city.name, currentCity) && sameName(item.name, currentQuartier),
            leading: <Ionicons name="location-outline" size={18} color={t.colors.inkSubtle} />,
            onPress: () => city && finish(city, item.name),
          })
        }
      />
    );
  }

  const back =
    step === 'quartier'
      ? { label: 'Changer de ville', onPress: () => go('city') }
      : step === 'city' && !geo.single
        ? { label: country ? `${country.flag ?? ''} ${country.name} · Changer de pays`.trim() : 'Changer de pays', onPress: () => go('country') }
        : null;

  return (
    <Sheet visible={visible} onClose={onClose} title={title} scroll={false}>
      <View style={{ height: Math.min(height * 0.7, 620) }}>
        {back && (
          <Button
            label={back.label}
            variant="ghost"
            size="sm"
            icon="chevron-back"
            onPress={back.onPress}
            style={styles.back}
          />
        )}
        <TextField
          placeholder={
            step === 'country' ? 'Rechercher un pays' : step === 'city' ? 'Rechercher une ville' : 'Rechercher un quartier'
          }
          value={filter}
          onChangeText={setFilter}
          left={<Ionicons name="search" size={18} color={t.colors.inkSubtle} />}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          accessibilityLabel={
            step === 'country' ? 'Rechercher un pays' : step === 'city' ? 'Rechercher une ville' : 'Rechercher un quartier'
          }
        />
        <View style={styles.flex}>{body}</View>
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  back: { alignSelf: 'flex-start', marginLeft: -8 },
  skeletons: { gap: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 56,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  empty: { paddingVertical: 16 },
});
