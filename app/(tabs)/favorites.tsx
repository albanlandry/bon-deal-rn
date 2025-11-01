// app/(tabs)/favorites.tsx - Favorites Tab Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  RefreshControl,
  StyleSheet,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import ProductCard from '../../components/molecules/ProductCard';
import { showToast } from '../../components/atoms/Toast';
import { theme } from '../../utils/theme';

// Mock favorites data
const mockFavorites = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
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
    status: 'available',
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop',
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
    status: 'available',
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
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
    status: 'sold',
  },
];

export default function FavoritesScreen() {
  const router = useRouter();
  const [favorites, setFavorites] = useState(mockFavorites);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch favorites from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleRemoveFavorite = (productId: string, productTitle: string) => {
    Alert.alert(
      'Retirer des favoris',
      `Voulez-vous retirer "${productTitle}" de vos favoris ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Retirer',
          style: 'destructive',
          onPress: () => {
            setFavorites(favorites.filter(f => f.id !== productId));
            showToast.success('Retiré des favoris', 'Le produit a été retiré de vos favoris.');
          },
        },
      ]
    );
  };

  const handleProductPress = (productId: string) => {
    router.push({ pathname: '/item-details', params: { id: productId } });
  };

  const renderProduct = ({ item }: { item: typeof mockFavorites[0] }) => (
    <View style={styles.productWrapper}>
      <ProductCard {...item} onPress={() => handleProductPress(item.id)} />
      <TouchableOpacity
        style={styles.removeButton}
        onPress={() => handleRemoveFavorite(item.id, item.title)}>
        <Ionicons name="heart" size={20} color="#FF6B6B" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
        <TouchableOpacity
          style={styles.searchButton}
          onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Favorites List */}
      <FlatList
        data={favorites}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          favorites.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="heart-outline" size={64} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>Aucun favori</Text>
            <Text style={styles.emptyMessage}>
              Les produits que vous ajoutez aux favoris apparaîtront ici.
            </Text>
            <TouchableOpacity
              style={styles.browseButton}
              onPress={() => router.push('/(tabs)/home')}>
              <Text style={styles.browseButtonText}>Parcourir les produits</Text>
            </TouchableOpacity>
          </View>
        }
      />
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
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  searchButton: {
    padding: theme.spacing.sm,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  productWrapper: {
    position: 'relative',
  },
  removeButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  separator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
    marginVertical: theme.spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: theme.spacing.xl,
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
    marginBottom: theme.spacing.xl,
  },
  browseButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  browseButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

