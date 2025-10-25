// app/item-details.tsx - Item details screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  Dimensions,
  FlatList,
  Image,
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Carousel from 'react-native-reanimated-carousel';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

const { width: screenWidth } = Dimensions.get('window');

interface ItemDetailsProps {
  id?: string;
  imageUrl?: string;
  title?: string;
  description?: string;
  price?: string;
  location?: {
    latitude: number;
    longitude: number;
    address: string;
  };
  seller?: {
    name: string;
    avatar: string;
    postedTime: string;
  };
}

export default function ItemDetailsScreen() {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Mock data - in real app, this would come from navigation params
  const item: ItemDetailsProps = {
    id: '1',
    imageUrl: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop&crop=center',
    title: 'Macbook Pro 2020 (256 GB)',
    description: `Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.

Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.

Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi architecto beatae vitae dicta sunt explicabo.`,
    price: '350000 FCFA',
    location: {
      latitude: 0.4162,
      longitude: 9.4673,
      address: 'Kinguele, Libreville, Gabon',
    },
    seller: {
      name: 'user12345',
      avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face',
      postedTime: "Publié il y'a 15 min",
    },
  };

  // Mock suggested items data
  const suggestedItems = [
    {
      id: '2',
      imageUrl: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&crop=center',
      title: 'MacBook Air M1 2020',
      price: '280000 FCFA',
      location: 'Libreville Centre',
      status: 'available',
    },
    {
      id: '3',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
      title: 'iPhone 12 Pro Max 128GB',
      price: '320000 FCFA',
      location: 'Akebe',
      status: 'available',
    },
    {
      id: '4',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
      title: 'iPad Pro 11" 2021',
      price: '450000 FCFA',
      location: 'Montagne Sainte',
      status: 'sold',
    },
    {
      id: '5',
      imageUrl: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
      title: 'Dell XPS 13 2021',
      price: '380000 FCFA',
      location: 'Nzeng Ayong',
      status: 'available',
    },
  ];

  // Mock engagement data
  const engagementData = {
    likes: 24,
    views: 156,
    chats: 8,
  };

  const images = [
    'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=400&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1541807084-5c52b6b3adef?w=400&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=300&fit=crop&crop=center',
    'https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?w=400&h=300&fit=crop&crop=center',
  ];

  const handleBack = () => {
    router.back();
  };

  const handleHome = () => {
    router.push('/(tabs)/home');
  };

  const handleLike = () => {
    setIsLiked(!isLiked);
  };

  const handleShare = () => {
    console.log('Share item');
  };

  const handleContact = () => {
    console.log('Contact seller');
  };

  const handleNegotiate = () => {
    console.log('Start negotiation');
  };

  const handleImagePress = (index: number) => {
    setCurrentImageIndex(index);
    setIsFullscreen(true);
  };

  const handleCloseFullscreen = () => {
    setIsFullscreen(false);
  };

  const EngagementStats = () => (
    <View style={styles.engagementContainer}>
      <View style={styles.engagementItem}>
        <Ionicons name="heart" size={16} color="#FF6B6B" />
        <Text style={styles.engagementText}>{engagementData.likes}</Text>
      </View>
      <View style={styles.engagementItem}>
        <Ionicons name="eye" size={16} color="#666" />
        <Text style={styles.engagementText}>{engagementData.views}</Text>
      </View>
      <View style={styles.engagementItem}>
        <Ionicons name="chatbubble" size={16} color="#666" />
        <Text style={styles.engagementText}>{engagementData.chats}</Text>
      </View>
    </View>
  );

  const handleOpenMap = () => {
    if (item.location) {
      const { latitude, longitude, address } = item.location;
      const url = `https://maps.google.com/maps?q=${latitude},${longitude}&z=15`;
      Linking.openURL(url);
    }
  };

  const renderSuggestedItem = ({ item }: { item: any }) => (
    <TouchableOpacity style={styles.suggestedItem} onPress={() => router.push('/item-details')}>
      <View style={styles.suggestedImageContainer}>
        <Image source={{ uri: item.imageUrl }} style={styles.suggestedImage} />
        <View style={[
          styles.suggestedStatusBadge,
          { backgroundColor: item.status === 'available' ? '#34C759' : '#FF3B30' }
        ]}>
          <Text style={styles.suggestedStatusText}>
            {item.status === 'available' ? 'Disponible' : 'Vendu'}
          </Text>
        </View>
      </View>
      <View style={styles.suggestedContent}>
        <Text style={styles.suggestedTitle} numberOfLines={2}>{item.title}</Text>
        <Text style={styles.suggestedLocation}>{item.location}</Text>
        <Text style={styles.suggestedPrice}>{item.price}</Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Fullscreen Carousel Modal */}
      {isFullscreen && (
        <View style={styles.fullscreenContainer}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={handleCloseFullscreen}>
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          
          <Carousel
            loop
            width={screenWidth}
            height={screenWidth}
            autoPlay={false}
            data={images}
            defaultIndex={currentImageIndex}
            scrollAnimationDuration={300}
            onSnapToItem={(index) => setCurrentImageIndex(index)}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.fullscreenImageContainer}
                onPress={handleCloseFullscreen}
                activeOpacity={1}>
                <Image source={{ uri: item }} style={styles.fullscreenImage} />
              </TouchableOpacity>
            )}
          />
          
          {/* Fullscreen Pagination */}
          <View style={styles.fullscreenPagination}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.fullscreenPaginationDot,
                  index === currentImageIndex && styles.fullscreenPaginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>
      )}

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerButton} onPress={handleBack}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>

        <View style={styles.sellerInfo}>
          <Image source={{ uri: item.seller?.avatar }} style={styles.sellerAvatar} />
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName}>{item.seller?.name}</Text>
            <Text style={styles.postedTime}>{item.seller?.postedTime}</Text>
          </View>
        </View>

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerButton} onPress={handleHome}>
            <Ionicons name="home" size={24} color="#000" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerButton}>
            <Ionicons name="ellipsis-vertical" size={24} color="#000" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView} 
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Image Carousel */}
        <View style={styles.imageContainer}>
          <Carousel
            loop
            width={screenWidth}
            height={300}
            autoPlay={false}
            data={images}
            scrollAnimationDuration={300}
            onSnapToItem={(index) => setCurrentImageIndex(index)}
            renderItem={({ item, index }) => (
              <TouchableOpacity
                onPress={() => handleImagePress(index)}
                activeOpacity={0.9}>
                <Image source={{ uri: item }} style={styles.productImage} />
              </TouchableOpacity>
            )}
          />
          
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {images.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === currentImageIndex && styles.paginationDotActive,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Product Info */}
        <View style={styles.productInfo}>
          <Text style={styles.productTitle}>{item.title}</Text>
          <EngagementStats />
          <Text style={styles.productDescription}>{item.description}</Text>
          
          {/* Location Map */}
          {item.location && (
            <View style={styles.mapSection}>
              <Text style={styles.sectionTitle}>Localisation</Text>
              <TouchableOpacity style={styles.mapContainer} onPress={handleOpenMap}>
                <View style={styles.mapPlaceholder}>
                  <Ionicons name="location" size={48} color={theme.colors.primary} />
                  <Text style={styles.mapPlaceholderText}>Appuyez pour voir sur la carte</Text>
                  <Text style={styles.mapCoordinates}>
                    {item.location.latitude.toFixed(4)}, {item.location.longitude.toFixed(4)}
                  </Text>
                </View>
              </TouchableOpacity>
              <Text style={styles.locationAddress}>{item.location.address}</Text>
            </View>
          )}
        </View>

        {/* Suggested Items */}
        <View style={styles.suggestedSection}>
          <Text style={styles.sectionTitle}>Articles similaires</Text>
          <FlatList
            data={suggestedItems}
            renderItem={renderSuggestedItem}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.suggestedList}
          />
        </View>
      </ScrollView>

      {/* Bottom Action Bar */}
      <View style={styles.bottomBar}>
        <View style={styles.bottomLeft}>
          <TouchableOpacity style={styles.actionButton} onPress={handleLike}>
            <Ionicons
              name={isLiked ? 'heart' : 'heart-outline'}
              size={24}
              color={isLiked ? '#FF6B6B' : '#666'}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionButton} onPress={handleShare}>
            <Ionicons name="share-outline" size={24} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.bottomCenter}>
          <Text style={styles.price}>{item.price}</Text>
          <TouchableOpacity onPress={handleNegotiate}>
            <Text style={styles.negotiateText}>Negotier</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity style={styles.contactButton} onPress={handleContact}>
          <Text style={styles.contactButtonText}>Contacter</Text>
        </TouchableOpacity>
      </View>
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
    borderBottomColor: theme.colors.grayLight,
  },
  headerButton: {
    padding: theme.spacing.sm,
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginHorizontal: theme.spacing.md,
  },
  sellerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: theme.spacing.sm,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  postedTime: {
    fontSize: 12,
    color: theme.colors.gray,
    marginTop: 2,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.xl,
  },
  imageContainer: {
    position: 'relative',
    marginBottom: theme.spacing.lg,
  },
  productImage: {
    width: screenWidth,
    height: 300,
    resizeMode: 'cover',
  },
  paginationContainer: {
    position: 'absolute',
    bottom: 16,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    backgroundColor: '#000',
  },
  productInfo: {
    paddingHorizontal: theme.spacing.lg,
    // paddingBottom: 100, // Space for bottom bar
  },
  productTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: theme.spacing.sm,
  },
  engagementContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
    paddingVertical: theme.spacing.sm,
  },
  engagementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: theme.spacing.lg,
  },
  engagementText: {
    fontSize: 14,
    color: '#666',
    marginLeft: 4,
    fontWeight: '500',
  },
  productDescription: {
    fontSize: 16,
    lineHeight: 24,
    color: '#333',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grayLight,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: theme.spacing.sm,
    marginRight: theme.spacing.sm,
  },
  bottomCenter: {
    flex: 1,
    alignItems: 'center',
  },
  price: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  negotiateText: {
    fontSize: 14,
    color: theme.colors.gray,
    textDecorationLine: 'underline',
  },
  contactButton: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderRadius: 8,
  },
  contactButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  fullscreenContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#000',
    zIndex: 1000,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 1001,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImageContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenImage: {
    width: screenWidth,
    height: screenWidth,
    resizeMode: 'contain',
  },
  fullscreenPagination: {
    position: 'absolute',
    bottom: 50,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullscreenPaginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    marginHorizontal: 4,
  },
  fullscreenPaginationDotActive: {
    backgroundColor: 'white',
  },
  // Map styles
  mapSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: theme.spacing.md,
    paddingHorizontal: theme.spacing.lg,
  },
  mapContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: theme.spacing.sm,
    backgroundColor: '#F8F9FA',
    borderWidth: 1,
    borderColor: theme.colors.grayLight,
  },
  mapPlaceholder: {
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  mapPlaceholderText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.primary,
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.xs,
  },
  mapCoordinates: {
    fontSize: 12,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  locationAddress: {
    fontSize: 14,
    color: theme.colors.gray,
    fontWeight: '500',
  },
  // Suggested items styles
  suggestedSection: {
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.xxxxxxxl,
  },
  suggestedList: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.lg,
  },
  suggestedItem: {
    width: 160,
    marginRight: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: 'hidden',
  },
  suggestedImageContainer: {
    position: 'relative',
  },
  suggestedImage: {
    width: '100%',
    height: 120,
  },
  suggestedStatusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  suggestedStatusText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  suggestedContent: {
    padding: theme.spacing.sm,
  },
  suggestedTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 18,
  },
  suggestedLocation: {
    fontSize: 12,
    color: theme.colors.gray,
    marginBottom: 4,
  },
  suggestedPrice: {
    fontSize: 14,
    fontWeight: '700',
    color: theme.colors.primary,
  },
});

