// components/molecules/ProductCard.tsx - Reusable Product Card
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../utils/theme';

interface ProductCardProps {
  id: string;
  imageUrl?: string;
  title: string;
  location: string;
  price: string;
  likes: number;
  views: number;
  comments: number;
  status?: 'available' | 'sold';
  onPress?: () => void;
}

const ProductCard: React.FC<ProductCardProps> = React.memo(
  ({ imageUrl, title, location, price, likes, views, comments, status = 'available', onPress }) => {
    const handleLike = () => { console.log('like'); }; // Placeholder
    const handleView = () => { console.log('view'); }; // Placeholder
    const handleComment = () => { console.log('comment'); }; // Placeholder

    const getStatusConfig = () => {
      switch (status) {
        case 'sold':
          return {
            text: 'Vendu',
            backgroundColor: '#FF3B30',
            textColor: '#FFFFFF',
            icon: 'check-circle'
          };
        case 'available':
        default:
          return {
            text: 'Disponible',
            backgroundColor: '#34C759',
            textColor: '#FFFFFF',
            icon: 'circle'
          };
      }
    };

    const statusConfig = getStatusConfig();

    return (
      <TouchableOpacity style={styles.container} onPress={onPress}>
        <View style={styles.contentContainer}>
          {imageUrl && (
            <View style={styles.imageContainer}>
              <Image
                source={{ uri: imageUrl }}
                style={styles.image}
                resizeMode="cover"
              />
              {/* Status Badge */}
              <View style={[styles.statusBadge, { backgroundColor: statusConfig.backgroundColor }]}>
                <Icon name={statusConfig.icon} size={12} color={statusConfig.textColor} />
                <Text style={[styles.statusText, { color: statusConfig.textColor }]}>
                  {statusConfig.text}
                </Text>
              </View>
            </View>
          )}
          <View style={styles.content}>
            <View>
              <Text style={styles.title} numberOfLines={2}>{title}</Text>
              <Text style={styles.location} numberOfLines={1}>{location}</Text>
              <Text style={styles.price}>{price}</Text>
            </View>
          </View>
        </View>
        <View style={styles.actions}>
          <TouchableOpacity style={styles.actionIcon} onPress={handleLike}>
            <Icon name="favorite-border" size={14} color="#666" />
            <Text style={styles.iconText}>{likes}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} onPress={handleView}>
            <Icon name="visibility" size={14} color="#666" />
            <Text style={styles.iconText}>{views}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.actionIcon} onPress={handleComment}>
            <Icon name="chat-bubble-outline" size={14} color="#666" />
            <Text style={styles.iconText}>{comments}</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  },
  (prev, next) =>
    prev.title === next.title &&
    prev.location === next.location &&
    prev.price === next.price &&
    prev.likes === next.likes &&
    prev.views === next.views &&
    prev.comments === next.comments
);

ProductCard.displayName = 'ProductCard';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'column',
    backgroundColor: theme.colors.white,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.sm,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    paddingVertical: theme.spacing.md,
  },
  contentContainer: {
    flexDirection: 'row',
  },
  image: {
    width: 120,
    height: 120,
    borderRadius: 8,
    marginRight: theme.spacing.md,
  },
  imageContainer: {
    position: 'relative',
  },
  statusBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 2,
    lineHeight: 18,
  },
  location: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  price: {
    fontSize: 16,
    fontWeight: '700',
    color: theme.colors.success,
    marginBottom: 4,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    alignItems: 'center',
    gap: 10,
    marginTop: 4,
  },
  actionIcon: {
    alignItems: 'center',
    flexDirection: 'row',
  },
  iconText: {
    fontSize: 11,
    color: '#666',
    marginLeft: 4,
  },
});

export default ProductCard;