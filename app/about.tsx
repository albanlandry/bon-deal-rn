// app/about.tsx — À propos (MB-PRF-04): version, environment, licences, links.
import Constants from 'expo-constants';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { config } from '@/utils/config';
import { useTheme } from '@/theme';
import { AppText, ListGroup, ListRow, ScreenHeader } from '@/components/ui';

const LICENCES: { name: string; licence: string }[] = [
  { name: 'React Native', licence: 'MIT' },
  { name: 'React', licence: 'MIT' },
  { name: 'Expo & Expo Router', licence: 'MIT' },
  { name: 'TanStack React Query', licence: 'MIT' },
  { name: 'React Native Firebase', licence: 'Apache 2.0' },
  { name: 'React Native Paper', licence: 'MIT' },
  { name: 'React Native Reanimated', licence: 'MIT' },
  { name: 'React Native Gesture Handler', licence: 'MIT' },
  { name: 'React Hook Form & Yup', licence: 'MIT' },
  { name: 'Ionicons (@expo/vector-icons)', licence: 'MIT' },
];

const ENV_LABEL: Record<string, string> = {
  local: 'Développement',
  test: 'Test',
  production: 'Production',
};

export default function AboutScreen() {
  const router = useRouter();
  const t = useTheme();
  const version = Constants.expoConfig?.version ?? config.app.version;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="À propos" />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <View style={[styles.logo, { backgroundColor: t.colors.brand }]}>
            <AppText variant="h1" style={{ color: t.colors.onBrand }}>
              B
            </AppText>
          </View>
          <AppText variant="h2">{config.app.name}</AppText>
          <AppText variant="small" color="inkMuted" align="center">
            Achetez, vendez et échangez près de chez vous, au Gabon.
          </AppText>
        </View>

        <ListGroup title="Application">
          <ListRow icon="code-slash-outline" title="Version" value={version} />
          <ListRow
            icon="server-outline"
            title="Environnement"
            value={ENV_LABEL[config.env] ?? config.env}
            last
          />
        </ListGroup>

        <ListGroup title="Informations">
          <ListRow
            icon="document-text-outline"
            title="Conditions d'utilisation"
            onPress={() => router.push({ pathname: '/terms-and-conditions', params: { mode: 'read' } } as Href)}
          />
          <ListRow icon="help-circle-outline" title="Aide & Support" onPress={() => router.push('/help-support')} last />
        </ListGroup>

        <ListGroup title="Licences open source">
          {LICENCES.map((l, i) => (
            <ListRow key={l.name} title={l.name} value={l.licence} last={i === LICENCES.length - 1} />
          ))}
        </ListGroup>

        <AppText variant="caption" color="inkSubtle" align="center">
          Merci aux communautés open source qui rendent BonDeal possible.
        </AppText>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  hero: { alignItems: 'center', gap: 6, marginBottom: 24, marginTop: 8 },
  logo: { width: 72, height: 72, borderRadius: 20, alignItems: 'center', justifyContent: 'center', marginBottom: 6 },
});
