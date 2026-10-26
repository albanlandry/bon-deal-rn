/**
 * Recherche (docs/12 "Rechercher", direction B, tight corners): large title,
 * the field (brand border while focused), recent searches as chips, the
 * full-colour "Trouve-moi ça" card, "Tendances à <ville>" (real searches,
 * GET /search/trending; hidden when empty or failing), then a 4×2 grid of
 * category tiles, so the screen is never empty. While typing: instant
 * suggestions (recent, server titles, categories).
 *
 * Rendered by the Rechercher tab (`mode="tab"`: large title, no back button,
 * focuses the field when `focusKey` changes) and by the `/search` stack
 * screen (`mode="stack"`: back button, field grows in and autofocuses).
 * Results stay on `/search-results`.
 */
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useMutation, useQuery } from '@tanstack/react-query';
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import Animated, { Easing, ReduceMotion, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import Chip from '@/components/atoms/Chip';
import IconButton from '@/components/atoms/IconButton';
import { showToast } from '@/components/atoms/Toast';
import { layoutEase } from '@/components/motion/anim';
import { useTabBarInset } from '@/components/motion/AnimatedTabBar';
import FadeInView from '@/components/motion/FadeInView';
import PressableScale from '@/components/motion/PressableScale';
import { useScrollChrome } from '@/components/motion/ScrollChrome';
import GradientView from '@/components/molecules/GradientView';
import { LARGE_TITLE } from '@/components/molecules/ScreenHeader';
import CategorySheet from '@/components/molecules/CategorySheet';
import CategoryTag from '@/components/molecules/CategoryTag';
import HighlightText from '@/components/molecules/HighlightText';
import { CATEGORIES, categoryIcon, categoryLabel, TOP_CATEGORIES } from '@/constants/catalog';
import type { BdParsedSearch } from '@/constants/types';
import { ApiError } from '@/lib/api';
import { parseSearch } from '@/lib/api/ai';
import { searchSuggestQuery } from '@/lib/api/posts';
import { useTrendingSearches } from '@/lib/api/trending';
import { useAuth } from '@/contexts/AuthContext';
import { categoryColors, createStyles, font, lightColors, useStyles, useTheme } from '@/theme';

/** The AI card keeps light-scheme brand → trust in both schemes: white text
 *  on it stays AA (6.7:1 and 5.5:1). */
const AI_FROM = lightColors.brand;
const AI_TO = lightColors.trust;

// AsyncStorage key for recent searches (unchanged).
const RECENT_SEARCHES_KEY = '@bondeal_recent_searches';

/** 7 tiles + "Tout voir" = 4×2. The 6 Home categories, then Sports. */
const TILE_CATEGORIES = [...TOP_CATEGORIES, 'sports'].slice(0, 7);

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

const normalize = (s: string) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

/** Category tile: the category's fixed icon and hue on its tint, label below. */
function CategoryGridTile({ value, onPress }: { value: string | null; onPress: () => void }) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const all = value === null;
  const c = categoryColors(t.colors, all ? 'all' : value);
  const label = all ? 'Tout voir' : categoryLabel(value);
  return (
    <PressableScale
      accessibilityRole="button"
      accessibilityLabel={all ? 'Voir toutes les catégories' : `Catégorie ${label}`}
      haptic="selection"
      onPress={onPress}
      style={s.tile}>
      <View style={[s.tileIcon, { backgroundColor: c.tint }]}>
        <Ionicons name={(all ? 'grid' : categoryIcon(value)) as any} size={24} color={c.hue} />
      </View>
      <AppText variant="captionStrong" align="center" numberOfLines={2}>
        {label}
      </AppText>
    </PressableScale>
  );
}

export interface SearchPanelProps {
  mode: 'tab' | 'stack';
  /** Tab mode: focus the field each time this value changes (Home pill). */
  focusKey?: string;
  /** Opened from Home's "IA" button: the field asks for a need and submits to Trouve-moi ça. */
  aiMode?: boolean;
}

