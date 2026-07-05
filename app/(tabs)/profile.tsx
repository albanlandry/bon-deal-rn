// app/(tabs)/profile.tsx - User Profile Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import {
    Alert,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { theme } from '../../utils/theme';
import { useAuth } from '@/contexts/AuthContext';
import { myPostsQuery, likedPostsQuery } from '@/lib/api/posts';

/** created_at ISO → "Mois AAAA" (French), or null. */
function memberSinceLabel(iso: string | null | undefined): string | null {
    if (!iso) return null;
    const d = new Date(iso);
    if (isNaN(d.getTime())) return null;
    return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
}

const settingsItems = [
    {
        id: 'edit-profile',
        title: 'Modifier le profil',
        icon: 'person-outline',
        hasArrow: true
    },
    {
        id: 'notifications',
        title: 'Notifications',
        icon: 'notifications-outline',
        hasArrow: true
    },
    {
        id: 'privacy',
        title: 'Confidentialité',
        icon: 'shield-outline',
        hasArrow: true
    },
    {
        id: 'help',
        title: 'Aide & Support',
        icon: 'help-circle-outline',
        hasArrow: true
    },
    {
        id: 'about',
        title: 'À propos',
        icon: 'information-circle-outline',
        hasArrow: true
    },
    {
        id: 'logout',
        title: 'Se déconnecter',
        icon: 'log-out-outline',
        hasArrow: false,
        isDestructive: true
    }
];

