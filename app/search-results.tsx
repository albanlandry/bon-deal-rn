// app/search-results.tsx - Search Results Screen
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    ScrollView,
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
    const [showDrawer, setShowDrawer] = useState(false);

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
                <TouchableOpacity style={styles.filterButton} onPress={() => setShowDrawer(true)}>
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

                        {/* Scrollable Content */}
                        <ScrollView 
                            style={styles.drawerContent}
                            showsVerticalScrollIndicator={false}
                            bounces={false}
                        >
                            {/* Sort Section */}
                            <View style={styles.drawerSection}>
                                <Text style={styles.drawerSectionTitle}>Trier par</Text>
                                <View style={styles.drawerOptions}>
                                    {sortOptions.map((option) => (
                                        <TouchableOpacity
                                            key={option.id}
                                            style={styles.drawerOption}
                                            onPress={() => handleSortPress(option.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.drawerOptionText,
                                                    option.active && styles.drawerOptionActive
                                                ]}
                                            >
                                                {option.label}
                                            </Text>
                                            {option.active && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Advanced Filters Section */}
                            <View style={styles.drawerSection}>
                                <Text style={styles.drawerSectionTitle}>Filtres avancés</Text>
                                <View style={styles.drawerOptions}>
                                    {filters.map((filter) => (
                                        <TouchableOpacity
                                            key={filter.id}
                                            style={styles.drawerOption}
                                            onPress={() => handleFilterPress(filter.id)}
                                        >
                                            <Text
                                                style={[
                                                    styles.drawerOptionText,
                                                    filter.active && styles.drawerOptionActive
                                                ]}
                                            >
                                                {filter.label}
                                            </Text>
                                            {filter.active && (
                                                <Ionicons name="checkmark" size={20} color={theme.colors.primary} />
                                            )}
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>
                        </ScrollView>

                        {/* Drawer Actions */}
                        <View style={styles.drawerActions}>
                            <TouchableOpacity 
                                style={styles.drawerActionButton}
                                onPress={() => {
                                    // Reset all filters
                                    setFilters(filterOptions);
                                    setSortOptions(defaultSortOptions);
                                    setActiveSort('relevance');
                                }}
                            >
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
