// app/search.tsx — Recherche: instant suggestions, recent searches, "Trouve-moi ça".
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, ReduceMotion, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AppText, Button, CategoryTag, Chip, FadeInView, IconButton, PressableScale, showToast } from '@/components/ui';
import { layoutEase } from '@/components/motion/anim';
import AiGradientCard from '@/components/molecules/AiGradientCard';
import HighlightText from '@/components/molecules/HighlightText';
import { CATEGORIES } from '@/constants/catalog';
import type { BdParsedSearch } from '@/constants/types';
import { ApiError } from '@/lib/api';
import { parseSearch } from '@/lib/api/ai';
import { searchSuggestQuery } from '@/lib/api/posts';
import { createStyles, useStyles, useTheme } from '@/theme';

// AsyncStorage key for recent searches (unchanged).
const RECENT_SEARCHES_KEY = '@bondeal_recent_searches';

function nlErrMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 429) return 'Limite atteinte, réessayez plus tard.';
    if (e.status === 502 || e.status === 503) return 'Recherche intelligente indisponible.';
    return e.message;
  }
  return 'Recherche intelligente indisponible. Réessayez.';
}

const saveRecentSearches = async (searches: string[]) => {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent searches:', error);
  }
};

const loadRecentSearches = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading recent searches:', error);
    return [];
  }
};

const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

