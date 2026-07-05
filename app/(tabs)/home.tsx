// app/(tabs)/home.tsx - Main screen with product list
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
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
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { theme } from '../../utils/theme';

import ProductCard from '../../components/molecules/ProductCard';
import { CATEGORIES } from '@/constants/catalog';
import { toCardProps } from '@/lib/mapPost';
import { postsInfiniteQuery } from '@/lib/api/posts';
import { unreadCountQuery } from '@/lib/api/notifications';
import { useAuth } from '@/contexts/AuthContext';
import type { BdPost } from '@/constants/types';

// Grid layout constants for responsive design
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_PADDING = 16; // theme.spacing.md
const GRID_GAP = 8; // theme.spacing.xs
const GRID_ITEM_WIDTH = (SCREEN_WIDTH - (GRID_PADDING * 2) - GRID_GAP) / 2;
const GRID_ITEM_HEIGHT = 280;
const GRID_IMAGE_HEIGHT = 160;

// Category chips: "Tout" + the 10 backend enum buckets (constants/catalog.ts)
const CATEGORY_ICONS: Record<string, string> = {
  all: 'grid-outline',
  electronics: 'phone-portrait-outline',
  furniture: 'bed-outline',
  appliances: 'tv-outline',
  vehicles: 'car-outline',
  fashion: 'shirt-outline',
  baby_kids: 'happy-outline',
  sports: 'football-outline',
  books: 'book-outline',
  tools: 'construct-outline',
  other: 'ellipsis-horizontal-outline',
};

const categories = [
  { id: 'all', name: 'Tout' },
  ...CATEGORIES.map((c) => ({ id: c.value, name: c.label })),
];

// Get personalized greeting based on time
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon après-midi';
  return 'Bonsoir';
};

