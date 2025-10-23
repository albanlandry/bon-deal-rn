// app/chatroom.tsx - Chatroom Screen
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useState } from 'react';
import {
    FlatList,
    KeyboardAvoidingView,
    Platform,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

interface Message {
    id: string;
    text: string;
    timestamp: string;
    isSent: boolean;
    senderName?: string;
}

interface ChatroomProps {
    userId?: string;
    userName?: string;
}

const dummyMessages: Message[] = [
    {
        id: '1',
        text: 'Salut! Comment ça va?',
        timestamp: '14:30',
        isSent: false,
        senderName: 'malbanjunior',
    },
    {
        id: '2',
        text: 'Salut! Ça va bien merci, et toi?',
        timestamp: '14:32',
        isSent: true,
    },
    {
        id: '3',
        text: 'Très bien aussi! Tu as vu le nouveau produit sur le site?',
        timestamp: '14:33',
        isSent: false,
        senderName: 'malbanjunior',
    },
    {
        id: '4',
        text: 'Oui, il a l\'air intéressant. Tu penses l\'acheter?',
        timestamp: '14:35',
        isSent: true,
    },
    {
        id: '5',
        text: 'Je réfléchis encore. Le prix est un peu élevé pour moi.',
        timestamp: '14:36',
        isSent: false,
        senderName: 'malbanjunior',
    },
    {
        id: '6',
        text: 'Je comprends. Peut-être qu\'il y aura une promotion bientôt?',
        timestamp: '14:38',
        isSent: true,
    },
    {
        id: '7',
        text: 'J\'espère! En tout cas, merci pour le conseil.',
        timestamp: '14:40',
        isSent: false,
        senderName: 'malbanjunior',
    },
    {
        id: '8',
        text: 'De rien! N\'hésite pas si tu as d\'autres questions.',
        timestamp: '14:41',
        isSent: true,
    },
];

const MessageBubble = ({ message }: { message: Message }) => (
    <View style={[
        styles.messageContainer,
        message.isSent ? styles.sentMessage : styles.receivedMessage
    ]}>
        <View style={[
            styles.messageBubble,
            message.isSent ? styles.sentBubble : styles.receivedBubble
        ]}>
            <Text style={[
                styles.messageText,
                message.isSent ? styles.sentText : styles.receivedText
            ]}>
                {message.text}
            </Text>
            <Text style={[
                styles.timestamp,
                message.isSent ? styles.sentTimestamp : styles.receivedTimestamp
            ]}>
                {message.timestamp}
            </Text>
        </View>
    </View>
);

const ChatHeader = ({ userName }: { userName?: string }) => (
    <View style={styles.header}>
        <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
        >
            <Ionicons name="arrow-back" size={24} color="#000" />
        </TouchableOpacity>
        
        <View style={styles.userInfo}>
            <View style={styles.profilePicture}>
                <Ionicons name="person-outline" size={20} color="#000" />
            </View>
            <View style={styles.userDetails}>
                <Text style={styles.userName}>{userName || 'malbanjunior'}</Text>
                <Text style={styles.userStatus}>En ligne</Text>
            </View>
        </View>
        
        <TouchableOpacity style={styles.moreButton}>
            <Ionicons name="ellipsis-vertical" size={20} color="#000" />
        </TouchableOpacity>
    </View>
);

const MessageInput = ({ onSendMessage }: { onSendMessage: (text: string) => void }) => {
    const [messageText, setMessageText] = useState('');

    const handleSend = () => {
        if (messageText.trim()) {
            onSendMessage(messageText.trim());
            setMessageText('');
        }
    };

    return (
        <View style={styles.inputContainer}>
            <TouchableOpacity style={styles.attachButton}>
                <Ionicons name="attach" size={24} color="#666" />
            </TouchableOpacity>
            
            <TextInput
                style={styles.textInput}
                placeholder="Tapez un message..."
                value={messageText}
                onChangeText={setMessageText}
                multiline
                maxLength={500}
            />
            
            <TouchableOpacity 
                style={styles.sendButton}
                onPress={handleSend}
                disabled={!messageText.trim()}
            >
                <Ionicons 
                    name="send" 
                    size={20} 
                    color={messageText.trim() ? theme.colors.primary : '#ccc'} 
                />
            </TouchableOpacity>
        </View>
    );
};

export default function ChatroomScreen() {
    const [messages, setMessages] = useState<Message[]>(dummyMessages);

    const handleSendMessage = (text: string) => {
        const newMessage: Message = {
            id: Date.now().toString(),
            text,
            timestamp: new Date().toLocaleTimeString('fr-FR', { 
                hour: '2-digit', 
                minute: '2-digit' 
            }),
            isSent: true,
        };
        setMessages(prev => [...prev, newMessage]);
    };

    return (
        <SafeAreaView style={styles.container}>
            <ChatHeader userName="malbanjunior" />
            
            <KeyboardAvoidingView 
                style={styles.chatContainer}
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            >
                <FlatList
                    data={messages}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => <MessageBubble message={item} />}
                    style={styles.messagesList}
                    contentContainerStyle={styles.messagesContent}
                    showsVerticalScrollIndicator={false}
                />
                
                <MessageInput onSendMessage={handleSendMessage} />
            </KeyboardAvoidingView>
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
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        marginTop: theme.spacing.sm,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        backgroundColor: theme.colors.white,
    },
    backButton: {
        marginRight: theme.spacing.md,
    },
    userInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
    },
    profilePicture: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#f5f5f5',
        borderWidth: 1,
        borderColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: theme.spacing.sm,
    },
    userDetails: {
        flex: 1,
    },
    userName: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#000',
    },
    userStatus: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    moreButton: {
        padding: theme.spacing.sm,
    },
    chatContainer: {
        flex: 1,
    },
    messagesList: {
        flex: 1,
    },
    messagesContent: {
        paddingVertical: theme.spacing.md,
    },
    messageContainer: {
        marginHorizontal: theme.spacing.md,
        marginVertical: 2,
    },
    sentMessage: {
        alignItems: 'flex-end',
    },
    receivedMessage: {
        alignItems: 'flex-start',
    },
    messageBubble: {
        maxWidth: '80%',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderRadius: 18,
    },
    sentBubble: {
        backgroundColor: theme.colors.primary,
        borderBottomRightRadius: 4,
    },
    receivedBubble: {
        backgroundColor: '#f0f0f0',
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 16,
        lineHeight: 20,
    },
    sentText: {
        color: '#fff',
    },
    receivedText: {
        color: '#000',
    },
    timestamp: {
        fontSize: 12,
        marginTop: 4,
    },
    sentTimestamp: {
        color: 'rgba(255, 255, 255, 0.7)',
        textAlign: 'right',
    },
    receivedTimestamp: {
        color: '#666',
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'flex-end',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        backgroundColor: theme.colors.white,
        borderTopWidth: 1,
        borderTopColor: '#f0f0f0',
    },
    attachButton: {
        padding: theme.spacing.sm,
        marginRight: theme.spacing.sm,
    },
    textInput: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#e0e0e0',
        borderRadius: 20,
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        fontSize: 16,
        maxHeight: 100,
        backgroundColor: '#f9f9f9',
    },
    sendButton: {
        padding: theme.spacing.sm,
        marginLeft: theme.spacing.sm,
    },
});
