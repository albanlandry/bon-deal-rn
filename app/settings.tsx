// app/settings.tsx - Settings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

interface SettingsItem {
  id: string;
  title: string;
  icon: string;
  hasArrow: boolean;
  route?: string;
  onPress?: () => void;
  isDestructive?: boolean;
}

const settingsSections: { title: string; items: SettingsItem[] }[] = [
  {
    title: 'Préférences',
    items: [
      {
        id: 'notifications',
        title: 'Notifications',
        icon: 'notifications-outline',
        hasArrow: true,
        route: '/notification-settings',
      },
      {
        id: 'privacy',
        title: 'Confidentialité',
        icon: 'shield-outline',
        hasArrow: true,
        route: '/privacy-settings',
      },
    ],
  },
  {
    title: 'Support',
    items: [
      {
        id: 'help',
        title: 'Aide & Support',
        icon: 'help-circle-outline',
        hasArrow: true,
        route: '/help-support',
      },
      {
        id: 'about',
        title: 'À propos',
        icon: 'information-circle-outline',
        hasArrow: true,
        onPress: () => {
          // TODO: Show about modal or screen
        },
      },
    ],
  },
  {
    title: 'Compte',
    items: [
      {
        id: 'logout',
        title: 'Se déconnecter',
        icon: 'log-out-outline',
        hasArrow: false,
        isDestructive: true,
        onPress: () => {
          // TODO: Handle logout
        },
      },
    ],
  },
];

export default function SettingsScreen() {
  const router = useRouter();

  const handleItemPress = (item: SettingsItem) => {
    if (item.onPress) {
      item.onPress();
    } else if (item.route) {
      router.push(item.route as any);
    }
  };

  const renderSettingsItem = (item: SettingsItem) => (
    <TouchableOpacity
      key={item.id}
      style={styles.settingsItem}
      onPress={() => handleItemPress(item)}>
      <View style={styles.settingsItemLeft}>
        <View style={styles.settingsIconContainer}>
          <Ionicons
            name={item.icon as any}
            size={20}
            color={item.isDestructive ? '#FF3B30' : theme.colors.gray}
          />
        </View>
        <Text style={[styles.settingsItemTitle, item.isDestructive && styles.destructiveText]}>
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
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Paramètres</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsContainer}>
              {section.items.map(renderSettingsItem)}
            </View>
          </View>
        ))}

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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  section: {
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: theme.spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    paddingBottom: theme.spacing.xl + 20,
  },
  versionText: {
    fontSize: 12,
    color: theme.colors.gray,
  },
});

