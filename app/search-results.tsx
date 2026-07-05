// app/search-results.tsx - Search Results Screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useInfiniteQuery } from '@tanstack/react-query';
import { theme } from '../utils/theme';

import ProductCard from '../components/molecules/ProductCard';
import { postsInfiniteQuery, type PostSort } from '@/lib/api/posts';
import { toCardProps } from '@/lib/mapPost';
import { CATEGORIES } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';

type PriceBucket = 'under50' | '50to100' | 'over100';
type ConditionMode = 'all' | 'like_new' | 'used';

const PRICE_BUCKETS: { id: PriceBucket; label: string }[] = [
    { id: 'under50', label: '< 50 000 FCFA' },
    { id: '50to100', label: '50 000 – 100 000' },
    { id: 'over100', label: '> 100 000 FCFA' },
];

const CONDITION_MODES: { id: ConditionMode; label: string }[] = [
    { id: 'all', label: 'Tous états' },
    { id: 'like_new', label: 'Comme neuf' },
    { id: 'used', label: 'Occasion' },
];

const SORT_OPTIONS: { id: PostSort; label: string }[] = [
    { id: 'date_new', label: 'Pertinence' },
    { id: 'price_low', label: 'Prix croissant' },
    { id: 'price_high', label: 'Prix décroissant' },
    { id: 'date_old', label: 'Plus ancien' },
];

// "Tout" + the 10 catalog buckets, for the top filter row.
const CATEGORY_CHIPS: { id: string | null; label: string }[] = [
    { id: null, label: 'Tout' },
    ...CATEGORIES.map((c) => ({ id: c.value, label: c.label })),
];

// Which bucket a raw min/max range best corresponds to (for chip highlighting).
function bucketFromRange(min?: number, max?: number): PriceBucket | null {
    if (max != null && max <= 50000 && (min == null || min <= 0)) return 'under50';
    if (min != null && min >= 100000 && max == null) return 'over100';
    if (min === 50000 && max === 100000) return '50to100';
    return null;
}

// Bucket → raw {min, max}.
const BUCKET_RANGE: Record<PriceBucket, { min?: number; max?: number }> = {
    under50: { max: 50000 },
    '50to100': { min: 50000, max: 100000 },
    over100: { min: 100000 },
};

function modeFromConds(conds: string[]): ConditionMode {
    if (conds.length > 0 && conds.every((c) => c === 'excellent')) return 'like_new';
    if (conds.some((c) => ['good', 'fair', 'poor'].includes(c))) return 'used';
    return 'all';
}