export default function HomeScreen() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [showProfileQuickAccess, setShowProfileQuickAccess] = useState(false);
  const categoryListRef = useRef<FlatList>(null);
  const router = useRouter();
  const { user, signOut } = useAuth();

  // Real paginated feed, scoped server-side to the user's city.
  const feed = useInfiniteQuery(
    postsInfiniteQuery({
      categories: selectedCategory === 'all' ? undefined : [selectedCategory],
    }),
  );
  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];
  const { data: unreadCount = 0 } = useQuery(unreadCountQuery());

  const displayName = user?.first_name || user?.username || 'Bienvenue';
  const displayLocation = user?.quartier || user?.city || 'Ville non définie';
  const avatarUri = user?.avatar_url || undefined;

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

  // Handle category selection with scroll
  const handleCategoryPress = (categoryId: string) => {
    setSelectedCategory(categoryId);

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

  // Location is server-scoped to user.city; the picker is display-only for v1.
  const handleLocationPress = () => {
    // TODO(W5): open a quartier picker → PATCH /auth/me quartier.
  };

  // Handle notification press
  const handleNotificationPress = () => {
    router.push('/notifications');
  };

  // Handle profile press
  const handleProfilePress = () => {
    setShowProfileQuickAccess(true);
  };

  // Handle profile quick access actions
  const handleProfileAction = async (action: string) => {
    setShowProfileQuickAccess(false);
    switch (action) {
      case 'profile':
        router.push('/(tabs)/profile');
        break;
      case 'settings':
        router.push('/settings');
        break;
      case 'help':
        router.push('/help-support');
        break;
      case 'logout':
        await signOut();
        router.replace('/login');
        break;
    }
  };

  // Handle view mode toggle
  const handleViewModeToggle = (mode: 'list' | 'grid') => {
    setViewMode(mode);
  };

  const handleProductPress = (item: BdPost) => {
    router.push({ pathname: '/item-details', params: { id: String(item.id) } });
  };

  const handlePostItem = () => {
    router.push('/post-item');
  };

  const renderProduct = ({ item }: { item: BdPost }) => {
    const card = toCardProps(item);
    return <ProductCard {...card} onPress={() => handleProductPress(item)} />;
  };

  const renderGridProduct = ({ item }: { item: BdPost }) => {
    const card = toCardProps(item);
    return (
      <View style={[styles.gridItem, { width: GRID_ITEM_WIDTH }]}>
        <TouchableOpacity style={styles.gridProductCard} onPress={() => handleProductPress(item)}>
          {card.imageUrl && (
            <Image source={{ uri: card.imageUrl }} style={styles.gridImage} resizeMode="cover" />
          )}
          <View style={styles.gridContent}>
            <Text style={styles.gridTitle} numberOfLines={2} ellipsizeMode="tail">
              {card.title}
            </Text>
            <Text style={styles.gridLocation} numberOfLines={1} ellipsizeMode="tail">
              {card.location}
            </Text>
            <Text style={styles.gridPrice} numberOfLines={1} ellipsizeMode="tail">
              {card.price}
            </Text>
            <View style={styles.gridActions}>
              <View style={styles.gridActionItem}>
                <Ionicons name="heart-outline" size={12} color="#666" />
                <Text style={styles.gridActionText} numberOfLines={1} ellipsizeMode="tail">
                  {card.likes}
                </Text>
              </View>
              <View style={styles.gridActionItem}>
                <Ionicons name="eye-outline" size={12} color="#666" />
                <Text style={styles.gridActionText} numberOfLines={1} ellipsizeMode="tail">
                  {card.views}
                </Text>
              </View>
            </View>
          </View>
        </TouchableOpacity>
      </View>
    );
  };

  const renderCategoryItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.categoryItem,
        selectedCategory === item.id && styles.categoryItemActive
      ]}
      onPress={() => handleCategoryPress(item.id)}
    >
      <Ionicons
        name={(CATEGORY_ICONS[item.id] ?? 'pricetag-outline') as any}
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

  // Loading skeleton components
  const renderSkeletonItem = () => (
    <View style={styles.skeletonItem}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonLocation} />
        <View style={styles.skeletonPrice} />
        <View style={styles.skeletonActions} />
      </View>
    </View>
  );

  const renderGridSkeletonItem = () => (
    <View style={[styles.gridItem, { width: GRID_ITEM_WIDTH }]}>
      <View style={styles.gridSkeletonCard}>
        <View style={styles.gridSkeletonImage} />
        <View style={styles.gridSkeletonContent}>
          <View style={styles.gridSkeletonTitle} />
          <View style={styles.gridSkeletonLocation} />
          <View style={styles.gridSkeletonPrice} />
        </View>
      </View>
    </View>
  );

  // Profile Quick Access Modal
  const renderProfileQuickAccess = () => (
    <View style={styles.profileQuickAccessOverlay}>
      <TouchableOpacity 
        style={styles.profileQuickAccessBackdrop} 
        onPress={() => setShowProfileQuickAccess(false)}
      />
      <View style={styles.profileQuickAccessModal}>
        {/* Profile Header */}
        <View style={styles.profileQuickAccessHeader}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={styles.profileQuickAccessAvatar} />
          ) : (
            <View style={[styles.profileQuickAccessAvatar, styles.avatarFallback]}>
              <Ionicons name="person" size={28} color={theme.colors.gray} />
            </View>
          )}
          <View style={styles.profileQuickAccessInfo}>
            <Text style={styles.profileQuickAccessName}>{displayName}</Text>
            <Text style={styles.profileQuickAccessLocation}>{displayLocation}</Text>
          </View>
          <TouchableOpacity
            style={styles.profileQuickAccessClose}
            onPress={() => setShowProfileQuickAccess(false)}
          >
            <Ionicons name="close" size={24} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>

        {/* Quick Actions */}
        <View style={styles.profileQuickActions}>
          <TouchableOpacity 
            style={styles.profileQuickAction}
            onPress={() => handleProfileAction('profile')}
          >
            <View style={styles.profileQuickActionIcon}>
              <Ionicons name="person-outline" size={20} color={theme.colors.primary} />
            </View>
            <Text style={styles.profileQuickActionText}>Mon Profil</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileQuickAction}
            onPress={() => handleProfileAction('settings')}
          >
            <View style={styles.profileQuickActionIcon}>
              <Ionicons name="settings-outline" size={20} color={theme.colors.gray} />
            </View>
            <Text style={styles.profileQuickActionText}>Paramètres</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileQuickAction}
            onPress={() => handleProfileAction('help')}
          >
            <View style={styles.profileQuickActionIcon}>
              <Ionicons name="help-circle-outline" size={20} color={theme.colors.gray} />
            </View>
            <Text style={styles.profileQuickActionText}>Aide & Support</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.profileQuickAction}
            onPress={() => handleProfileAction('logout')}
          >
            <View style={styles.profileQuickActionIcon}>
              <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            </View>
            <Text style={[styles.profileQuickActionText, styles.profileQuickActionDanger]}>Se déconnecter</Text>
            <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      
      {/* Enhanced Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity style={styles.profileContainer} onPress={handleProfilePress}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.userAvatar} />
            ) : (
              <View style={[styles.userAvatar, styles.avatarFallback]}>
                <Ionicons name="person" size={24} color={theme.colors.gray} />
              </View>
            )}
            <View style={styles.onlineIndicator} />
          </TouchableOpacity>
          <View style={styles.welcomeContainer}>
            <Text style={styles.greetingText}>{getGreeting()},</Text>
            <Text style={styles.userName} numberOfLines={1}>{displayName}</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <TouchableOpacity style={styles.searchIconContainer} onPress={() => router.push('/search')}>
            <Ionicons name="search-outline" size={24} color={theme.colors.gray} />
          </TouchableOpacity>
          <TouchableOpacity style={styles.notificationContainer} onPress={handleNotificationPress}>
            <Ionicons name="notifications-outline" size={24} color={theme.colors.gray} />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Location Bar with View Toggle */}
      <View style={styles.locationBar}>
        <TouchableOpacity style={styles.locationContainer} onPress={handleLocationPress}>
          <Ionicons name="location-outline" size={16} color={theme.colors.primary} />
          <Text style={styles.locationText} numberOfLines={1}>{displayLocation}</Text>
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
      {feed.isError && posts.length === 0 && !feed.isLoading ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
          <Text style={styles.emptyTitle}>Impossible de charger les annonces</Text>
          <TouchableOpacity style={styles.emptyButton} onPress={() => feed.refetch()}>
            <Text style={styles.emptyButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={feed.isLoading ? Array(6).fill({}) : posts}
          renderItem={
            feed.isLoading
              ? (viewMode === 'list' ? renderSkeletonItem : renderGridSkeletonItem)
              : (viewMode === 'list' ? renderProduct : renderGridProduct)
          }
          keyExtractor={(item, index) =>
            feed.isLoading ? `skeleton-${index}` : String((item as BdPost).id)
          }
          contentContainerStyle={[
            styles.listContainer,
            viewMode === 'grid' && styles.gridContainer,
            posts.length === 0 && !feed.isLoading && styles.emptyListContainer,
          ]}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() =>
            viewMode === 'list' && !feed.isLoading ? <View style={styles.itemSeparator} /> : null
          }
          numColumns={viewMode === 'grid' ? 2 : 1}
          columnWrapperStyle={viewMode === 'grid' ? styles.gridRow : undefined}
          key={viewMode} // Force re-render when view mode changes
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
            feed.isLoading ? null : (
              <View style={styles.emptyContainer}>
                <Ionicons name="pricetags-outline" size={56} color={theme.colors.grayLight} />
                <Text style={styles.emptyTitle}>Aucune annonce dans votre ville</Text>
                <Text style={styles.emptySubtitle}>
                  Soyez le premier à vendre près de chez vous.
                </Text>
                <TouchableOpacity style={styles.emptyButton} onPress={handlePostItem}>
                  <Text style={styles.emptyButtonText}>Publier une annonce</Text>
                </TouchableOpacity>
              </View>
            )
          }
          refreshControl={
            <RefreshControl
              refreshing={feed.isRefetching && !feed.isFetchingNextPage}
              onRefresh={() => feed.refetch()}
              colors={[theme.colors.primary]}
              tintColor={theme.colors.primary}
            />
          }
        />
      )}

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} onPress={handlePostItem}>
        <Ionicons name="add" size={24} color="white" />
      </TouchableOpacity>

      {/* Profile Quick Access Modal */}
      {showProfileQuickAccess && renderProfileQuickAccess()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  avatarFallback: {
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
  },
  footerSpinner: {
    paddingVertical: theme.spacing.lg,
  },
  emptyListContainer: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.xl * 2,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: '#333',
    marginTop: theme.spacing.md,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: theme.colors.gray,
    marginTop: 6,
    textAlign: 'center',
  },
  emptyButton: {
    marginTop: theme.spacing.lg,
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.xl,
    paddingVertical: theme.spacing.md,
    borderRadius: 24,
  },
  emptyButtonText: {
    color: theme.colors.white,
    fontWeight: '700',
    fontSize: 15,
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
    paddingHorizontal: GRID_PADDING,
    paddingTop: theme.spacing.md,
    paddingBottom: 100, // Space for FAB
  },
  gridRow: {
    justifyContent: 'space-between',
    marginBottom: 0,
  },
  itemSeparator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
  },
  gridItem: {
    marginBottom: theme.spacing.md,
    height: GRID_ITEM_HEIGHT, // Fixed height for consistent grid
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
    height: '100%',
    width: '100%',
  },
  gridImage: {
    width: '100%',
    height: GRID_IMAGE_HEIGHT, // Fixed image height
    backgroundColor: '#f0f0f0',
  },
  gridContent: {
    padding: theme.spacing.sm,
    flex: 1,
    justifyContent: 'space-between',
  },
  gridTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
    minHeight: 36, // Ensure consistent height for 2 lines
  },
  gridLocation: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    minHeight: 14,
  },
  gridPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 8,
    minHeight: 18,
  },
  gridActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 'auto',
  },
  gridActionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    minWidth: 0, // Allow text truncation
  },
  gridActionText: {
    fontSize: 10,
    color: '#666',
    marginLeft: 4,
    flexShrink: 1,
    minWidth: 0, // Allow text truncation
  },
  // Skeleton loading styles
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.sm,
    paddingVertical: theme.spacing.md,
  },
  skeletonImage: {
    width: 120,
    height: 120,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    marginRight: theme.spacing.md,
  },
  skeletonContent: {
    flex: 1,
    justifyContent: 'space-between',
  },
  skeletonTitle: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '80%',
  },
  skeletonLocation: {
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '60%',
  },
  skeletonPrice: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
    width: '40%',
  },
  skeletonActions: {
    flexDirection: 'row',
    gap: 10,
  },
  gridSkeletonCard: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    height: GRID_ITEM_HEIGHT,
    width: '100%',
  },
  gridSkeletonImage: {
    width: '100%',
    height: GRID_IMAGE_HEIGHT,
    backgroundColor: '#E0E0E0',
  },
  gridSkeletonContent: {
    padding: theme.spacing.sm,
  },
  gridSkeletonTitle: {
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
    width: '90%',
  },
  gridSkeletonLocation: {
    height: 11,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
    width: '70%',
  },
  gridSkeletonPrice: {
    height: 14,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '50%',
  },
  // Profile Quick Access styles
  profileQuickAccessOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 1000,
  },
  profileQuickAccessBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  profileQuickAccessModal: {
    position: 'absolute',
    top: 100,
    left: theme.spacing.lg,
    right: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 8,
  },
  profileQuickAccessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  profileQuickAccessAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: theme.spacing.md,
  },
  profileQuickAccessInfo: {
    flex: 1,
  },
  profileQuickAccessName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  profileQuickAccessLocation: {
    fontSize: 14,
    color: theme.colors.gray,
  },
  profileQuickAccessClose: {
    padding: theme.spacing.sm,
  },
  profileQuickStats: {
    flexDirection: 'row',
    padding: theme.spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  profileQuickStat: {
    flex: 1,
    alignItems: 'center',
  },
  profileQuickStatNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 4,
  },
  profileQuickStatLabel: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  profileQuickActions: {
    padding: theme.spacing.md,
  },
  profileQuickAction: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
  },
  profileQuickActionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  profileQuickActionText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  profileQuickActionDanger: {
    color: '#FF3B30',
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
