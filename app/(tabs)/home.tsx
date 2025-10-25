// app/(tabs)/home.tsx - Main screen with product list
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  FlatList,
  Image,
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

// Mock user data
const currentUser = {
  name: 'Jean Baptiste',
  avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
  location: 'Akebe, Libreville',
  notificationCount: 3,
};

// Get personalized greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const [filteredData, setFilteredData] = useState(mockData);
  const [currentLocation, setCurrentLocation] = useState(currentUser.location);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const categoryListRef = useRef<FlatList>(null);
  const router = useRouter();

  // Initial scroll to selected category on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      if (categoryListRef.current) {
        const categoryIndex = categories.findIndex(cat => cat.id === selectedCategory);
        if (categoryIndex !== -1) {
          categoryListRef.current.scrollToIndex({
            index: categoryIndex,
            animated: false, // No animation on initial load
            viewPosition: 0.5,
          });
        }
      }
    }, 100); // Small delay to ensure FlatList is rendered

    return () => clearTimeout(timer);
  }, []);

  // Filter data based on selected category
  const filterData = useCallback((category: string) => {
    if (category === 'all') {
      setFilteredData(mockData);
    } else {
      const filtered = mockData.filter(item => item.category === category);
      setFilteredData(filtered);
    }
  }, []);

  // Handle category selection with scroll
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);
    filterData(categoryId);
    
    // Scroll to selected category
    const categoryIndex = categories.findIndex(cat => cat.id === categoryId);
    if (categoryIndex !== -1 && categoryListRef.current) {
      categoryListRef.current.scrollToIndex({
        index: categoryIndex,
        animated: true,
        viewPosition: 0.5, // Center the item in the view
      });
    }
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

  // Handle location picker
  const handleLocationPress = () => {
    // In a real app, this would open a location picker modal
    console.log('Open location picker');
    // For demo, cycle through some locations
    const locations = [
      'Akebe, Libreville',
      'Centre-ville, Libreville',
      'Nkembo, Libreville',
      'Montagne Sainte, Libreville'
    ];
    const currentIndex = locations.indexOf(currentLocation);
    const nextIndex = (currentIndex + 1) % locations.length;
    setCurrentLocation(locations[nextIndex]);
  };

  // Handle notification press
  const handleNotificationPress = () => {
    console.log('Navigate to notifications');
    // In a real app, navigate to notifications screen
  };

  // Handle profile press
  const handleProfilePress = () => {
    console.log('Navigate to profile');
    // In a real app, navigate to profile screen
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode: 'list' | 'grid') => {
    setViewMode(mode);
  };

  const handleProductPress = (item: any) => {
    router.push('/item-details');
  };

  const handlePostItem = () => {
    router.push('/post-item');
  };

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard {...item} onPress={() => handleProductPress(item)} />
  );

  const renderGridProduct = ({ item }: { item: any }) => (
    <View style={styles.gridItem}>
      <TouchableOpacity style={styles.gridProductCard} onPress={() => handleProductPress(item)}>
        {item.imageUrl && (
          <Image source={{ uri: item.imageUrl }} style={styles.gridImage} resizeMode="cover" />
        )}
        <View style={styles.gridContent}>
          <Text style={styles.gridTitle} numberOfLines={2}>{item.title}</Text>
          <Text style={styles.gridLocation} numberOfLines={1}>{item.location}</Text>
          <Text style={styles.gridPrice}>{item.price}</Text>
          <View style={styles.gridActions}>
            <View style={styles.gridActionItem}>
              <Ionicons name="heart-outline" size={12} color="#666" />
              <Text style={styles.gridActionText}>{item.likes}</Text>
            </View>
            <View style={styles.gridActionItem}>
              <Ionicons name="eye-outline" size={12} color="#666" />
              <Text style={styles.gridActionText}>{item.views}</Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    </View>
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
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
            <Image source={{ uri: currentUser.avatar }} style={styles.userAvatar} />
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
          <View style={styles.welcomeContainer}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userName}>{currentUser.name}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.searchIconContainer} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={24} color={theme.colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationContainer} onPress={handleNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.gray} />
            {currentUser.notificationCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{currentUser.notificationCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Bar with View Toggle */}
      <View style={styles.locationBar}>
        <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
          <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.locationText}>{currentLocation}</Text>
          <Ionicons name="chevron-down" size={14} color={theme.colors.gray} />
        </TouchableOpacity>
        <View style={styles.viewToggleContainer}>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'list' && styles.viewToggleActive]} 
            onPress={() => handleViewModeToggle('list')}
          >
            <Ionicons 
              name="list-outline" 
              size={18} 
              color={viewMode === 'list' ? theme.colors.white : theme.colors.gray} 
            />
          </TouchableOpacity>
          <TouchableOpacity 
            style={[styles.viewToggleButton, viewMode === 'grid' && styles.viewToggleActive]} 
            onPress={() => handleViewModeToggle('grid')}
          >
            <Ionicons 
              name="grid-outline" 
              size={18} 
              color={viewMode === 'grid' ? theme.colors.white : theme.colors.gray} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Category Filters */}
      <View style={styles.categoryContainer}>
        <FlatList
          ref={categoryListRef}
          data={categories}
          renderItem={renderCategoryItem}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.categoryList}
          onScrollToIndexFailed={(info) => {
            // Handle scroll failure gracefully
            console.log('Scroll to index failed:', info);
            const wait = new Promise(resolve => setTimeout(resolve, 500));
            wait.then(() => {
              categoryListRef.current?.scrollToIndex({
                index: info.index,
                animated: true,
                viewPosition: 0.5,
              });
            });
          }}
        />
      </View>

      {/* Product List */}
      <FlatList
        data={filteredData}
        renderItem={viewMode === 'list' ? renderProduct : renderGridProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContainer,
          viewMode === 'grid' && styles.gridContainer
        ]}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => viewMode === 'list' ? <View style={styles.itemSeparator} /> : null}
        numColumns={viewMode === 'grid' ? 2 : 1}
        key={viewMode} // Force re-render when view mode changes
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileContainer: {
    position: 'relative',
    marginRight: theme.spacing.md,
  },
  userAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: theme.colors.primary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.success,
    borderWidth: 2,
    borderColor: theme.colors.white,
  },
  welcomeContainer: {
    flex: 1,
  },
  greetingText: {
    fontSize: 16,
    color: theme.colors.gray,
    marginBottom: 2,
  },
  userName: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
  },
  searchIconContainer: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.xs,
  },
  notificationContainer: {
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
  locationBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingBottom: theme.spacing.sm,
    backgroundColor: theme.colors.white,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
  },
  locationText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
    marginHorizontal: 6,
  },
  viewToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    padding: 2,
  },
  viewToggleButton: {
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderRadius: 18,
    marginHorizontal: 2,
  },
  viewToggleActive: {
    backgroundColor: theme.colors.primary,
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
  gridContainer: {
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  itemSeparator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
  },
  gridItem: {
    flex: 1,
    marginHorizontal: theme.spacing.xs,
    marginBottom: theme.spacing.md,
  },
  gridProductCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: 120,
  },
  gridContent: {
    padding: theme.spacing.sm,
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 16,
  },
  gridLocation: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 8,
  },
  gridActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  gridActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  gridActionText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
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
