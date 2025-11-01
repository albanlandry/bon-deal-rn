// app/help-support.tsx - Help & Support Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

interface HelpItem {
  id: string;
  title: string;
  icon: string;
  onPress: () => void;
}

const helpItems: HelpItem[] = [
  {
    id: 'faq',
    title: 'Questions fréquentes (FAQ)',
    icon: 'help-circle-outline',
    onPress: () => {
      // TODO: Navigate to FAQ screen
    },
  },
  {
    id: 'contact',
    title: 'Contacter le support',
    icon: 'mail-outline',
    onPress: () => {
      Linking.openURL('mailto:support@bondeal.com');
    },
  },
  {
    id: 'terms',
    title: 'Conditions d\'utilisation',
    icon: 'document-text-outline',
    onPress: () => {
      // TODO: Navigate to terms screen
    },
  },
  {
    id: 'privacy',
    title: 'Politique de confidentialité',
    icon: 'shield-outline',
    onPress: () => {
      // TODO: Navigate to privacy policy screen
    },
  },
];

const faqItems = [
  {
    question: 'Comment publier une annonce ?',
    answer: 'Appuyez sur le bouton "+" en bas de l\'écran d\'accueil, remplissez les informations de votre produit et publiez.',
  },
  {
    question: 'Comment contacter un vendeur ?',
    answer: 'Sur la page de détails d\'un produit, appuyez sur "Contacter" pour envoyer un message au vendeur.',
  },
  {
    question: 'Comment retirer un produit des favoris ?',
    answer: 'Allez dans vos favoris et appuyez sur l\'icône cœur pour retirer un produit.',
  },
  {
    question: 'Puis-je modifier mon annonce après publication ?',
    answer: 'Oui, allez dans "Mes annonces", sélectionnez votre produit et appuyez sur "Modifier".',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();

  const renderHelpItem = (item: HelpItem) => (
    <TouchableOpacity key={item.id} style={styles.helpItem} onPress={item.onPress}>
      <View style={styles.helpItemLeft}>
        <View style={styles.helpIconContainer}>
          <Ionicons name={item.icon as any} size={20} color={theme.colors.primary} />
        </View>
        <Text style={styles.helpItemTitle}>{item.title}</Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.colors.gray} />
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Aide & Support</Text>
        <View style={{ width: 24 }} />
      </View>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Help Actions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Besoin d'aide ?</Text>
          <View style={styles.helpContainer}>
            {helpItems.map(renderHelpItem)}
          </View>
        </View>

        {/* FAQ Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Questions fréquentes</Text>
          <View style={styles.faqContainer}>
            {faqItems.map((faq, index) => (
              <View key={index} style={styles.faqItem}>
                <Text style={styles.faqQuestion}>{faq.question}</Text>
                <Text style={styles.faqAnswer}>{faq.answer}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <Ionicons name="mail" size={24} color={theme.colors.primary} />
          <Text style={styles.contactTitle}>Nous contacter</Text>
          <Text style={styles.contactText}>
            support@bondeal.com
          </Text>
          <Text style={styles.contactText}>
            +241 01 23 45 67
          </Text>
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
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.md,
  },
  helpContainer: {
    backgroundColor: theme.colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  helpItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  helpItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  helpIconContainer: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.md,
  },
  helpItemTitle: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
  },
  faqContainer: {
    gap: theme.spacing.md,
  },
  faqItem: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: theme.spacing.md,
  },
  faqQuestion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.sm,
  },
  faqAnswer: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  contactSection: {
    alignItems: 'center',
    padding: theme.spacing.xl,
    marginTop: theme.spacing.md,
    marginBottom: 40,
  },
  contactTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginTop: theme.spacing.sm,
    marginBottom: theme.spacing.md,
  },
  contactText: {
    fontSize: 14,
    color: theme.colors.gray,
    marginBottom: 4,
  },
});