export default function SearchResultsScreen() {
    const router = useRouter();
    const params = useLocalSearchParams<{
        query?: string;
        category?: string;
        categories?: string;
        minPrice?: string;
        maxPrice?: string;
        condition?: string;
        sort?: string;
    }>();
    const query = params.query ?? '';

    const initCategory = params.category ?? params.categories?.split(',')[0] ?? null;
    const initMin = params.minPrice ? Number(params.minPrice) : undefined;
    const initMax = params.maxPrice ? Number(params.maxPrice) : undefined;
    const initMode = modeFromConds(params.condition ? params.condition.split(',') : []);
    const initSort = SORT_OPTIONS.some((o) => o.id === params.sort)
        ? (params.sort as PostSort)
        : 'date_new';

    const [category, setCategory] = useState<string | null>(initCategory);
    const [minPrice, setMinPrice] = useState<number | undefined>(initMin);
    const [maxPrice, setMaxPrice] = useState<number | undefined>(initMax);
    const [conditionMode, setConditionMode] = useState<ConditionMode>(initMode);
    const [sort, setSort] = useState<PostSort>(initSort);
    const [showDrawer, setShowDrawer] = useState(false);

    const activeBucket = bucketFromRange(minPrice, maxPrice);
    const condition =
        conditionMode === 'like_new'
            ? ['excellent']
            : conditionMode === 'used'
              ? ['good', 'fair', 'poor']
              : undefined;

    const setBucket = (bucket: PriceBucket) => {
        if (activeBucket === bucket) {
            setMinPrice(undefined);
            setMaxPrice(undefined);
        } else {
            setMinPrice(BUCKET_RANGE[bucket].min);
            setMaxPrice(BUCKET_RANGE[bucket].max);
        }
    };

    const feed = useInfiniteQuery(
        postsInfiniteQuery({
            search: query || undefined,
            categories: category ? [category] : undefined,
            minPrice,
            maxPrice,
            condition,
            sort,
        }),
    );
    const results = feed.data?.pages.flatMap((p) => p.posts) ?? [];
    const total = feed.data?.pages[0]?.total_posts ?? 0;

    const resetFilters = () => {
        setCategory(null);
        setMinPrice(undefined);
        setMaxPrice(undefined);
        setConditionMode('all');
        setSort('date_new');
    };

    const renderCategoryChip = ({ item }: { item: (typeof CATEGORY_CHIPS)[0] }) => {
        const active = category === item.id;
        return (
            <TouchableOpacity
                style={[styles.filterItem, active && styles.filterItemActive]}
                onPress={() => setCategory(item.id)}
            >
                <Text style={[styles.filterText, active && styles.filterTextActive]}>{item.label}</Text>
            </TouchableOpacity>
        );
    };

    const renderProductItem = ({ item }: { item: BdPost }) => {
        const card = toCardProps(item);
        return (
            <ProductCard
                {...card}
                onPress={() =>
                    router.push({ pathname: '/item-details', params: { id: String(item.id) } })
                }
            />
        );
    };

    const showError = feed.isError && results.length === 0 && !feed.isLoading;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.gray} />
                </TouchableOpacity>
                <View style={styles.headerContent}>
                    <Text style={styles.headerTitle}>Résultats de recherche</Text>
                    <Text style={styles.searchQuery}>
                        {query ? `« ${query} »` : 'Parcourir les annonces'}
                    </Text>
                </View>
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowDrawer(true)}>
                    <Ionicons name="options-outline" size={24} color={theme.colors.gray} />
                </TouchableOpacity>
            </View>

            {/* Results Count */}
            <View style={styles.resultsCount}>
                <Text style={styles.resultsCountText}>
                    {feed.isLoading
                        ? 'Recherche…'
                        : `${total} résultat${total > 1 ? 's' : ''}`}
                </Text>
            </View>

            {/* Category chips */}
            <View style={styles.filtersContainer}>
                <FlatList
                    data={CATEGORY_CHIPS}
                    renderItem={renderCategoryChip}
                    keyExtractor={(item) => item.id ?? 'all'}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersList}
                />
            </View>

            {/* Search Results */}
            {feed.isLoading ? (
                <View style={styles.emptyContainer}>
                    <ActivityIndicator color={theme.colors.primary} />
                </View>
            ) : showError ? (
                <View style={styles.emptyContainer}>
                    <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
                    <Text style={styles.emptyTitle}>Erreur de recherche</Text>
                    <TouchableOpacity style={styles.resetButton} onPress={() => feed.refetch()}>
                        <Text style={styles.resetButtonText}>Réessayer</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <FlatList
                    data={results}
                    renderItem={renderProductItem}
                    keyExtractor={(item) => String(item.id)}
                    contentContainerStyle={[
                        styles.resultsList,
                        results.length === 0 && styles.emptyListContainer,
                    ]}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                    onEndReached={() => {
                        if (feed.hasNextPage && !feed.isFetchingNextPage) feed.fetchNextPage();
                    }}
                    onEndReachedThreshold={0.5}
                    ListFooterComponent={
                        feed.isFetchingNextPage ? (
                            <ActivityIndicator style={styles.footerSpinner} color={theme.colors.primary} />
                        ) : null
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Ionicons name="search-outline" size={64} color={theme.colors.gray} />
                            <Text style={styles.emptyTitle}>Aucun résultat</Text>
                            <Text style={styles.emptyMessage}>
                                {query
                                    ? `Aucune annonce pour « ${query} ».`
                                    : 'Aucune annonce ne correspond à ces filtres.'}
                            </Text>
                            <TouchableOpacity style={styles.resetButton} onPress={resetFilters}>
                                <Text style={styles.resetButtonText}>Réinitialiser les filtres</Text>
                            </TouchableOpacity>
                        </View>
                    }
                />
            )}

            {/* Right Drawer Menu */}
            {showDrawer && (
                <View style={styles.drawerOverlay}>
                    <TouchableOpacity
                        style={styles.drawerBackdrop}
                        onPress={() => setShowDrawer(false)}
                    />
                    <View style={styles.drawer}>
                        {/* Drawer Header */}
                        <View style={styles.drawerHeader}>
                            <Text style={styles.drawerTitle}>Filtres & Tri</Text>
                            <TouchableOpacity onPress={() => setShowDrawer(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.gray} />
                            </TouchableOpacity>
                        </View>

                        <ScrollView
                            style={styles.drawerContent}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {/* Sort */}
                            <View style={styles.drawerSection}>
                                <Text style={styles.drawerSectionTitle}>Trier par</Text>
                                <View style={styles.drawerOptions}>
                                    {SORT_OPTIONS.map((option) => (
                                        <TouchableOpacity
                                            key={option.id}
                                            style={styles.drawerOption}
                                            onPress={() => setSort(option.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.drawerOptionText,
                                                    sort === option.id && styles.drawerOptionActive,
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            {sort === option.id && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Price */}
                            <View style={styles.drawerSection}>
                                <Text style={styles.drawerSectionTitle}>Prix</Text>
                                <View style={styles.drawerOptions}>
                                    {PRICE_BUCKETS.map((bucket) => (
                                        <TouchableOpacity
                                            key={bucket.id}
                                            style={styles.drawerOption}
                                            onPress={() => setBucket(bucket.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.drawerOptionText,
                                                    activeBucket === bucket.id && styles.drawerOptionActive,
                                                ]}
                                            >
                                                {bucket.label}
                                            </Text>
                                            {activeBucket === bucket.id && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Condition */}
                            <View style={styles.drawerSection}>
                                <Text style={styles.drawerSectionTitle}>État</Text>
                                <View style={styles.drawerOptions}>
                                    {CONDITION_MODES.map((mode) => (
                                        <TouchableOpacity
                                            key={mode.id}
                                            style={styles.drawerOption}
                                            onPress={() => setConditionMode(mode.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.drawerOptionText,
                                                    conditionMode === mode.id && styles.drawerOptionActive,
                                                ]}
                                            >
                                                {mode.label}
                                            </Text>
                                            {conditionMode === mode.id && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Drawer Actions */}
                        <View style={styles.drawerActions}>
                            <TouchableOpacity style={styles.drawerActionButton} onPress={resetFilters}>
                                <Text style={styles.drawerActionText}>Réinitialiser</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.drawerActionButton, styles.drawerActionPrimary]}
                                onPress={() => setShowDrawer(false)}
                            >
                                <Text style={styles.drawerActionPrimaryText}>Appliquer</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            )}
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    backButton: {
        padding: theme.spacing.sm,
        marginRight: theme.spacing.sm,
    },
    headerContent: {
        flex: 1,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 2,
    },
    searchQuery: {
        fontSize: 14,
        color: theme.colors.gray,
    },
    filterButton: {
        padding: theme.spacing.sm,
    },
    resultsCount: {
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.sm,
        backgroundColor: '#F8F9FA',
    },
    resultsCountText: {
        fontSize: 14,
        color: theme.colors.gray,
        fontWeight: '500',
    },
    filtersContainer: {
        backgroundColor: theme.colors.white,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    filtersList: {
        paddingHorizontal: theme.spacing.lg,
    },
    filterItem: {
        backgroundColor: '#F8F9FA',
        borderRadius: 20,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
        marginRight: theme.spacing.sm,
        borderWidth: 1,
        borderColor: 'transparent',
    },
    filterItemActive: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    filterText: {
        fontSize: 14,
        color: theme.colors.gray,
        fontWeight: '500',
    },
    filterTextActive: {
        color: theme.colors.white,
    },
    // Right Drawer styles
    drawerOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    drawerBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    drawer: {
        position: 'absolute',
        top: 0,
        right: 0,
        bottom: 0,
        width: '80%',
        backgroundColor: theme.colors.white,
        shadowColor: '#000',
        shadowOffset: { width: -2, height: 0 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
        flex: 1,
    },
    drawerHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
        backgroundColor: '#F8F9FA',
    },
    drawerContent: {
        flex: 1,
    },
    drawerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    drawerSection: {
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    drawerSectionTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: theme.spacing.md,
    },
    drawerOptions: {
        gap: theme.spacing.sm,
    },
    drawerOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: theme.spacing.md,
        paddingHorizontal: theme.spacing.sm,
        borderRadius: 8,
        backgroundColor: '#F8F9FA',
    },
    drawerOptionText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    drawerOptionActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
    drawerActions: {
        flexDirection: 'row',
        padding: theme.spacing.lg,
        gap: theme.spacing.md,
        borderTopWidth: 1,
        borderTopColor: theme.colors.grayLight,
        backgroundColor: '#F8F9FA',
    },
    drawerActionButton: {
        flex: 1,
        paddingVertical: theme.spacing.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: theme.colors.grayLight,
        alignItems: 'center',
    },
    drawerActionPrimary: {
        backgroundColor: theme.colors.primary,
        borderColor: theme.colors.primary,
    },
    drawerActionText: {
        fontSize: 16,
        color: theme.colors.gray,
        fontWeight: '600',
    },
    drawerActionPrimaryText: {
        fontSize: 16,
        color: theme.colors.white,
        fontWeight: '600',
    },
    resultsList: {
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
    },
    emptyListContainer: {
        flexGrow: 1,
        justifyContent: 'center',
    },
    footerSpinner: {
        paddingVertical: theme.spacing.lg,
    },
    resetButton: {
        marginTop: theme.spacing.lg,
        backgroundColor: theme.colors.primary,
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.md,
        borderRadius: 24,
    },
    resetButtonText: {
        color: theme.colors.white,
        fontWeight: '700',
        fontSize: 15,
    },
    itemSeparator: {
        height: 1,
        backgroundColor: theme.colors.grayLight,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.xl,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginTop: theme.spacing.md,
        marginBottom: theme.spacing.sm,
    },
    emptyMessage: {
        fontSize: 14,
        color: theme.colors.gray,
        textAlign: 'center',
        lineHeight: 20,
    },
});