export default function ProfileScreen() {
    const router = useRouter();
    const { user, signOut } = useAuth();

    const mine = useQuery(myPostsQuery());
    const liked = useQuery(likedPostsQuery());

    const listingsCount = mine.data?.total_posts ?? 0;
    const soldCount = (mine.data?.posts ?? []).filter((p) => p.state === 'sold').length;
    const favCount = liked.data?.total_posts ?? 0;
    const ratingLabel = user?.avg_rating != null ? user.avg_rating.toFixed(1) : '—';

    const displayName =
        [user?.first_name, user?.last_name].filter(Boolean).join(' ') ||
        user?.username ||
        'Utilisateur';
    const displayLocation =
        [user?.quartier, user?.city].filter(Boolean).join(', ') || 'Localisation non définie';
    const memberSince = memberSinceLabel(user?.created_at);
    const avatarUri = user?.avatar_url || undefined;

    const profileMenuItems = [
        { id: 'my-listings', title: 'Mes annonces', icon: 'list-outline', count: String(listingsCount), color: theme.colors.primary },
        { id: 'favorites', title: 'Favoris', icon: 'heart-outline', count: String(favCount), color: '#E91E63' },
        { id: 'sold-items', title: 'Vendus', icon: 'checkmark-circle-outline', count: String(soldCount), color: theme.colors.success },
        { id: 'reviews', title: 'Avis', icon: 'star-outline', count: ratingLabel, color: '#FF9800' },
    ];

    const handleMenuPress = (itemId: string) => {
        switch (itemId) {
            case 'my-listings':
                router.push('/my-listings');
                break;
            case 'favorites':
                router.push('/(tabs)/favorites');
                break;
            case 'sold-items':
                router.push('/my-listings');
                break;
            case 'reviews':
                // TODO: Navigate to reviews screen when implemented
                console.log('Navigate to Reviews');
                break;
            default:
                console.log('Menu item pressed:', itemId);
        }
    };

    const handleSettingsPress = (itemId: string) => {
        switch (itemId) {
            case 'edit-profile':
                router.push('/edit-profile');
                break;
            case 'notifications':
                router.push('/settings');
                break;
            case 'privacy':
                router.push('/settings');
                break;
            case 'help':
                router.push('/help-support');
                break;
            case 'about':
                // TODO: Show about modal
                console.log('Navigate to About');
                break;
            case 'logout':
                Alert.alert(
                    'Se déconnecter',
                    'Êtes-vous sûr de vouloir vous déconnecter ?',
                    [
                        { text: 'Annuler', style: 'cancel' },
                        {
                            text: 'Se déconnecter',
                            style: 'destructive',
                            onPress: async () => {
                                await signOut();
                                router.replace('/login');
                            },
                        },
                    ]
                );
                break;
            default:
                console.log('Settings item pressed:', itemId);
        }
    };

    const renderMenuGrid = () => (
        <View style={styles.menuGrid}>
            {profileMenuItems.map((item) => (
                <TouchableOpacity
                    key={item.id}
                    style={styles.menuItem}
                    onPress={() => handleMenuPress(item.id)}
                >
                    <View style={[styles.menuIconContainer, { backgroundColor: `${item.color}15` }]}>
                        <Ionicons name={item.icon as any} size={24} color={item.color} />
                    </View>
                    <Text style={styles.menuItemTitle}>{item.title}</Text>
                    <Text style={styles.menuItemCount}>{item.count}</Text>
                </TouchableOpacity>
            ))}
        </View>
    );

    const renderSettingsItem = (item: any) => (
        <TouchableOpacity
            key={item.id}
            style={styles.settingsItem}
            onPress={() => handleSettingsPress(item.id)}
        >
            <View style={styles.settingsItemLeft}>
                <View style={styles.settingsIconContainer}>
                    <Ionicons 
                        name={item.icon as any} 
                        size={20} 
                        color={item.isDestructive ? '#FF3B30' : theme.colors.gray} 
                    />
                </View>
                <Text style={[
                    styles.settingsItemTitle,
                    item.isDestructive && styles.destructiveText
                ]}>
                    {item.title}
                </Text>
            </View>
            {item.hasArrow && (
                <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
            )}
        </TouchableOpacity>
    );

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
            
            <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
                {/* Header */}
                <View style={styles.header}>
                    <Text style={styles.headerTitle}>Profil</Text>
                    <TouchableOpacity style={styles.settingsButton} onPress={() => router.push('/settings')}>
                        <Ionicons name="settings-outline" size={24} color={theme.colors.gray} />
                    </TouchableOpacity>
                </View>

                {/* User Info Card */}
                <View style={styles.userCard}>
                    <View style={styles.avatarContainer}>
                        {avatarUri ? (
                            <Image source={{ uri: avatarUri }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.avatarFallback]}>
                                <Ionicons name="person" size={36} color={theme.colors.gray} />
                            </View>
                        )}
                    </View>
                    <Text style={styles.userName}>{displayName}</Text>
                    <Text style={styles.userLocation}>{displayLocation}</Text>
                    {memberSince && <Text style={styles.joinDate}>Membre depuis {memberSince}</Text>}
                </View>

                {/* Menu Grid */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Mes activités</Text>
                    {renderMenuGrid()}
                </View>

                {/* Settings */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Paramètres</Text>
                    <View style={styles.settingsContainer}>
                        {settingsItems.map(renderSettingsItem)}
                    </View>
                </View>

                {/* App Version */}
                <View style={styles.versionContainer}>
                    <Text style={styles.versionText}>BonDeal v1.0.0</Text>
                </View>
            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    scrollView: {
        flex: 1,
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
        fontSize: 24,
        fontWeight: '700',
        color: '#333',
    },
    settingsButton: {
        padding: theme.spacing.sm,
    },
    userCard: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingHorizontal: theme.spacing.lg,
        backgroundColor: theme.colors.white,
        marginHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.md,
        borderRadius: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: theme.spacing.md,
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 40,
        borderWidth: 3,
        borderColor: theme.colors.primary,
    },
    avatarFallback: {
        backgroundColor: '#F0F0F0',
        alignItems: 'center',
        justifyContent: 'center',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: theme.colors.success,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: theme.colors.white,
    },
    userName: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    userLocation: {
        fontSize: 14,
        color: theme.colors.gray,
        marginBottom: 2,
    },
    joinDate: {
        fontSize: 12,
        color: theme.colors.gray,
    },
    section: {
        paddingHorizontal: theme.spacing.lg,
        marginBottom: theme.spacing.lg,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#333',
        marginBottom: theme.spacing.md,
    },
    menuGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
    },
    menuItem: {
        width: '48%',
        backgroundColor: theme.colors.white,
        padding: theme.spacing.md,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: theme.spacing.md,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    menuIconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: theme.spacing.sm,
    },
    menuItemTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        textAlign: 'center',
        marginBottom: 4,
    },
    menuItemCount: {
        fontSize: 16,
        fontWeight: '700',
        color: theme.colors.primary,
    },
    settingsContainer: {
        backgroundColor: theme.colors.white,
        borderRadius: 12,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    settingsItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    settingsItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    settingsIconContainer: {
        width: 32,
        height: 32,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    settingsItemTitle: {
        fontSize: 16,
        color: '#333',
        fontWeight: '500',
    },
    destructiveText: {
        color: '#FF3B30',
    },
    versionContainer: {
        alignItems: 'center',
        paddingVertical: theme.spacing.xl,
        paddingBottom: theme.spacing.xl + 20, // Extra padding for tab bar
    },
    versionText: {
        fontSize: 12,
        color: theme.colors.gray,
    },
});
