import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
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

// AsyncStorage key for recent searches
const RECENT_SEARCHES_KEY = '@bondeal_recent_searches';

// Mock data for recent searches and suggestions
const recentSearches = [
  'shoes',
  'cartables',
  'iphone xs',
  'montres',
  'chambre amis'
];

const suggestions = [
  { id: '1', text: 'iPhone 12 Pro Max', category: 'Électronique', type: 'product' },
  { id: '2', text: 'iPhone 12 mini', category: 'Électronique', type: 'product' },
  { id: '3', text: 'iPhone 11', category: 'Électronique', type: 'product' },
  { id: '4', text: 'MacBook Pro 2020', category: 'Électronique', type: 'product' },
  { id: '5', text: 'MacBook Air M1', category: 'Électronique', type: 'product' },
  { id: '6', text: 'Nike Air Max 270', category: 'Mode', type: 'product' },
  { id: '7', text: 'Nike Air Force 1', category: 'Mode', type: 'product' },
  { id: '8', text: 'Adidas Originals', category: 'Mode', type: 'brand' },
  { id: '9', text: 'Sac à dos Nike', category: 'Mode', type: 'product' },
  { id: '10', text: 'Sac à dos Adidas', category: 'Mode', type: 'product' },
  { id: '11', text: 'Table en bois massif', category: 'Maison', type: 'product' },
  { id: '12', text: 'Chaise en bois', category: 'Maison', type: 'product' },
  { id: '13', text: 'Libreville Centre', category: 'Lieu', type: 'location' },
  { id: '14', text: 'Montagne Sainte', category: 'Lieu', type: 'location' },
  { id: '15', text: 'Akebe', category: 'Lieu', type: 'location' },
];

// AsyncStorage helper functions
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
  const [isLoading, setIsLoading] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const router = useRouter();

  // Load recent searches on component mount
  useEffect(() => {
    const loadSearches = async () => {
      const storedSearches = await loadRecentSearches();
      setRecentItems(storedSearches);
    };
    loadSearches();
  }, []);

  const handleSearch = async () => {
    if (searchQuery.trim()) {
      setIsLoading(true);
      setShowSuggestions(false);
      
      // Add to recent searches if not already present
      const trimmedQuery = searchQuery.trim();
      if (!recentItems.includes(trimmedQuery)) {
        const updatedSearches = [trimmedQuery, ...recentItems.slice(0, 9)]; // Keep max 10 items
        setRecentItems(updatedSearches);
        await saveRecentSearches(updatedSearches);
      }
      
      // Simulate search API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Navigate to search results
      router.push({
        pathname: '/search-results',
        params: { query: trimmedQuery }
      });
      setIsLoading(false);
    }
  };

  // Handle search query change
  const handleSearchQueryChange = (text: string) => {
    setSearchQuery(text);
    
    if (text.trim().length > 0) {
      // Filter suggestions based on search query
      const filtered = suggestions.filter(suggestion =>
        suggestion.text.toLowerCase().includes(text.toLowerCase()) ||
        suggestion.category.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSuggestions(filtered.slice(0, 8)); // Limit to 8 suggestions
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    setSearchQuery(suggestion.text);
    setShowSuggestions(false);
    handleSearch();
  };

  const handleRecentSearch = async (item: string) => {
    setSearchQuery(item);
    
    // Add to recent searches if not already present (move to top)
    if (!recentItems.includes(item)) {
      const updatedSearches = [item, ...recentItems.slice(0, 9)];
      setRecentItems(updatedSearches);
      await saveRecentSearches(updatedSearches);
    } else {
      // Move existing item to top
      const filteredSearches = recentItems.filter(search => search !== item);
      const updatedSearches = [item, ...filteredSearches];
      setRecentItems(updatedSearches);
      await saveRecentSearches(updatedSearches);
    }
    
    handleSearch();
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch();
  };

  const handleClearRecentSearches = async () => {
    setRecentItems([]);
    await clearRecentSearches();
  };

  const handleCancel = () => {
    router.back();
  };

  const renderRecentItem = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.tagButton} 
      onPress={() => handleRecentSearch(item)}
    >
      <Text style={styles.tagText}>{item}</Text>
    </TouchableOpacity>
  );

  // Render suggestion item
  const renderSuggestionItem = ({ item }: { item: any }) => (
    <TouchableOpacity 
      style={styles.suggestionItem}
      onPress={() => handleSuggestionSelect(item)}
    >
      <View style={styles.suggestionContent}>
        <View style={styles.suggestionIconContainer}>
          <Ionicons 
            name={
              item.type === 'product' ? 'cube-outline' :
              item.type === 'brand' ? 'star-outline' :
              item.type === 'location' ? 'location-outline' :
              'search-outline'
            } 
            size={20} 
            color={theme.colors.gray} 
          />
        </View>
        <View style={styles.suggestionTextContainer}>
          <Text style={styles.suggestionText}>{item.text}</Text>
          <Text style={styles.suggestionCategory}>{item.category}</Text>
        </View>
      </View>
      <Ionicons name="arrow-up-left-box" size={16} color={theme.colors.gray} />
    </TouchableOpacity>
  );

  const renderSuggestion = ({ item }: { item: string }) => (
    <TouchableOpacity 
      style={styles.tagButton} 
      onPress={() => handleSuggestionPress(item)}
    >
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
            onChangeText={handleSearchQueryChange}
            onSubmitEditing={handleSearch}
            autoFocus={true}
            returnKeyType="search"
          />
          {isLoading && (
            <ActivityIndicator 
              size="small" 
              color={theme.colors.primary} 
              style={styles.loadingIndicator}
            />
          )}
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* Search Suggestions */}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={filteredSuggestions}
            renderItem={renderSuggestionItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
            style={styles.suggestionsList}
            ItemSeparatorComponent={() => <View style={styles.suggestionSeparator} />}
          />
        </View>
      )}

      {/* Recent Searches Section */}
      {recentItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recents</Text>
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

      {/* Suggestions Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Suggestions</Text>
        <FlatList
          data={suggestions.map(s => s.text)}
          renderItem={renderSuggestion}
          keyExtractor={(item, index) => `suggestion-${index}`}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tagsContainer}
        />
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
