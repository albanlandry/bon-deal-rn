// app/(tabs)/favorites.tsx - Favorites Tab Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { StatusBar, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import FavoritesList from '../../components/organisms/FavoritesList';
import { theme } from '../../utils/theme';

export default function FavoritesScreen() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Favoris</Text>
        <TouchableOpacity style={styles.searchButton} onPress={() => router.push('/search')}>
          <Ionicons name="search-outline" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
      </View>
      <FavoritesList />
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
});
