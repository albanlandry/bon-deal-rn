// app/notifications.tsx - Notifications Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    Alert,
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

// Notification types
type NotificationType = 'message' | 'like' | 'view' | 'sale' | 'system' | 'offer';

interface Notification {
    id: string;
    type: NotificationType;
    title: string;
    message: string;
    timestamp: string;
    isRead: boolean;
    avatar?: string;
    productImage?: string;
    actionData?: any;
}

// Mock notification data
const mockNotifications: Notification[] = [
    {
        id: '1',
        type: 'message',
        title: 'Nouveau message',
        message: 'Marie Claire vous a envoyé un message concernant "Nike Air Max 270"',
        timestamp: 'Il y a 5 min',
        isRead: false,
        avatar: 'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&crop=center',
    },
    {
        id: '2',
        type: 'like',
        title: 'Nouveau like',
        message: 'Paul Mba a aimé votre annonce "iPhone 12 Pro Max"',
        timestamp: 'Il y a 15 min',
        isRead: false,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    },
    {
        id: '3',
        type: 'view',
        title: 'Vue sur votre annonce',
        message: 'Sarah Nguema a consulté votre annonce "Sac à dos Adidas Originals"',
        timestamp: 'Il y a 1h',
        isRead: true,
        avatar: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    },
    {
        id: '4',
        type: 'sale',
        title: 'Vente confirmée !',
        message: 'Félicitations ! Vous avez vendu "Macbook Pro 2020" à Jean Baptiste',
        timestamp: 'Il y a 2h',
        isRead: true,
        avatar: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1517336714731-489689fd1ca8?w=300&h=200&fit=crop&crop=center',
    },
    {
        id: '5',
        type: 'offer',
        title: 'Nouvelle offre',
        message: 'David Mve a fait une offre de 150000 FCFA pour "Vélo électrique Xiaomi"',
        timestamp: 'Il y a 3h',
        isRead: false,
        avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    },
    {
        id: '6',
        type: 'system',
        title: 'Mise à jour disponible',
        message: 'Une nouvelle version de BonDeal est disponible. Mettez à jour maintenant !',
        timestamp: 'Il y a 1 jour',
        isRead: true,
    },
    {
        id: '7',
        type: 'message',
        title: 'Nouveau message',
        message: 'Fatou Diallo vous a envoyé un message concernant "Livre scolaire"',
        timestamp: 'Il y a 2 jours',
        isRead: true,
        avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&h=150&fit=crop&crop=face',
        productImage: 'https://images.unsplash.com/photo-1586023492125-27b2c045efd7?w=300&h=200&fit=crop&crop=center',
    },
];

