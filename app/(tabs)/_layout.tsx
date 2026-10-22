import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Redirect, Tabs, useRouter } from 'expo-router';
import React from 'react';
import AnimatedTabBar from '@/components/motion/AnimatedTabBar';
import { ScrollChromeProvider } from '@/components/motion/ScrollChrome';
import { useAuth } from '@/contexts/AuthContext';
import { useFallbackInterval } from '@/contexts/RealtimeContext';
import { conversationsQuery } from '@/lib/api/conversations';
import { totalUnread } from '@/lib/chatCache';
import { useTheme } from '@/theme';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

const TAB_ICONS: Record<string, [IconName, IconName]> = {
  home: ['home', 'home-outline'],
  search: ['search', 'search-outline'],
  chat: ['chatbubbles', 'chatbubbles-outline'],
  profile: ['person', 'person-outline'],
};

/**
 * Bottom tabs (docs/11 §4.1): Accueil · Rechercher · Vendre · Messages · Moi.
 * Accueil (first) and Moi (last) anchor the bar; "Vendre" sits in the
 * centre, emphasised by shape (a raised button), not by position. Favoris
 * left the bar: it is the /favorites stack screen under Moi (old
 * `/(tabs)/favorites` links are redirected by +not-found). The bar is
 * `AnimatedTabBar`: labelled tabs, a sliding pill on the active one, hides
 * on scroll (docs/09 §2).
 */
export default function TabLayout() {
  const t = useTheme();
  const router = useRouter();
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
    <ScrollChromeProvider>
      <Tabs
        initialRouteName="home"
        tabBar={(props) => (
          <AnimatedTabBar
            {...props}
            icons={TAB_ICONS}
            centerRoute="sell"
            onCenterPress={() => router.push('/post-item')}
          />
        )}
        screenOptions={{
          headerShown: false,
          animation: t.reduceMotion ? 'none' : 'shift',
          sceneStyle: { backgroundColor: t.colors.canvas },
        }}>
        <Tabs.Screen name="home" options={{ title: 'Accueil' }} />
        <Tabs.Screen name="search" options={{ title: 'Rechercher', tabBarAccessibilityLabel: 'Rechercher une annonce' }} />
        <Tabs.Screen name="sell" options={{ title: 'Vendre', tabBarAccessibilityLabel: 'Vendre un article' }} />
        <Tabs.Screen
          name="chat"
          options={{
            title: 'Messages',
            tabBarBadge: unread > 0 ? (unread > 99 ? '99+' : unread) : undefined,
          }}
        />
        <Tabs.Screen name="profile" options={{ title: 'Moi', tabBarAccessibilityLabel: 'Moi, mon compte' }} />
      </Tabs>
    </ScrollChromeProvider>
  );
}
