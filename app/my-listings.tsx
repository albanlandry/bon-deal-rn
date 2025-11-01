// app/my-listings.tsx - My Listings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Alert,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';

type FilterType = 'all' | 'available' | 'sold' | 'draft';

interface Product {
  id: string;
  title: string;
  price: string;
  status: 'available' | 'sold' | 'draft';
  imageUrl: string;
  views: number;
  likes: number;
  createdAt: string;
}

// Mock data
const mockProducts: Product[] = [
  {
    id: '1',
    title: 'Macbook Pro 2020 (256 GB)',
    price: '350000 FCFA',
    status: 'available',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop',
    views: 45,
    likes: 12,
    createdAt: '2024-01-15',
  },
  {
    id: '2',
    title: 'Nike Air Max 270 - Taille 42',
    price: '45000 FCFA',
    status: 'sold',
    imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop',
    views: 23,
    likes: 8,
    createdAt: '2024-01-10',
  },
  {
    id: '3',
    title: 'iPhone 12 Pro Max 128GB',
    price: '280000 FCFA',
    status: 'draft',
    imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop',
    views: 0,
    likes: 0,
    createdAt: '2024-01-20',
  },
];

const filterOptions = [
  { id: 'all' as FilterType, label: 'Tous', count: 12 },
  { id: 'available' as FilterType, label: 'Disponibles', count: 8 },
  { id: 'sold' as FilterType, label: 'Vendus', count: 3 },
  { id: 'draft' as FilterType, label: 'Brouillons', count: 1 },
];

export default function MyListingsScreen() {
  const router = useRouter();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');
  const [products, setProducts] = useState<Product[]>(mockProducts);
  const [refreshing, setRefreshing] = useState(false);

  const filteredProducts = products.filter(product => {
    if (selectedFilter === 'all') return true;
    return product.status === selectedFilter;
  });

  const onRefresh = async () => {
    setRefreshing(true);
    // TODO: Fetch products from API
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  };

  const handleEdit = (productId: string) => {
    router.push({ pathname: '/post-item', params: { id: productId, mode: 'edit' } });
  };

  const handleDelete = (product: Product) => {
    Alert.alert(
      'Supprimer l\'annonce',
      `Êtes-vous sûr de vouloir supprimer "${product.title}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            setProducts(products.filter(p => p.id !== product.id));
            showToast.success('Annonce supprimée', 'L\'annonce a été supprimée avec succès.');
          },
        },
      ]
    );
  };

  const handleMarkAsSold = (product: Product) => {
    Alert.alert(
      'Marquer comme vendu',
      `Voulez-vous marquer "${product.title}" comme vendu ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Confirmer',
          onPress: () => {
            setProducts(
              products.map(p => (p.id === product.id ? { ...p, status: 'sold' as const } : p))
            );
            showToast.success('Statut mis à jour', 'L\'annonce a été marquée comme vendue.');
          },
        },
      ]
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available':
        return '#34C759';
      case 'sold':
        return '#FF3B30';
      case 'draft':
        return '#FF9500';
      default:
        return '#666';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'available':
        return 'Disponible';
      case 'sold':
        return 'Vendu';
      case 'draft':
        return 'Brouillon';
      default:
        return status;
    }
  };

  const renderFilterButton = (filter: typeof filterOptions[0]) => (
    <TouchableOpacity
      key={filter.id}
      style={[
        styles.filterButton,
        selectedFilter === filter.id && styles.filterButtonActive,
      ]}
      onPress={() => setSelectedFilter(filter.id)}>
      <Text
        style={[
          styles.filterText,
          selectedFilter === filter.id && styles.filterTextActive,
        ]}>
        {filter.label}
      </Text>
      {filter.count > 0 && (
        <View style={[
          styles.filterBadge,
          selectedFilter === filter.id && styles.filterBadgeActive,
        ]}>
          <Text style={[
            styles.filterBadgeText,
            selectedFilter === filter.id && styles.filterBadgeTextActive,
          ]}>
            {filter.count}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderProduct = ({ item }: { item: Product }) => (
    <TouchableOpacity
      style={styles.productCard}
      onPress={() => router.push({ pathname: '/item-details', params: { id: item.id } })}>
      <Image source={{ uri: item.imageUrl }} style={styles.productImage} />
      <View style={styles.productContent}>
        <View style={styles.productHeader}>
          <Text style={styles.productTitle} numberOfLines={2}>{item.title}</Text>
          <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '15' }]}>
            <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
              {getStatusLabel(item.status)}
            </Text>
          </View>
        </View>
        <Text style={styles.productPrice}>{item.price}</Text>
        <View style={styles.productStats}>
          <View style={styles.statItem}>
            <Ionicons name="eye-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.views}</Text>
          </View>
          <View style={styles.statItem}>
            <Ionicons name="heart-outline" size={14} color="#666" />
            <Text style={styles.statText}>{item.likes}</Text>
          </View>
        </View>
        <View style={styles.productActions}>
          {item.status === 'available' && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={(e) => {
                e.stopPropagation();
                handleMarkAsSold(item);
              }}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={styles.actionText}>Marquer comme vendu</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleEdit(item.id);
            }}>
            <Ionicons name="pencil" size={18} color={theme.colors.primary} />
            <Text style={styles.actionText}>Modifier</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              handleDelete(item);
            }}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={[styles.actionText, { color: '#FF3B30' }]}>Supprimer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Mes annonces</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Filters */}
      <View style={styles.filtersContainer}>
        <FlatList
          data={filterOptions}
          renderItem={({ item }) => renderFilterButton(item)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Products List */}
      <FlatList
        data={filteredProducts}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={[
          styles.listContent,
          filteredProducts.length === 0 && styles.emptyContainer,
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.primary} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="document-outline" size={64} color={theme.colors.gray} />
            <Text style={styles.emptyTitle}>Aucune annonce</Text>
            <Text style={styles.emptyMessage}>
              {selectedFilter === 'all'
                ? 'Vous n\'avez pas encore publié d\'annonce.'
                : `Vous n'avez pas d'annonces ${filterOptions.find(f => f.id === selectedFilter)?.label.toLowerCase()}.`}
            </Text>
            <TouchableOpacity
              style={styles.createButton}
              onPress={() => router.push('/post-item')}>
              <Text style={styles.createButtonText}>Créer une annonce</Text>
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
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  filtersContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    paddingVertical: theme.spacing.sm,
  },
  filtersList: {
    paddingHorizontal: theme.spacing.lg,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  filterButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  filterText: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
    marginRight: 6,
  },
  filterTextActive: {
    color: theme.colors.white,
  },
  filterBadge: {
    backgroundColor: '#e0e0e0',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  filterBadgeActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  filterBadgeText: {
    fontSize: 11,
    color: '#666',
    fontWeight: '600',
  },
  filterBadgeTextActive: {
    color: theme.colors.white,
  },
  listContent: {
    padding: theme.spacing.lg,
  },
  productCard: {
    flexDirection: 'row',
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    overflow: 'hidden',
  },
  productImage: {
    width: 120,
    height: 120,
    backgroundColor: '#f0f0f0',
  },
  productContent: {
    flex: 1,
    padding: theme.spacing.md,
    justifyContent: 'space-between',
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 4,
  },
  productTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  productPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 8,
  },
  productStats: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  statText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  productActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
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
  createButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  createButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

