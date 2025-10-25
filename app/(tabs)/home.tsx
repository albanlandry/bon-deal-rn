// app/(tabs)/home.tsx - Main screen with product list
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useState } from 'react';
import {
    FlatList,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../utils/theme';

import ProductCard from '../../components/molecules/ProductCard';

// Enhanced mock data with diverse products
const mockData = [
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
  },
  {
    id: '6',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    title: 'Vélo électrique Xiaomi',
    location: 'Quartier Louis - 35 min',
    price: '180000 FCFA',
    likes: 15,
    views: 67,
    comments: 4,
    category: 'Transport',
    condition: 'Used',
    seller: 'David Mve',
    postedDate: '4 jours',
  },
  {
    id: '7',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    title: 'Livre scolaire - Mathématiques Terminale',
    location: 'Centre-ville - 10 min',
    price: '8000 FCFA',
    likes: 2,
    views: 8,
    comments: 1,
    category: 'Education',
    condition: 'Used',
    seller: 'Fatou Diallo',
    postedDate: '2 semaines',
  },
  {
    id: '8',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    title: 'Réfrigérateur Samsung 200L',
    location: 'Nzeng Ayong - 40 min',
    price: '220000 FCFA',
    likes: 9,
    views: 34,
    comments: 2,
    category: 'Home',
    condition: 'Used',
    seller: 'Marc Ondo',
    postedDate: '6 jours',
  },
];

// Category filters
const categories = [
  { id: 'all', name: 'Tout', icon: 'grid-outline' },
  { id: 'Electronics', name: 'Électronique', icon: 'phone-portrait-outline' },
  { id: 'Fashion', name: 'Mode', icon: 'shirt-outline' },
  { id: 'Home', name: 'Maison', icon: 'home-outline' },
  { id: 'Transport', name: 'Transport', icon: 'car-outline' },
  { id: 'Education', name: 'Éducation', icon: 'book-outline' },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredData, setFilteredData] = useState(mockData);
  const router = useRouter();

  // Filter data based on selected category
  const filterData = useCallback((category: string) => {
    if (category === 'all') {
      setFilteredData(mockData);
    } else {
      const filtered = mockData.filter(item => item.category === category);
      setFilteredData(filtered);
    }
  }, []);

  // Handle category selection
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    filterData(categoryId);
  };

  // Pull to refresh functionality
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Simulate API call delay
    setTimeout(() => {
      setRefreshing(false);
      // In a real app, you would fetch new data here
      console.log('Data refreshed');
    }, 1500);
  }, []);

  const handleProductPress = (item: any) => {
    router.push('/item-details');
  };

  const handlePostItem = () => {
    router.push('/post-item');
  };

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard {...item} onPress={() => handleProductPress(item)} />
  );

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemActive
      ]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Ionicons
        name={item.icon as any}
        size={20}
        color={selectedCategory === item.id ? theme.colors.white : theme.colors.gray}
      />
      <Text
        style={[
          styles.categoryText,
          selectedCategory === item.id && styles.categoryTextActive
        ]}
      >
        {item.name}
      </Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.welcomeText}>Bonjour !</Text>
          <Text style={styles.locationText}>Akebe, Libreville</Text>
        </View>
        <TouchableOpacity style={styles.notificationIcon}>
          <Ionicons name="notifications-outline" size={24} color={theme.colors.gray} />
          <View style={styles.notificationBadge}>
            <Text style={styles.badgeText}>3</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={20} color={theme.colors.gray} />
          <Text style={styles.searchPlaceholder}>Rechercher des articles...</Text>
        </TouchableOpacity>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <FlatList
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredData}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            tintColor={theme.colors.primary}
          />
        }
      />

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handlePostItem}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  welcomeText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
    marginBottom: 2,
  },
  locationText: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  notificationIcon: {
    position: 'relative',
    padding: theme.spacing.sm,
  },
  notificationBadge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: '#FF3B30',
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  badgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '600',
  },
  searchContainer: {
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  searchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
  },
  searchPlaceholder: {
    fontSize: 15,
    color: theme.colors.gray,
    marginLeft: theme.spacing.sm,
  },
  categoryContainer: {
    backgroundColor: theme.colors.white,
    paddingBottom: theme.spacing.md,
  },
  categoryList: {
    paddingHorizontal: theme.spacing.lg,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  categoryItemActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  categoryText: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
    marginLeft: 6,
  },
  categoryTextActive: {
    color: theme.colors.white,
  },
  listContainer: {
    paddingTop: theme.spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  itemSeparator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
  },
  fab: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
