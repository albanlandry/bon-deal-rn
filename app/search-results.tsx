// app/search-results.tsx - Search Results Screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

import ProductCard from '../components/molecules/ProductCard';

// Filter types
type FilterType = 'category' | 'price' | 'location' | 'condition';
type SortType = 'relevance' | 'price_low' | 'price_high' | 'date_new' | 'date_old' | 'distance';

interface Filter {
    id: string;
    label: string;
    type: FilterType;
    active: boolean;
}

interface SortOption {
    id: SortType;
    label: string;
    active: boolean;
}

// Mock search results data
const mockSearchResults = [
    {
        id: '1',
        imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop&crop=center',
        title: 'Macbook Pro 2020 (256 GB)',
        location: 'Kinguele - 25 min',
        price: '350000 FCFA',
        likes: 12,
        views: 45,
        comments: 3,
        category: 'Electronics',
        condition: 'Used',
        seller: 'Jean Baptiste',
        postedDate: '2 jours',
        distance: '2.5 km',
    },
    {
        id: '2',
        imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&crop=center',
        title: 'Nike Air Max 270 - Taille 42',
        location: 'Libreville Centre - 15 min',
        price: '45000 FCFA',
        likes: 8,
        views: 23,
        comments: 1,
        category: 'Fashion',
        condition: 'New',
        seller: 'Marie Claire',
        postedDate: '1 jour',
        distance: '1.2 km',
    },
    {
        id: '3',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
        title: 'iPhone 12 Pro Max 128GB',
        location: 'Akebe - 30 min',
        price: '280000 FCFA',
        likes: 25,
        views: 89,
        comments: 7,
        category: 'Electronics',
        condition: 'Used',
        seller: 'Paul Mba',
        postedDate: '3 jours',
        distance: '3.8 km',
    },
    {
        id: '4',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
        title: 'Sac à dos Adidas Originals',
        location: 'Nkembo - 20 min',
        price: '25000 FCFA',
        likes: 6,
        views: 18,
        comments: 2,
        category: 'Fashion',
        condition: 'Used',
        seller: 'Sarah Nguema',
        postedDate: '5 jours',
        distance: '2.1 km',
    },
    {
        id: '5',
        imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
        title: 'Table en bois massif',
        location: 'Montagne Sainte - 45 min',
        price: '120000 FCFA',
        likes: 4,
        views: 12,
        comments: 0,
        category: 'Home',
        condition: 'Used',
        seller: 'Pierre Obiang',
        postedDate: '1 semaine',
        distance: '8.5 km',
    },
];

// Filter options
const filterOptions: Filter[] = [
    { id: 'all', label: 'Tout', type: 'category', active: true },
    { id: 'electronics', label: 'Électronique', type: 'category', active: false },
    { id: 'fashion', label: 'Mode', type: 'category', active: false },
    { id: 'home', label: 'Maison', type: 'category', active: false },
    { id: 'transport', label: 'Transport', type: 'category', active: false },
    { id: 'under_50k', label: '< 50k FCFA', type: 'price', active: false },
    { id: '50k_100k', label: '50k - 100k', type: 'price', active: false },
    { id: 'over_100k', label: '> 100k FCFA', type: 'price', active: false },
    { id: 'new', label: 'Neuf', type: 'condition', active: false },
    { id: 'used', label: 'Occasion', type: 'condition', active: false },
];

// Sort options
const defaultSortOptions: SortOption[] = [
    { id: 'relevance', label: 'Pertinence', active: true },
    { id: 'price_low', label: 'Prix croissant', active: false },
    { id: 'price_high', label: 'Prix décroissant', active: false },
    { id: 'date_new', label: 'Plus récent', active: false },
    { id: 'date_old', label: 'Plus ancien', active: false },
    { id: 'distance', label: 'Plus proche', active: false },
];

