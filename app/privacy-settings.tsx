// app/privacy-settings.tsx - Privacy Settings Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';

interface PrivacySetting {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

const privacySettings: PrivacySetting[] = [
  {
    id: 'profileVisibility',
    title: 'Profil public',
    description: 'Autoriser les autres utilisateurs à voir votre profil',
    enabled: true,
  },
  {
    id: 'showLocation',
    title: 'Afficher la localisation',
    description: 'Afficher votre localisation sur votre profil',
    enabled: true,
  },
  {
    id: 'showPhone',
    title: 'Afficher le téléphone',
    description: 'Autoriser les autres à voir votre numéro de téléphone',
    enabled: false,
  },
  {
    id: 'allowMessages',
    title: 'Accepter les messages',
    description: 'Autoriser les autres utilisateurs à vous envoyer des messages',
    enabled: true,
  },
];

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [settings, setSettings] = useState(privacySettings);

  const toggleSetting = (id: string) => {
    setSettings(
      settings.map(setting =>
        setting.id === id ? { ...setting, enabled: !setting.enabled } : setting
      )
    );
  };

  const handleSave = () => {
    // TODO: Save settings to API
    showToast.success('Paramètres sauvegardés', 'Vos préférences de confidentialité ont été mises à jour.');
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confidentialité</Text>
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

        {/* Info Section */}
        <View style={styles.infoSection}>
          <Ionicons name="information-circle-outline" size={20} color={theme.colors.primary} />
          <Text style={styles.infoText}>
            Vos informations personnelles sont protégées et ne seront jamais partagées avec des tiers sans votre consentement.
          </Text>
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
  infoSection: {
    flexDirection: 'row',
    backgroundColor: '#F0F8FF',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.md,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: '#666',
    marginLeft: theme.spacing.sm,
    lineHeight: 18,
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

