// app/notification-settings.tsx - Notification Settings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';

interface NotificationSetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const notificationSettings: NotificationSetting[] = [
  {
    id: 'push',
    title: 'Notifications push',
    description: 'Recevoir des notifications sur votre appareil',
    enabled: true,
  },
  {
    id: 'messages',
    title: 'Nouveaux messages',
    description: 'Notifications quand vous recevez un message',
    enabled: true,
  },
  {
    id: 'likes',
    title: 'Likes sur vos annonces',
    description: 'Notifications quand quelqu\'un aime vos produits',
    enabled: true,
  },
  {
    id: 'views',
    title: 'Vues sur vos annonces',
    description: 'Notifications quand quelqu\'un consulte vos produits',
    enabled: false,
  },
  {
    id: 'offers',
    title: 'Nouvelles offres',
    description: 'Notifications pour les offres sur vos produits',
    enabled: true,
  },
  {
    id: 'sales',
    title: 'Ventes confirmées',
    description: 'Notifications quand une vente est confirmée',
    enabled: true,
  },
];

export default function NotificationSettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState(notificationSettings);

  const toggleSetting = (id: string) => {
    setSettings(
      settings.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSave = () => {
    // TODO: Save settings to API
    showToast.success('Paramètres sauvegardés', 'Vos préférences de notification ont été mises à jour.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Notifications</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {settings.map((setting) => (
            <View key={setting.id} style={styles.settingItem}>
              <View style={styles.settingContent}>
                <Text style={styles.settingTitle}>{setting.title}</Text>
                <Text style={styles.settingDescription}>{setting.description}</Text>
              </View>
              <Switch
                value={setting.enabled}
                onValueChange={() => toggleSetting(setting.id)}
                trackColor={{ false: '#e0e0e0', true: theme.colors.primary + '80' }}
                thumbColor={setting.enabled ? theme.colors.primary : '#f4f3f4'}
              />
            </View>
          ))}
        </View>

        {/* Save Button */}
        <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
          <Text style={styles.saveButtonText}>Enregistrer</Text>
        </TouchableOpacity>
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
  content: {
    padding: theme.spacing.lg,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  settingContent: {
    flex: 1,
    marginRight: theme.spacing.md,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
    marginBottom: 40,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});