export default function SearchResultsScreen() {
    const router = useRouter();
    const { query } = useLocalSearchParams<{ query: string }>();
    const [searchResults, setSearchResults] = useState(mockSearchResults);
    const [filters, setFilters] = useState(filterOptions);
    const [sortOptions, setSortOptions] = useState(defaultSortOptions);
    const [activeSort, setActiveSort] = useState<SortType>('relevance');
    const [showSortModal, setShowSortModal] = useState(false);

    // Handle filter selection
    const handleFilterPress = (filterId: string) => {
        setFilters(prev => 
            prev.map(filter => ({
                ...filter,
                active: filter.id === filterId
            }))
        );
        
        // Apply filter logic here
        console.log('Filter applied:', filterId);
    };

    // Handle sort selection
    const handleSortPress = (sortId: SortType) => {
        setSortOptions(prev => 
            prev.map(option => ({
                ...option,
                active: option.id === sortId
            }))
        );
        setActiveSort(sortId);
        setShowSortModal(false);
        
        // Apply sort logic here
        console.log('Sort applied:', sortId);
    };

    // Render filter item
    const renderFilterItem = ({ item }: { item: Filter }) => (
        <TouchableOpacity
            style={[
                styles.filterItem,
                item.active && styles.filterItemActive
            ]}
            onPress={() => handleFilterPress(item.id)}
        >
            <Text
                style={[
                    styles.filterText,
                    item.active && styles.filterTextActive
                ]}
            >
                {item.label}
            </Text>
        </TouchableOpacity>
    );

    // Render sort option
    const renderSortOption = ({ item }: { item: SortOption }) => (
        <TouchableOpacity
            style={styles.sortOption}
            onPress={() => handleSortPress(item.id)}
        >
            <Text
                style={[
                    styles.sortOptionText,
                    item.active && styles.sortOptionActive
                ]}
            >
                {item.label}
            </Text>
            {item.active && (
                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
            )}
        </TouchableOpacity>
    );

    // Render product item
    const renderProductItem = ({ item }: { item: any }) => (
        <ProductCard {...item} onPress={() => router.push('/item-details')} />
    );

    // Get active sort label
    const getActiveSortLabel = () => {
        const activeOption = sortOptions.find(option => option.active);
        return activeOption?.label || 'Pertinence';
    };

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
                    <Text style={styles.searchQuery}>"{query || 'Recherche'}"</Text>
                </View>
                <TouchableOpacity style={styles.filterButton}>
                    <Ionicons name="options-outline" size={24} color={theme.colors.gray} />
                </TouchableOpacity>
            </View>

            {/* Results Count */}
            <View style={styles.resultsCount}>
                <Text style={styles.resultsCountText}>
                    {searchResults.length} résultat{searchResults.length > 1 ? 's' : ''} trouvé{searchResults.length > 1 ? 's' : ''}
                </Text>
            </View>

            {/* Filters Row */}
            <View style={styles.filtersContainer}>
                <FlatList
                    data={filters}
                    renderItem={renderFilterItem}
                    keyExtractor={(item) => item.id}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filtersList}
                />
            </View>

            {/* Sort Row */}
            <View style={styles.sortContainer}>
                <Text style={styles.sortLabel}>Trier par:</Text>
                <TouchableOpacity 
                    style={styles.sortButton}
                    onPress={() => setShowSortModal(true)}
                >
                    <Text style={styles.sortButtonText}>{getActiveSortLabel()}</Text>
                    <Ionicons name="chevron-down" size={16} color={theme.colors.gray} />
                </TouchableOpacity>
            </View>

            {/* Search Results */}
            <FlatList
                data={searchResults}
                renderItem={renderProductItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.resultsList}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
                ListEmptyComponent={
                    <View style={styles.emptyContainer}>
                        <Ionicons name="search-outline" size={64} color={theme.colors.gray} />
                        <Text style={styles.emptyTitle}>Aucun résultat</Text>
                        <Text style={styles.emptyMessage}>
                            Essayez de modifier vos critères de recherche ou vos filtres.
                        </Text>
                    </View>
                }
            />

            {/* Sort Modal */}
            {showSortModal && (
                <View style={styles.sortModalOverlay}>
                    <TouchableOpacity 
                        style={styles.sortModalBackdrop}
                        onPress={() => setShowSortModal(false)}
                    />
                    <View style={styles.sortModal}>
                        <View style={styles.sortModalHeader}>
                            <Text style={styles.sortModalTitle}>Trier par</Text>
                            <TouchableOpacity onPress={() => setShowSortModal(false)}>
                                <Ionicons name="close" size={24} color={theme.colors.gray} />
                            </TouchableOpacity>
                        </View>
                        <FlatList
                            data={sortOptions}
                            renderItem={renderSortOption}
                            keyExtractor={(item) => item.id}
                            style={styles.sortOptionsList}
                        />
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
    sortContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    sortLabel: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    sortButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 8,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: 8,
    },
    sortButtonText: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
        marginRight: theme.spacing.sm,
    },
    resultsList: {
        paddingTop: theme.spacing.md,
        paddingBottom: theme.spacing.xl,
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
        paddingVertical: theme.spacing.xxl,
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
    // Sort Modal styles
    sortModalOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1000,
    },
    sortModalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    sortModal: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: theme.colors.white,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        maxHeight: '50%',
    },
    sortModalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: theme.spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    sortModalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
    },
    sortOptionsList: {
        maxHeight: 300,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    sortOptionText: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    sortOptionActive: {
        color: theme.colors.primary,
        fontWeight: '600',
    },
});
