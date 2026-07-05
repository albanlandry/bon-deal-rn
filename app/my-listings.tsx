// app/my-listings.tsx - My Listings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';
import { ApiError } from '@/lib/api';
import { myPostsQuery, deletePost, updatePost } from '@/lib/api/posts';
import { toCardProps } from '@/lib/mapPost';
import { stateBadge } from '@/constants/catalog';
import type { BdPost } from '@/constants/types';

// Client-side status filter. Chips map to Post.state values.
type FilterType = 'all' | 'published' | 'sold' | 'draft' | 'unpublished';

const FILTERS: { id: FilterType; label: string; states: string[] }[] = [
  { id: 'all', label: 'Tous', states: [] },
  { id: 'published', label: 'Disponibles', states: ['published'] },
  { id: 'sold', label: 'Vendus', states: ['sold'] },
  { id: 'draft', label: 'Brouillons', states: ['draft'] },
  { id: 'unpublished', label: 'Retirés', states: ['unpublished', 'reserved'] },
];

function errMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    return e.message;
  }
  return 'Une erreur est survenue. Réessayez.';
}

export default function MyListingsScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [selectedFilter, setSelectedFilter] = useState<FilterType>('all');

  const listing = useQuery(myPostsQuery());
  const posts = listing.data?.posts ?? [];

  const activeStates = FILTERS.find((f) => f.id === selectedFilter)?.states ?? [];
  const filteredPosts =
    activeStates.length === 0 ? posts : posts.filter((p) => activeStates.includes(p.state));

  // Live counts per chip, derived from the loaded list.
  const countFor = (states: string[]) =>
    states.length === 0 ? posts.length : posts.filter((p) => states.includes(p.state)).length;

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['posts'] });
  };

  const delMut = useMutation({
    mutationFn: (id: number) => deletePost(id),
    onSuccess: () => {
      invalidate();
      showToast.success('Annonce supprimée');
    },
    onError: (e) => showToast.error('Échec', errMessage(e)),
  });

  const soldMut = useMutation({
    mutationFn: (id: number) => updatePost(id, { state: 'sold' }),
    onSuccess: () => {
      invalidate();
      showToast.success('Marquée comme vendue');
    },
    onError: (e) => showToast.error('Échec', errMessage(e)),
  });

  const handleEdit = (id: number) => {
    router.push({ pathname: '/post-item', params: { id: String(id), mode: 'edit' } });
  };

  const handleDelete = (post: BdPost) => {
    Alert.alert('Supprimer l\'annonce', `Supprimer "${post.title}" ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Supprimer', style: 'destructive', onPress: () => delMut.mutate(post.id) },
    ]);
  };

  const handleMarkAsSold = (post: BdPost) => {
    Alert.alert('Marquer comme vendu', `Marquer "${post.title}" comme vendu ?`, [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Confirmer', onPress: () => soldMut.mutate(post.id) },
    ]);
  };

  const renderFilterButton = (filter: (typeof FILTERS)[0]) => {
    const count = countFor(filter.states);
    return (
      <TouchableOpacity
        key={filter.id}
        style={[styles.filterButton, selectedFilter === filter.id && styles.filterButtonActive]}
        onPress={() => setSelectedFilter(filter.id)}>
        <Text
          style={[styles.filterText, selectedFilter === filter.id && styles.filterTextActive]}>
          {filter.label}
        </Text>
        {count > 0 && (
          <View style={[styles.filterBadge, selectedFilter === filter.id && styles.filterBadgeActive]}>
            <Text
              style={[
                styles.filterBadgeText,
                selectedFilter === filter.id && styles.filterBadgeTextActive,
              ]}>
              {count}
            </Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderProduct = ({ item }: { item: BdPost }) => {
    const card = toCardProps(item);
    const badge = stateBadge(item.state);
    const busy = delMut.isPending || soldMut.isPending;
    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push({ pathname: '/item-details', params: { id: String(item.id) } })}>
        {card.imageUrl ? (
          <Image source={{ uri: card.imageUrl }} style={styles.productImage} />
        ) : (
          <View style={[styles.productImage, styles.productImagePlaceholder]}>
            <Ionicons name="image-outline" size={28} color={theme.colors.gray} />
          </View>
        )}
        <View style={styles.productContent}>
          <View style={styles.productHeader}>
            <Text style={styles.productTitle} numberOfLines={2}>{card.title}</Text>
            <View style={[styles.statusBadge, { backgroundColor: badge.color + '15' }]}>
              <Text style={[styles.statusText, { color: badge.color }]}>{badge.label}</Text>
            </View>
          </View>
          <Text style={styles.productPrice}>{card.price}</Text>
          <View style={styles.productStats}>
            <View style={styles.statItem}>
              <Ionicons name="eye-outline" size={14} color="#666" />
              <Text style={styles.statText}>{card.views}</Text>
            </View>
            <View style={styles.statItem}>
              <Ionicons name="heart-outline" size={14} color="#666" />
              <Text style={styles.statText}>{card.likes}</Text>
            </View>
          </View>
          <View style={styles.productActions}>
            {(item.state === 'published' || item.state === 'reserved') && (
              <TouchableOpacity
                style={styles.actionButton}
                disabled={busy}
                onPress={(e) => {
                  e.stopPropagation();
                  handleMarkAsSold(item);
                }}>
                <Ionicons name="checkmark-circle" size={18} color="#34C759" />
                <Text style={styles.actionText}>Vendu</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.actionButton}
              disabled={busy}
              onPress={(e) => {
                e.stopPropagation();
                handleEdit(item.id);
              }}>
              <Ionicons name="pencil" size={18} color={theme.colors.primary} />
              <Text style={styles.actionText}>Modifier</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              disabled={busy}
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
  };

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
          data={FILTERS}
          renderItem={({ item }) => renderFilterButton(item)}
          keyExtractor={(item) => item.id}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filtersList}
        />
      </View>

      {/* Products List */}
      {listing.isLoading ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator color={theme.colors.primary} />
        </View>
      ) : listing.isError ? (
        <View style={styles.emptyContainer}>
          <Ionicons name="alert-circle-outline" size={56} color="#FF6B6B" />
          <Text style={styles.emptyTitle}>Impossible de charger vos annonces</Text>
          <TouchableOpacity style={styles.createButton} onPress={() => listing.refetch()}>
            <Text style={styles.createButtonText}>Réessayer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderProduct}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={[
            styles.listContent,
            filteredPosts.length === 0 && styles.emptyContainer,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={listing.isRefetching}
              onRefresh={() => listing.refetch()}
              tintColor={theme.colors.primary}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons name="document-outline" size={64} color={theme.colors.gray} />
              <Text style={styles.emptyTitle}>Aucune annonce</Text>
              <Text style={styles.emptyMessage}>
                {selectedFilter === 'all'
                  ? "Vous n'avez pas encore publié d'annonce."
                  : `Aucune annonce dans « ${FILTERS.find((f) => f.id === selectedFilter)?.label} ».`}
              </Text>
              <TouchableOpacity style={styles.createButton} onPress={() => router.push('/post-item')}>
                <Text style={styles.createButtonText}>Créer une annonce</Text>
              </TouchableOpacity>
            </View>
          }
        />
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
  productImagePlaceholder: {
    alignItems: 'center',
    justifyContent: 'center',
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