export default function NotificationsScreen() {
    const [notifications, setNotifications] = useState(mockNotifications);
    const [isLoading, setIsLoading] = useState(true);
    const router = useRouter();

    // Simulate initial data loading
    React.useEffect(() => {
        const loadData = async () => {
            setIsLoading(true);
            // Simulate API call delay
            await new Promise(resolve => setTimeout(resolve, 1000));
            setIsLoading(false);
        };
        
        loadData();
    }, []);

    // Get icon for notification type
    const getNotificationIcon = (type: NotificationType) => {
        switch (type) {
            case 'message':
                return 'chatbubble-outline';
            case 'like':
                return 'heart-outline';
            case 'view':
                return 'eye-outline';
            case 'sale':
                return 'checkmark-circle-outline';
            case 'offer':
                return 'cash-outline';
            case 'system':
                return 'settings-outline';
            default:
                return 'notifications-outline';
        }
    };

    // Get icon color for notification type
    const getNotificationIconColor = (type: NotificationType) => {
        switch (type) {
            case 'message':
                return theme.colors.primary;
            case 'like':
                return '#E91E63';
            case 'view':
                return '#FF9800';
            case 'sale':
                return theme.colors.success;
            case 'offer':
                return '#9C27B0';
            case 'system':
                return theme.colors.gray;
            default:
                return theme.colors.gray;
        }
    };

    // Mark notification as read
    const markAsRead = (id: string) => {
        setNotifications(prev => 
            prev.map(notif => 
                notif.id === id ? { ...notif, isRead: true } : notif
            )
        );
    };

    // Delete notification
    const deleteNotification = (id: string) => {
        Alert.alert(
            'Supprimer la notification',
            'Êtes-vous sûr de vouloir supprimer cette notification ?',
            [
                { text: 'Annuler', style: 'cancel' },
                { 
                    text: 'Supprimer', 
                    style: 'destructive',
                    onPress: () => {
                        setNotifications(prev => prev.filter(notif => notif.id !== id));
                    }
                }
            ]
        );
    };

    // Mark all as read
    const markAllAsRead = () => {
        setNotifications(prev => 
            prev.map(notif => ({ ...notif, isRead: true }))
        );
    };

    // Handle notification press
    const handleNotificationPress = (notification: Notification) => {
        if (!notification.isRead) {
            markAsRead(notification.id);
        }
        
        // Navigate based on notification type
        switch (notification.type) {
            case 'message':
                router.push('/chatroom');
                break;
            case 'like':
            case 'view':
            case 'sale':
            case 'offer':
                router.push('/item-details');
                break;
            case 'system':
                // Handle system notification
                console.log('System notification pressed');
                break;
        }
    };

    // Render skeleton notification item
    const renderSkeletonNotification = () => (
        <View style={styles.notificationItem}>
            <View style={styles.notificationContent}>
                <View style={styles.skeletonIconContainer} />
                <View style={styles.textContent}>
                    <View style={styles.titleRow}>
                        <View style={styles.skeletonTitle} />
                        <View style={styles.skeletonTimestamp} />
                    </View>
                    <View style={styles.skeletonMessage} />
                </View>
                <View style={styles.skeletonImage} />
            </View>
        </View>
    );

    // Render notification item
    const renderNotification = ({ item }: { item: Notification }) => (
        <TouchableOpacity 
            style={[
                styles.notificationItem,
                !item.isRead && styles.unreadNotification
            ]}
            onPress={() => handleNotificationPress(item)}
        >
            <View style={styles.notificationContent}>
                {/* Icon */}
                <View style={[
                    styles.iconContainer,
                    { backgroundColor: `${getNotificationIconColor(item.type)}15` }
                ]}>
                    <Ionicons 
                        name={getNotificationIcon(item.type) as any} 
                        size={20} 
                        color={getNotificationIconColor(item.type)} 
                    />
                </View>

                {/* Content */}
                <View style={styles.textContent}>
                    <View style={styles.titleRow}>
                        <Text style={[
                            styles.notificationTitle,
                            !item.isRead && styles.unreadTitle
                        ]}>
                            {item.title}
                        </Text>
                        <Text style={styles.timestamp}>{item.timestamp}</Text>
                    </View>
                    <Text style={styles.notificationMessage} numberOfLines={2}>
                        {item.message}
                    </Text>
                </View>

                {/* Product Image or Avatar */}
                {item.productImage && (
                    <Image 
                        source={{ uri: item.productImage }} 
                        style={styles.productImage}
                        resizeMode="cover"
                    />
                )}
                {item.avatar && !item.productImage && (
                    <Image 
                        source={{ uri: item.avatar }} 
                        style={styles.avatarImage}
                        resizeMode="cover"
                    />
                )}

                {/* Unread indicator */}
                {!item.isRead && <View style={styles.unreadIndicator} />}
            </View>

            {/* Action buttons */}
            <View style={styles.actionButtons}>
                {!item.isRead && (
                    <TouchableOpacity 
                        style={styles.actionButton}
                        onPress={() => markAsRead(item.id)}
                    >
                        <Ionicons name="checkmark" size={16} color={theme.colors.success} />
                    </TouchableOpacity>
                )}
                <TouchableOpacity 
                    style={styles.actionButton}
                    onPress={() => deleteNotification(item.id)}
                >
                    <Ionicons name="trash-outline" size={16} color="#FF3B30" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );

    // Get unread count
    const unreadCount = notifications.filter(notif => !notif.isRead).length;

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor={theme.colors.white} />
            
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
                    <Ionicons name="chevron-back" size={24} color={theme.colors.gray} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Notifications</Text>
                {unreadCount > 0 && (
                    <TouchableOpacity style={styles.markAllButton} onPress={markAllAsRead}>
                        <Text style={styles.markAllText}>Tout marquer</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Notifications List */}
            <FlatList
                data={isLoading ? Array(5).fill({}) : notifications}
                renderItem={isLoading ? renderSkeletonNotification : renderNotification}
                keyExtractor={(item, index) => isLoading ? `skeleton-${index}` : item.id}
                contentContainerStyle={styles.listContainer}
                showsVerticalScrollIndicator={false}
                ItemSeparatorComponent={() => <View style={styles.separator} />}
                ListEmptyComponent={
                    !isLoading ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="notifications-off-outline" size={64} color={theme.colors.gray} />
                            <Text style={styles.emptyTitle}>Aucune notification</Text>
                            <Text style={styles.emptyMessage}>
                                Vous recevrez des notifications ici quand quelqu'un interagit avec vos annonces.
                            </Text>
                        </View>
                    ) : null
                }
            />
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
        backgroundColor: theme.colors.white,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.grayLight,
    },
    backButton: {
        padding: theme.spacing.sm,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: '#333',
        flex: 1,
        textAlign: 'center',
    },
    markAllButton: {
        padding: theme.spacing.sm,
    },
    markAllText: {
        fontSize: 14,
        color: theme.colors.primary,
        fontWeight: '600',
    },
    listContainer: {
        paddingBottom: theme.spacing.lg,
    },
    notificationItem: {
        backgroundColor: theme.colors.white,
        paddingHorizontal: theme.spacing.lg,
        paddingVertical: theme.spacing.md,
    },
    unreadNotification: {
        backgroundColor: '#F8F9FA',
    },
    notificationContent: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.md,
    },
    textContent: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    titleRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 4,
    },
    notificationTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        flex: 1,
    },
    unreadTitle: {
        fontWeight: '700',
    },
    timestamp: {
        fontSize: 12,
        color: theme.colors.gray,
        marginLeft: theme.spacing.sm,
    },
    notificationMessage: {
        fontSize: 14,
        color: '#666',
        lineHeight: 18,
    },
    productImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
    },
    avatarImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
    },
    unreadIndicator: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: theme.colors.primary,
    },
    actionButtons: {
        flexDirection: 'row',
        marginTop: theme.spacing.sm,
        justifyContent: 'flex-end',
    },
    actionButton: {
        padding: theme.spacing.sm,
        marginLeft: theme.spacing.sm,
    },
    separator: {
        height: 1,
        backgroundColor: theme.colors.grayLight,
        marginLeft: theme.spacing.lg,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.xl,
        paddingVertical: theme.spacing.xxl,
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
        lineHeight: 20,
    },
    // Skeleton loading styles
    skeletonIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E0E0E0',
        marginRight: theme.spacing.md,
    },
    skeletonTitle: {
        height: 16,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        width: '60%',
        marginBottom: 4,
    },
    skeletonTimestamp: {
        height: 12,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        width: '30%',
    },
    skeletonMessage: {
        height: 14,
        backgroundColor: '#E0E0E0',
        borderRadius: 4,
        width: '90%',
    },
    skeletonImage: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: '#E0E0E0',
    },
});
