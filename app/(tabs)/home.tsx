// app/(tabs)/home.tsx - Main screen with product list
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    StatusBar,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../utils/theme';

import ProductCard from '../../components/molecules/ProductCard';

const mockData = [
  {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop&crop=center',
    title: 'Macbook Pro 2020 (256 GB)',
    location: 'Kinguele - 25 min',
    price: '350000 FCFA',
    likes: 5,
    views: 5,
    comments: 5,
  },
  {
    id: '2',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop&crop=center',
    title: 'Macbook Pro 2020 (256 GB)',
    location: 'Kinguele - 25 min',
    price: '350000 FCFA',
    likes: 5,
    views: 5,
    comments: 5,
  },
  {
    id: '3',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop&crop=center',
    title: 'Macbook Pro 2020 (256 GB)',
    location: 'Kinguele - 25 min',
    price: '350000 FCFA',
    likes: 5,
    views: 5,
    comments: 5,
  },
];

export default function HomeScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const router = useRouter();

  const handleProductPress = (item: any) => {
    router.push('/item-details');
  };

  const handlePostItem = () => {
    router.push('/post-item');
  };

  const renderProduct = ({ item }: { item: any }) => (
    <ProductCard {...item} onPress={() => handleProductPress(item)} />
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      
      {/* Custom Header with Home Page title and User Avatar */}


      {/* Location Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.locationInput}
          placeholder="Akebe, Libreville"
          value="Akebe, Libreville"
          editable={false}
        />
        <TouchableOpacity style={styles.searchIcon} onPress={() => router.push('/search')}>
          <Ionicons name="search" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.notificationIcon}>
          <Ionicons name="notifications" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>

      {/* Product List */}
      <FlatList
        data={mockData}
        renderItem={renderProduct}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.itemSeparator} />}
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
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.primary,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderTopWidth: 1,
    borderBottomColor: theme.colors.grayLight,
    borderTopColor: theme.colors.grayLight,
  },
  locationInput: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 12,
    fontSize: 15,
    marginRight: theme.spacing.md,
    color: '#333',
  },
  searchIcon: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  notificationIcon: {
    padding: theme.spacing.sm,
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
