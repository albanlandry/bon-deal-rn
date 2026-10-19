import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import { Platform, Pressable, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackInterval } from '@/contexts/RealtimeContext';
import { conversationsQuery } from '@/lib/api/conversations';
import { totalUnread } from '@/lib/chatCache';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(active: IconName, inactive: IconName) {
  return ({ color, focused }: { color: string; focused: boolean }) => (
    <Ionicons name={focused ? active : inactive} size={24} color={color} />
  );
}

/**
 * Bottom tabs: Accueil (first) and Profil (last) anchor the bar (serial
 * position); "Vendre" sits in the centre, emphasised by shape (a raised
 * coral button), not by position.
 */
export default function TabLayout() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isAuthenticated, user } = useAuth();
  // Unread badge: kept live by the realtime provider; polls only while the
  // socket is disconnected.
  const pollMs = useFallbackInterval(30_000);
  const { data: conversations } = useQuery({
    ...conversationsQuery(),
    enabled: isAuthenticated,
    refetchInterval: pollMs,
  });
  const unread = totalUnread(conversations);

  // Legal consent gate: the current terms / privacy versions must be
  // accepted before using the app (server-reported, see /consent).
  if (user?.consent_required?.length) return <Redirect href="/consent" />;

  return (
    <Tabs
      initialRouteName="home"
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.colors.brandStrong,
        tabBarInactiveTintColor: t.colors.inkMuted,
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopColor: t.colors.line,
          height: 64 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 6,
        },
        tabBarBadgeStyle: {
          backgroundColor: t.colors.brand,
          color: t.colors.onBrand,
          fontSize: 11,
          fontWeight: '700',
        },
      }}>
      <Tabs.Screen
        name="home"
        options={{ title: 'Accueil', tabBarIcon: tabIcon('home', 'home-outline') }}
      />
      <Tabs.Screen
        name="favorites"
        options={{ title: 'Favoris', tabBarIcon: tabIcon('heart', 'heart-outline') }}
      />
      <Tabs.Screen
        name="sell"
        options={{
          title: 'Vendre',
          tabBarAccessibilityLabel: 'Vendre un article',
          tabBarButton: (props) => (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Vendre un article"
              onPress={() => {
                haptics.light();
                router.push('/post-item');
              }}
              style={styles.sellWrap}
              testID={props.testID}>
              <View
                style={[
                  styles.sellButton,
                  { backgroundColor: t.colors.brand, borderColor: t.colors.surface },
                  Platform.select({ android: { elevation: 4 }, default: t.elevation.card as object }),
                ]}>
                <Ionicons name="add" size={30} color={t.colors.onBrand} />
              </View>
              <AppText variant="captionStrong" style={{ color: t.colors.ink, marginTop: 2 }}>
                Vendre
              </AppText>
            </Pressable>
          ),
        }}
      />
      <Tabs.Screen
        name="chat"
        options={{
          title: 'Messages',
          tabBarIcon: tabIcon('chatbubbles', 'chatbubbles-outline'),
          tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{ title: 'Profil', tabBarIcon: tabIcon('person', 'person-outline') }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  sellWrap: { flex: 1, alignItems: 'center', justifyContent: 'flex-start' },
  sellButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    borderWidth: 4,
    marginTop: -22,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
