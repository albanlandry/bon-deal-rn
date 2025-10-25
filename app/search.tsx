import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
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

// Mock data for recent searches and suggestions
const recentSearches = [
  'shoes',
  'cartables',
  'iphone xs',
  'montres',
  'chambre amis'
];

const suggestions = [
  'Iphone X',
  'cartables',
  'iphone 12',
  'iphone 12 mini',
  'iphone 11 mini'
];

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [recentItems, setRecentItems] = useState(recentSearches);
  const router = useRouter();

  const handleSearch = () => {
    if (searchQuery.trim()) {
      // Add to recent searches if not already present
      if (!recentItems.includes(searchQuery.trim())) {
        setRecentItems([searchQuery.trim(), ...recentItems.slice(0, 4)]);
      }
      // Navigate to search results or perform search
      console.log('Searching for:', searchQuery);
    }
  };

  const handleRecentSearch = (item: string) => {
    setSearchQuery(item);
    handleSearch();
  };

  const handleSuggestionPress = (suggestion: string) => {
    setSearchQuery(suggestion);
    handleSearch();
  };

  const clearRecentSearches = () => {
    setRecentItems([]);
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
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            autoFocus={true}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity style={styles.cancelButton} onPress={handleCancel}>
          <Text style={styles.cancelText}>Annuler</Text>
        </TouchableOpacity>
      </View>

      {/* Recent Searches Section */}
      {recentItems.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Recents</Text>
            <TouchableOpacity onPress={clearRecentSearches}>
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
          data={suggestions}
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
});
