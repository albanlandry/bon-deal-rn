// app/(tabs)/chat.tsx - Chat Tab Screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
    FlatList,
    Image,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../../utils/theme';

interface ChatItem {
    id: string;
    username: string;
    timestamp: string;
    messagePreview: string;
    hasImage: boolean;
    imageUrl?: string;
}

const mockChatData: ChatItem[] = [
    {
        id: '1',
        username: 'malbanjunior',
        timestamp: 'Il y\'a 30 min',
        messagePreview: 'Lorem ipsum dolor sit amet, consete...',
        hasImage: false,
    },
    {
        id: '2',
        username: 'mbmk92',
        timestamp: 'Il y\'a 1 jour',
        messagePreview: 'Lorem ipsum dolor sit amet...',
        hasImage: true,
        imageUrl: 'https://via.placeholder.com/50x40/cccccc/666666?text=Laptop',
    },
    {
        id: '3',
        username: 'malbanjunior',
        timestamp: 'Il y\'a 30 min',
        messagePreview: 'Lorem ipsum dolor sit amet, consete...',
        hasImage: false,
    },
    {
        id: '4',
        username: 'mbmk92',
        timestamp: 'Il y\'a 1 jour',
        messagePreview: 'Lorem ipsum dolor sit amet...',
        hasImage: true,
        imageUrl: 'https://via.placeholder.com/50x40/cccccc/666666?text=Laptop',
    },
    {
        id: '5',
        username: 'malbanjunior',
        timestamp: 'Il y\'a 30 min',
        messagePreview: 'Lorem ipsum dolor sit amet, consete...',
        hasImage: false,
    },
    {
        id: '6',
        username: 'mbmk92',
        timestamp: 'Il y\'a 1 jour',
        messagePreview: 'Lorem ipsum dolor sit amet...',
        hasImage: true,
        imageUrl: 'https://via.placeholder.com/50x40/cccccc/666666?text=Laptop',
    },
];

const ChatItemComponent = ({ item }: { item: ChatItem }) => (
    <TouchableOpacity 
        style={styles.chatItem}
        onPress={() => router.push({
            pathname: '/chatroom',
            params: { 
                userName: item.username,
                userId: item.id 
            }
        })}
    >
        <View style={styles.profileContainer}>
            <View style={styles.profilePicture}>
                <Ionicons name="person-outline" size={24} color="#000" />
            </View>
        </View>
        
        <View style={styles.messageContainer}>
            <View style={styles.messageHeader}>
                <Text style={styles.username}>{item.username}</Text>
                <Text style={styles.timestamp}> - {item.timestamp}</Text>
            </View>
            <Text style={styles.messagePreview} numberOfLines={1}>
                {item.messagePreview}
            </Text>
        </View>
        
        {item.hasImage && (
            <View style={styles.thumbnailContainer}>
                <Image 
                    source={{ uri: item.imageUrl }} 
                    style={styles.thumbnail}
                    resizeMode="cover"
                />
            </View>
        )}
    </TouchableOpacity>
);

const StatusBarComponent = () => (
    <View style={styles.statusBar}>
        <Text style={styles.timeText}>9:41</Text>
        <View style={styles.statusIcons}>
            <Ionicons name="cellular-outline" size={16} color="#000" />
            <Ionicons name="wifi-outline" size={16} color="#000" />
            <Ionicons name="battery-full-outline" size={16} color="#000" />
            <Ionicons name="notifications-outline" size={16} color="#000" />
        </View>
    </View>
);

export default function ChatScreen() {
    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="#fff" />
            <StatusBarComponent />
            
            <FlatList
                data={mockChatData}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => <ChatItemComponent item={item} />}
                style={styles.chatList}
                showsVerticalScrollIndicator={false}
            />
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.white,
    },
    statusBar: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.white,
    },
    timeText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#000',
    },
    statusIcons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    chatList: {
        flex: 1,
    },
    chatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    profileContainer: {
        marginRight: theme.spacing.md,
    },
    profilePicture: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
    },
    messageContainer: {
        flex: 1,
        marginRight: theme.spacing.sm,
    },
    messageHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 2,
    },
    username: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    timestamp: {
        fontSize: 14,
        color: '#999',
    },
    messagePreview: {
        fontSize: 14,
        color: '#000',
        lineHeight: 18,
    },
    thumbnailContainer: {
        marginLeft: theme.spacing.sm,
    },
    thumbnail: {
        width: 50,
        height: 40,
        borderRadius: 8,
        backgroundColor: '#f0f0f0',
    },
});
