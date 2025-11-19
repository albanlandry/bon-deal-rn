// app/(tabs)/index.tsx - Development navigation menu
import { useRouter } from 'expo-router';
import React from 'react';
import {
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Icon from 'react-native-vector-icons/MaterialIcons';
import { theme } from '../../utils/theme';

interface MenuItemProps {
  title: string;
  subtitle?: string;
  icon: string;
  route: string;
  onPress: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({
  title,
  subtitle,
  icon,
  onPress,
}) => (
  <TouchableOpacity style={styles.menuItem} onPress={onPress}>
    <View style={styles.menuItemLeft}>
      <View style={styles.iconContainer}>
        <Icon name={icon} size={24} color={theme.colors.primary} />
      </View>
      <View style={styles.menuItemText}>
        <Text style={styles.menuItemTitle}>{title}</Text>
        {subtitle && <Text style={styles.menuItemSubtitle}>{subtitle}</Text>}
      </View>
    </View>
    <Icon name="chevron-right" size={24} color={theme.colors.gray} />
  </TouchableOpacity>
);

export default function MenuScreen() {
  const router = useRouter();

  const menuSections = [
    {
      title: 'Authentication',
      items: [
        {
          title: 'Login Screen',
          subtitle: 'User login page',
          icon: 'login',
          route: '/login',
        },
        {
          title: 'Signup Screen',
          subtitle: 'User registration page',
          icon: 'person-add',
          route: '/signup',
        },
        {
          title: 'Verify Number',
          subtitle: 'OTP verification',
          icon: 'confirmation-number',
          route: '/verify-number',
        },
        {
          title: 'Setup Profile',
          subtitle: 'Set profile image and nickname',
          icon: 'account-circle',
          route: '/setup-profile',
        },
        {
          title: 'Set Password',
          subtitle: 'Set password after verification',
          icon: 'lock',
          route: '/set-password',
        },
        {
          title: 'Terms & Conditions',
          subtitle: 'User consent screen',
          icon: 'document-text',
          route: '/terms-and-conditions',
        },
      ],
    },
    {
      title: 'Main Screens',
      items: [
        {
          title: 'Home',
          subtitle: 'Product listing',
          icon: 'home',
          route: '/(tabs)/home',
        },
        {
          title: 'Item Details',
          subtitle: 'Product details page',
          icon: 'info',
          route: '/item-details',
        },
        {
          title: 'Post Item',
          subtitle: 'Create new product listing',
          icon: 'add-circle',
          route: '/post-item',
        },
        {
          title: 'Search',
          subtitle: 'Search products',
          icon: 'search',
          route: '/search',
        },
        {
          title: 'Search Results',
          subtitle: 'Filtered search results',
          icon: 'filter-list',
          route: '/search-results',
        },
        {
          title: 'Chat',
          subtitle: 'Messaging list',
          icon: 'chat',
          route: '/(tabs)/chat',
        },
        {
          title: 'Chatroom',
          subtitle: 'Individual chat conversation',
          icon: 'forum',
          route: '/chatroom',
        },
        {
          title: 'Notifications',
          subtitle: 'User notifications',
          icon: 'notifications',
          route: '/notifications',
        },
        {
          title: 'Profile',
          subtitle: 'User profile',
          icon: 'person',
          route: '/(tabs)/profile',
        },
      ],
    },
    {
      title: 'User Management',
      items: [
        {
          title: 'Edit Profile',
          subtitle: 'Edit user profile information',
          icon: 'edit',
          route: '/edit-profile',
        },
        {
          title: 'My Listings',
          subtitle: 'Manage your product listings',
          icon: 'list',
          route: '/my-listings',
        },
        {
          title: 'Favorites',
          subtitle: 'View favorited products',
          icon: 'favorite',
          route: '/(tabs)/favorites',
        },
      ],
    },
    {
      title: 'Settings',
      items: [
        {
          title: 'Settings',
          subtitle: 'Main settings screen',
          icon: 'settings',
          route: '/settings',
        },
        {
          title: 'Notification Settings',
          subtitle: 'Configure notification preferences',
          icon: 'notifications-active',
          route: '/notification-settings',
        },
        {
          title: 'Privacy Settings',
          subtitle: 'Manage privacy preferences',
          icon: 'privacy-tip',
          route: '/privacy-settings',
        },
        {
          title: 'Help & Support',
          subtitle: 'Get help and contact support',
          icon: 'help-outline',
          route: '/help-support',
        },
      ],
    },
    {
      title: 'Other',
      items: [
        {
          title: 'Splash Screen',
          subtitle: 'Animated splash screen',
          icon: 'visibility',
          route: '/splash',
        },
        {
          title: 'Modal',
          subtitle: 'Example modal',
          icon: 'open-in-new',
          route: '/modal',
        },
        {
          title: 'Tab Two',
          subtitle: 'Original tab two',
          icon: 'looks-two',
          route: '/(tabs)/two',
        },
      ],
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Development Menu</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>DEV</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}>
        <Text style={styles.description}>
          Quick navigation to all screens in the app. This menu will be removed
          in production.
        </Text>

        {menuSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            {section.items.map((item, itemIndex) => (
              <MenuItem
                key={itemIndex}
                title={item.title}
                subtitle={item.subtitle}
                icon={item.icon}
                route={item.route}
                onPress={() => router.push(item.route as any)}
              />
            ))}
          </View>
        ))}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            💡 Tip: Use this menu to test all screens during development
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: theme.colors.white,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
  },
  badge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  badgeText: {
    color: theme.colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: theme.spacing.lg,
  },
  description: {
    fontSize: 14,
    color: theme.colors.gray,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    backgroundColor: '#FFF9E6',
    borderLeftWidth: 3,
    borderLeftColor: '#FFD700',
    marginTop: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    borderRadius: 8,
  },
  section: {
    marginTop: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.gray,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: theme.colors.white,
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E3F2FD',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  menuItemText: {
    flex: 1,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 2,
  },
  menuItemSubtitle: {
    fontSize: 13,
    color: theme.colors.gray,
  },
  footer: {
    marginTop: theme.spacing.lg,
    marginHorizontal: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.success,
  },
  footerText: {
    fontSize: 13,
    color: '#2E7D32',
    textAlign: 'center',
  },
});