export default function SearchPanel({ mode, focusKey, aiMode = false }: SearchPanelProps) {
  const t = useTheme();
  const s = useStyles(makeStyles);
  const router = useRouter();
  const isTab = mode === 'tab';
  const tabInset = useTabBarInset();
  const chrome = useScrollChrome({ drivesTabBar: isTab });
  const inputRef = useRef<TextInput>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const [showCategories, setShowCategories] = useState(false);
  const [focused, setFocused] = useState(false);
  // AI prompt mode: set by Home's "IA" button or the card's "Essayer".
  const [askAi, setAskAi] = useState(aiMode);
  const { user } = useAuth();
  const trending = useTrendingSearches(user?.city);
  const trends = trending.data ?? [];

  // Reload on focus: the tab stays mounted while /search adds recents.
  useFocusEffect(
    useCallback(() => {
      let alive = true;
      loadRecentSearches().then((r) => alive && setRecentItems(r));
      return () => {
        alive = false;
      };
    }, []),
  );

  // Home's search pill opens this tab with a fresh `focus` param.
  useEffect(() => {
    if (!isTab || !focusKey) return;
    setAskAi(aiMode);
    const id = setTimeout(() => inputRef.current?.focus(), 50);
    return () => clearTimeout(id);
  }, [isTab, focusKey, aiMode]);

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
      setAskAi(true);
      inputRef.current?.focus();
      return;
    }
    nlSearch.mutate(utter);
  };

  const browseCategory = (value: string | null) => {
    router.push({ pathname: '/search-results', params: value ? { category: value } : {} });
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

  // Trouve-moi ça — turns a vague need into a short ranked list (choice
  // overload). Full colour (docs/12) with a white "Essayer" button.
  const aiCard = (
    <View style={s.aiCard}>
      <GradientView colors={[AI_FROM, AI_TO]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} fallback={AI_FROM} />
      <View style={s.aiHeader}>
        <Ionicons name="sparkles" size={18} color="#FFFFFF" />
        <AppText style={s.aiTitle}>Trouve-moi ça</AppText>
      </View>
      <AppText variant="small" style={s.aiText} numberOfLines={2}>
        {looksLikeSentence
          ? 'L’IA transforme votre phrase en filtres (catégorie, prix, état).'
          : 'Décrivez votre besoin, l’IA cherche pour vous.'}
      </AppText>
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={searchQuery.trim() ? 'Chercher avec l’IA' : 'Essayer Trouve-moi ça'}
        accessibilityState={{ busy: nlSearch.isPending }}
        disabled={nlSearch.isPending}
        onPress={handleNlSearch}
        style={s.aiButton}>
        {nlSearch.isPending ? (
          <ActivityIndicator size="small" color={AI_FROM} />
        ) : (
          <AppText style={s.aiButtonText}>{searchQuery.trim() ? 'Chercher avec l’IA' : 'Essayer'}</AppText>
        )}
      </PressableScale>
    </View>
  );

  // Server suggestions still on their way (debounce or request in flight).
  const typed = searchQuery.trim();
  const suggestPending = typed.length >= 2 && (debounced !== typed || serverSuggest.isFetching);
  const noSuggestion =
    typed.length >= 2 &&
    !suggestPending &&
    suggestions.recent.length === 0 &&
    suggestions.server.length === 0 &&
    suggestions.cats.length === 0;

  const field = (
    // flex: 1 sizes it inside the back-button row; in the tab's column
    // header it would collapse to 0 and overflow, so it's auto there.
    <View style={[s.inputWrap, isTab && s.inputWrapColumn, focused && s.inputFocused]}>
      <Ionicons name="search" size={20} color={t.colors.inkMuted} />
      <TextInput
        ref={inputRef}
        style={[t.type.body, s.input]}
        placeholder={askAi ? 'Décrivez votre besoin, ex : un frigo pas cher' : 'Un objet, une marque…'}
        placeholderTextColor={t.colors.inkSubtle}
        selectionColor={t.colors.brandStrong}
        value={searchQuery}
        onChangeText={setSearchQuery}
        onSubmitEditing={() => (askAi && searchQuery.trim() ? handleNlSearch() : runSearch(searchQuery))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        autoFocus={!isTab}
        returnKeyType="search"
        accessibilityLabel={askAi ? 'Décrire votre besoin pour Trouve-moi ça' : 'Rechercher'}
        maxFontSizeMultiplier={1.3}
      />
      {!!searchQuery && (
        <IconButton icon="close-circle" label="Effacer" color="inkSubtle" size={20} onPress={() => setSearchQuery('')} />
      )}
    </View>
  );

  return (
    <SafeAreaView style={s.container} edges={isTab ? ['top'] : undefined}>
      {isTab ? (
        <View style={s.tabHeader}>
          <AppText style={[LARGE_TITLE, { color: t.colors.ink }]} maxFontSizeMultiplier={1.3} accessibilityRole="header">
            Rechercher
          </AppText>
          {field}
        </View>
      ) : (
        // Search bar — grows in from the Home pill (container transform).
        <Animated.View entering={growIn} style={s.searchRow}>
          <IconButton icon="arrow-back" label="Retour" onPress={() => router.back()} />
          {field}
        </Animated.View>
      )}

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[s.content, isTab && { paddingTop: t.spacing.xs, paddingBottom: tabInset + t.spacing.md }]}
        onScroll={isTab ? chrome.onScroll : undefined}
        scrollEventThrottle={chrome.scrollEventThrottle}>
        {q ? (
          <View>
            {looksLikeSentence && aiCard}
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
            {suggestPending ? (
              <View style={s.suggestState} accessibilityLiveRegion="polite">
                <ActivityIndicator size="small" color={t.colors.inkSubtle} />
                <AppText variant="small" color="inkMuted">
                  Recherche de suggestions…
                </AppText>
              </View>
            ) : noSuggestion ? (
              <View style={s.suggestState} accessibilityLiveRegion="polite">
                <Ionicons name="information-circle-outline" size={18} color={t.colors.inkSubtle} />
                <AppText variant="small" color="inkMuted">
                  Aucune suggestion. Lancez la recherche pour voir toutes les annonces.
                </AppText>
              </View>
            ) : null}
            {!looksLikeSentence && aiCard}
          </View>
        ) : (
          <>
            {recentItems.length > 0 && (
              <FadeInView index={0}>
                <View style={s.sectionHeader}>
                  <AppText variant="labelStrong" color="inkMuted" accessibilityRole="header">
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

            <FadeInView index={1}>{aiCard}</FadeInView>

            {trends.length > 0 && !!user?.city && (
              <FadeInView index={2} style={s.section}>
                <AppText style={[s.h2, s.sectionTitle]} accessibilityRole="header">
                  Tendances à {user.city}
                </AppText>
                {trends.map((item, i) => (
                  <PressableScale
                    key={item.query}
                    accessibilityRole="button"
                    accessibilityLabel={`Tendance numéro ${i + 1} : ${item.query}. Rechercher`}
                    onPress={() => {
                      setSearchQuery(item.query);
                      runSearch(item.query);
                    }}
                    style={[s.trendRow, i === trends.length - 1 && s.trendLast]}>
                    <AppText style={[s.trendRank, { color: t.colors.brand }]}>{i + 1}</AppText>
                    <AppText variant="labelStrong" numberOfLines={1} style={s.flex}>
                      {item.query}
                    </AppText>
                    <Ionicons name="trending-up" size={18} color={t.colors.trust} />
                  </PressableScale>
                ))}
              </FadeInView>
            )}

            <FadeInView index={3} style={s.section}>
              <AppText style={[s.h2, s.sectionTitle]} accessibilityRole="header">
                Parcourir
              </AppText>
              <View style={s.grid}>
                {TILE_CATEGORIES.map((value) => (
                  <CategoryGridTile key={value} value={value} onPress={() => browseCategory(value)} />
                ))}
                <CategoryGridTile value={null} onPress={() => setShowCategories(true)} />
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

      <CategorySheet
        visible={showCategories}
        onClose={() => setShowCategories(false)}
        selected={null}
        onSelect={(v) => {
          setShowCategories(false);
          browseCategory(v);
        }}
      />
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
  tabHeader: { paddingHorizontal: t.spacing.md, paddingTop: t.spacing.xs, paddingBottom: t.spacing.xs, gap: t.spacing.sm },
  inputFocused: { borderWidth: 2, borderColor: t.colors.brand, paddingLeft: t.spacing.md - 1 },
  h2: { ...font('700'), fontSize: 18, lineHeight: 23, letterSpacing: -0.2, color: t.colors.ink },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    minHeight: 48,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
  },
  trendLast: { borderBottomWidth: 0 },
  trendRank: { ...font('700'), fontSize: 20, lineHeight: 25, width: 24, fontVariant: ['tabular-nums'] },
  aiTitle: { ...font('700'), fontSize: 16, lineHeight: 21, color: '#FFFFFF' },
  aiText: { color: '#FFFFFF', opacity: 0.92, marginTop: 4 },
  aiButtonText: { ...font('700'), fontSize: 14, lineHeight: 19, color: AI_FROM },
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
    minHeight: 52,
    paddingLeft: t.spacing.md,
    borderRadius: t.radius.md,
    borderWidth: 1,
    borderColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
  inputWrapColumn: { flex: 0 },
  input: { flex: 1, color: t.colors.ink, paddingVertical: t.spacing.sm },
  content: { padding: t.spacing.md, paddingBottom: t.spacing.xxl },
  aiHeader: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  grid: { flexDirection: 'row', flexWrap: 'wrap', rowGap: t.spacing.sm },
  tile: { width: '25%', alignItems: 'center', gap: 6, paddingHorizontal: 2, minHeight: 88 },
  tileIcon: { width: 56, height: 56, borderRadius: t.radius.md, alignItems: 'center', justifyContent: 'center' },
  aiCard: {
    marginTop: t.spacing.md,
    padding: t.spacing.md,
    borderRadius: t.radius.lg,
    overflow: 'hidden',
    backgroundColor: AI_FROM,
  },
  aiButton: {
    alignSelf: 'flex-start',
    minWidth: 96,
    height: 40,
    marginTop: t.spacing.sm,
    paddingHorizontal: t.spacing.md,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  suggestState: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, minHeight: 48, paddingHorizontal: 4 },
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