export default function SearchScreen() {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>([]);

  useEffect(() => {
    loadRecentSearches().then(setRecentItems);
  }, []);

  // Persist the term (dedupe, move-to-top, max 10).
  const rememberRecent = (q: string) => {
    const updated = [q, ...recentItems.filter((x) => x !== q)].slice(0, 10);
    setRecentItems(updated);
    saveRecentSearches(updated);
  };

  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    rememberRecent(q);
    router.push({ pathname: '/search-results', params: { query: q } });
  };

  // Natural-language ("Trouve-moi ça"): parse the utterance → filtered results.
  const nlSearch = useMutation({
    mutationFn: (utter: string) => parseSearch(utter),
    onSuccess: (parsed: BdParsedSearch, utter) => {
      rememberRecent(utter.trim());
      const params: Record<string, string> = { query: parsed.search || utter.trim() };
      if (parsed.categories?.length) params.categories = parsed.categories.join(',');
      if (parsed.min_price != null) params.minPrice = String(parsed.min_price);
      if (parsed.max_price != null) params.maxPrice = String(parsed.max_price);
      if (parsed.condition?.length) params.condition = parsed.condition.join(',');
      if (parsed.sort) params.sort = parsed.sort;
      router.push({ pathname: '/search-results', params });
    },
    onError: (e) => showToast.error('Recherche intelligente', nlErrMessage(e)),
  });

  const handleNlSearch = () => {
    const utter = searchQuery.trim();
    if (!utter) {
      showToast.info('Trouve-moi ça', 'Décrivez ce que vous cherchez, ex : « un frigo pas cher ».');
      return;
    }
    nlSearch.mutate(utter);
  };

  const browseCategory = (value: string) => {
    router.push({ pathname: '/search-results', params: { category: value } });
  };

  const handleClearRecentSearches = async () => {
    setRecentItems([]);
    await clearRecentSearches();
  };

  // Debounced server suggestions (titles in the user's city).
  const [debounced, setDebounced] = useState('');
  useEffect(() => {
    const id = setTimeout(() => setDebounced(searchQuery.trim()), 250);
    return () => clearTimeout(id);
  }, [searchQuery]);
  const serverSuggest = useQuery(searchSuggestQuery(debounced));

  // Instant suggestions: matching recent searches first, then server titles
  // (deduped case- and accent-insensitively), then matching categories.
  const q = normalize(searchQuery.trim());
  const suggestions = useMemo(() => {
    if (!q) return { recent: [] as string[], server: [] as string[], cats: [] as typeof CATEGORIES };
    const recent = recentItems.filter((r) => normalize(r).includes(q)).slice(0, 5);
    const seen = new Set([q, ...recent.map(normalize)]);
    const server: string[] = [];
    for (const title of serverSuggest.data ?? []) {
      const k = normalize(title.trim());
      if (!k || seen.has(k)) continue;
      seen.add(k);
      server.push(title.trim());
      if (server.length >= 6) break;
    }
    return {
      recent,
      server,
      cats: CATEGORIES.filter((c) => normalize(c.label).includes(q)).slice(0, 4),
    };
  }, [q, recentItems, serverSuggest.data]);

  const looksLikeSentence = searchQuery.trim().split(/\s+/).length >= 3;

  const suggestionRow = (
    key: string,
    icon: React.ReactNode,
    label: string,
    a11y: string,
    onPress: () => void,
    trailing?: React.ReactNode,
  ) => (
    <Animated.View key={key} layout={layoutEase()}>
      <PressableScale accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} style={s.suggestion}>
        {icon}
        <HighlightText text={label} query={searchQuery} variant="body" color="inkMuted" style={s.flex} numberOfLines={1} />
        {trailing}
      </PressableScale>
    </Animated.View>
  );

  return (
    <SafeAreaView style={s.container}>
      {/* Search bar — grows in from the Home pill (container transform). */}
      <Animated.View entering={growIn} style={s.searchRow}>
        <IconButton icon="arrow-back" label="Retour" onPress={() => router.back()} />
        <View style={s.inputWrap}>
          <Ionicons name="search" size={20} color={t.colors.inkMuted} />
          <TextInput
            style={[t.type.body, s.input]}
            placeholder="Que cherchez-vous ?"
            placeholderTextColor={t.colors.inkSubtle}
            selectionColor={t.colors.brandStrong}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => runSearch(searchQuery)}
            autoFocus
            returnKeyType="search"
            accessibilityLabel="Rechercher"
            maxFontSizeMultiplier={1.3}
          />
          {!!searchQuery && (
            <IconButton icon="close-circle" label="Effacer" color="inkSubtle" size={20} onPress={() => setSearchQuery('')} />
          )}
        </View>
      </Animated.View>

      <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={s.content}>
        {/* Trouve-moi ça — turns a vague need into a short ranked list (choice overload) */}
        <FadeInView index={0}>
          <AiGradientCard>
            <View style={s.aiHeader}>
              <View style={s.aiIcon}>
                <Ionicons name="sparkles" size={18} color={t.colors.brandStrong} />
              </View>
              <AppText variant="h3" style={s.flex}>
                Trouve-moi ça
              </AppText>
            </View>
            <AppText variant="small" color="inkMuted">
              {looksLikeSentence
                ? 'Laissez l’IA transformer votre phrase en filtres (catégorie, prix, état).'
                : 'Décrivez ce que vous cherchez avec vos mots, ex : « un frigo pas cher en bon état ».'}
            </AppText>
            <Button
              label={nlSearch.isPending ? 'Analyse de votre demande…' : 'Chercher avec l’IA'}
              icon="sparkles-outline"
              onPress={handleNlSearch}
              loading={nlSearch.isPending}
              disabled={!searchQuery.trim()}
              disabledReason="Tapez d’abord ce que vous cherchez."
              size="sm"
              style={s.aiButton}
            />
          </AiGradientCard>
        </FadeInView>

        {q ? (
          <View style={s.section}>
            {suggestionRow(
              'go',
              <Ionicons name="search" size={18} color={t.colors.brandStrong} />,
              `Rechercher « ${searchQuery.trim()} »`,
              `Rechercher ${searchQuery.trim()}`,
              () => runSearch(searchQuery),
              <Ionicons name="arrow-forward" size={18} color={t.colors.inkSubtle} />,
            )}
            {suggestions.recent.map((r) =>
              suggestionRow(
                `r-${r}`,
                <Ionicons name="time-outline" size={18} color={t.colors.inkMuted} />,
                r,
                `Recherche récente : ${r}`,
                () => {
                  setSearchQuery(r);
                  runSearch(r);
                },
              ),
            )}
            {suggestions.server.map((title) =>
              suggestionRow(
                `s-${title}`,
                <Ionicons name="search-outline" size={18} color={t.colors.inkMuted} />,
                title,
                `Suggestion : ${title}`,
                () => {
                  setSearchQuery(title);
                  runSearch(title);
                },
              ),
            )}
            {suggestions.cats.map((c) =>
              suggestionRow(
                `c-${c.value}`,
                <CategoryTag value={c.value} iconOnly size={30} />,
                c.label,
                `Catégorie ${c.label}`,
                () => browseCategory(c.value),
                <AppText variant="caption" color="inkSubtle">
                  Catégorie
                </AppText>,
              ),
            )}
          </View>
        ) : (
          <>
            {recentItems.length > 0 && (
              <FadeInView index={1} style={s.section}>
                <View style={s.sectionHeader}>
                  <AppText variant="h3" accessibilityRole="header">
                    Recherches récentes
                  </AppText>
                  <Button label="Tout effacer" variant="ghost" size="sm" onPress={handleClearRecentSearches} />
                </View>
                <View style={s.wrap}>
                  {recentItems.map((item) => (
                    <Chip
                      key={item}
                      label={item}
                      icon="time-outline"
                      kind="action"
                      onPress={() => {
                        setSearchQuery(item);
                        runSearch(item);
                      }}
                    />
                  ))}
                </View>
              </FadeInView>
            )}

            <FadeInView index={2} style={s.section}>
              <AppText variant="h3" style={s.sectionTitle} accessibilityRole="header">
                Parcourir par catégorie
              </AppText>
              <View style={s.grid}>
                {CATEGORIES.map((c) => (
                  <PressableScale
                    key={c.value}
                    accessibilityRole="button"
                    accessibilityLabel={`Catégorie ${c.label}`}
                    haptic="selection"
                    onPress={() => browseCategory(c.value)}
                    style={s.catTile}>
                    <CategoryTag value={c.value} iconOnly size={36} />
                    <AppText variant="labelStrong" numberOfLines={1} style={s.flex}>
                      {c.label}
                    </AppText>
                  </PressableScale>
                ))}
              </View>
            </FadeInView>
          </>
        )}
        {nlSearch.isPending && (
          <View style={s.pending}>
            <ActivityIndicator color={t.colors.brandStrong} />
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

/** Field container grows in (scaleX + fade, 250 ms, emphasised ease). */
const growIn = () => {
  'worklet';
  const cfg = { duration: 250, easing: Easing.bezier(0.05, 0.7, 0.1, 1), reduceMotion: ReduceMotion.System };
  return {
    initialValues: { opacity: 0, transform: [{ scaleX: 0.92 }] },
    animations: { opacity: withTiming(1, cfg), transform: [{ scaleX: withTiming(1, cfg) }] },
  };
};

const makeStyles = createStyles((t) => ({
  container: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingRight: t.spacing.md,
    paddingVertical: t.spacing.xs,
    gap: 4,
  },
  inputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    minHeight: 48,
    paddingLeft: t.spacing.md,
    borderRadius: t.radius.full,
    borderWidth: 1.5,
    borderColor: t.colors.brandStrong,
    backgroundColor: t.colors.surface,
  },
  input: { flex: 1, color: t.colors.ink, paddingVertical: 10 },
  content: { padding: t.spacing.md, paddingBottom: t.spacing.xxl },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  aiIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.colors.surface,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  catTile: {
    flexGrow: 1,
    flexBasis: '45%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 56,
    paddingHorizontal: t.spacing.sm,
    borderRadius: t.radius.md,
    backgroundColor: t.colors.surface,
    ...(t.elevation.card as object),
  },
  aiButton: { alignSelf: 'flex-start', marginTop: 4 },
  section: { marginTop: t.spacing.xl },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: t.spacing.xs },
  sectionTitle: { marginBottom: t.spacing.sm },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.xs },
  suggestion: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 52,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
  },
  pending: { paddingTop: t.spacing.xl },
}));
