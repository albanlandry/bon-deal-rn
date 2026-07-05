import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  FlatList,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { CATEGORIES } from '@/constants/catalog';

// AsyncStorage key for recent searches
const RECENT_SEARCHES_KEY = '@bondeal_recent_searches';

// Voice search ("Trouve-moi ça") ships in W6; gated off until then.
const VOICE_SEARCH_ENABLED = false;

const saveRecentSearches = async (searches: string[]) => {
  try {
    await AsyncStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(searches));
  } catch (error) {
    console.error('Error saving recent searches:', error);
  }
};

const loadRecentSearches = async (): Promise<string[]> => {
  try {
    const stored = await AsyncStorage.getItem(RECENT_SEARCHES_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Error loading recent searches:', error);
    return [];
  }
};

const clearRecentSearches = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(RECENT_SEARCHES_KEY);
  } catch (error) {
    console.error('Error clearing recent searches:', error);
  }
};

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState<string[]>([]);
  const router = useRouter();

  // Load recent searches on component mount
  useEffect(() => {
    loadRecentSearches().then(setRecentItems);
  }, []);

  // Synchronous: persist the term (dedupe, move-to-top, max 10) then navigate.
  const runSearch = (raw: string) => {
    const q = raw.trim();
    if (!q) return;
    const updated = [q, ...recentItems.filter((x) => x !== q)].slice(0, 10);
    setRecentItems(updated);
    saveRecentSearches(updated);
    router.push({ pathname: '/search-results', params: { query: q } });
  };

  const handleRecentSearch = (item: string) => {
    setSearchQuery(item);
    runSearch(item);
  };

  const browseCategory = (value: string) => {
    router.push({ pathname: '/search-results', params: { category: value } });
  };

  const handleClearRecentSearches = async () => {
    setRecentItems([]);
    await clearRecentSearches();
  };

  const handleCancel = () => router.back();

  const renderRecentItem = ({ item }: { item: string }) => (
    <TouchableOpacity style={styles.tagButton} onPress={() => handleRecentSearch(item)}>
      <Text style={styles.tagText}>{item}</Text>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TouchableOpacity style={styles.backButton} onPress={handleCancel}>
          <Ionicons name="chevron-back" size={24} color={theme.colors.gray} />
        </TouchableOpacity>
        <View style={styles.searchInputContainer}>
          <Ionicons name="search" size={20} color={theme.colors.gray} style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Rechercher..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={() => runSearch(searchQuery)}
            autoFocus={true}
            returnKeyType="search"
          />
          {/* TODO(W6): Trouve-moi ça — voice search mic button */}
          {VOICE_SEARCH_ENABLED && (
            <TouchableOpacity style={styles.micButton}>
              <Ionicons name="mic-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Searches Section */}
      {recentItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recherches récentes</Text>
            <TouchableOpacity onPress={handleClearRecentSearches}>
              <Text style={styles.clearAllText}>Tout supprimer</Text>
            </TouchableOpacity>
          </View>
          <FlatList
            data={recentItems}
            renderItem={renderRecentItem}
            keyExtractor={(item, index) => `recent-${index}`}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.tagsContainer}
          />
        </View>
      )}

      {/* Browse by category */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Parcourir par catégorie</Text>
        <View style={styles.categoryGrid}>
          {CATEGORIES.map((c) => (
            <TouchableOpacity
              key={c.value}
              style={styles.tagButton}
              onPress={() => browseCategory(c.value)}
            >
              <Text style={styles.tagText}>{c.label}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grayLight,
  },
  backButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.xs,
    marginRight: theme.spacing.md,
  },
  searchIcon: {
    marginRight: theme.spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: '#333',
  },
  cancelButton: {
    paddingVertical: theme.spacing.sm,
  },
  cancelText: {
    fontSize: 16,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  section: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  clearAllText: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  tagsContainer: {
    paddingRight: theme.spacing.lg,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  micButton: {
    padding: theme.spacing.xs,
    marginLeft: theme.spacing.xs,
  },
  tagButton: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    marginRight: theme.spacing.sm,
    borderWidth: 1,
    borderColor: theme.colors.grayLight,
  },
  tagText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  loadingIndicator: {
    marginLeft: theme.spacing.sm,
  },
  // Suggestion styles
  suggestionsContainer: {
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
    maxHeight: 300,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
  },
  suggestionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F8F9FA',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  suggestionTextContainer: {
    flex: 1,
  },
  suggestionText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '400',
  },
  suggestionSeparator: {
    height: 1,
    backgroundColor: theme.colors.grayLight,
    marginLeft: theme.spacing.lg,
  },
});
