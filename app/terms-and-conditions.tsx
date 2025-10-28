// app/terms-and-conditions.tsx - Terms and Conditions Screen
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

interface ConsentItemProps {
  title: string;
  description: string;
  isChecked: boolean;
  onToggle: () => void;
}

const ConsentItem: React.FC<ConsentItemProps> = ({ title, description, isChecked, onToggle }) => (
  <TouchableOpacity style={styles.consentItem} onPress={onToggle}>
    <View style={[styles.checkbox, isChecked && styles.checkboxChecked]}>
      {isChecked && <Ionicons name="checkmark" size={20} color={theme.colors.white} />}
    </View>
    <View style={styles.consentText}>
      <Text style={styles.consentTitle}>{title}</Text>
      <Text style={styles.consentDescription}>{description}</Text>
    </View>
  </TouchableOpacity>
);

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const [consents, setConsents] = useState({
    phoneNumber: false,
    personalData: false,
    analytics: false,
    marketing: false,
  });

  const handleConsentToggle = (key: keyof typeof consents) => {
    setConsents(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const allConsentsAccepted = Object.values(consents).every(Boolean);

  const handleAccept = () => {
    if (allConsentsAccepted) {
      // Navigate to next screen or complete registration
      router.push('/verify-number');
    }
  };

  const handleDecline = () => {
    // Navigate back or show message
    router.back();
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Conditions d'utilisation</Text>
          <View style={styles.headerSpacer} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Welcome Section */}
          <View style={styles.welcomeSection}>
            <View style={styles.iconContainer}>
              <Ionicons name="document-text" size={48} color={theme.colors.primary} />
            </View>
            <Text style={styles.welcomeTitle}>Bienvenue sur BonDeal</Text>
            <Text style={styles.welcomeDescription}>
              Pour offrir la meilleure expérience possible, nous avons besoin de votre consentement
              concernant l'utilisation de vos données personnelles.
            </Text>
          </View>

          {/* Consent Items */}
          <View style={styles.consentsSection}>
            <Text style={styles.sectionTitle}>Votre consentement</Text>

            <ConsentItem
              title="Numéro de téléphone"
              description="Nous utilisons votre numéro de téléphone pour vous authentifier, envoyer des codes de vérification et faciliter les échanges entre acheteurs et vendeurs."
              isChecked={consents.phoneNumber}
              onToggle={() => handleConsentToggle('phoneNumber')}
            />

            <ConsentItem
              title="Données personnelles"
              description="Votre nom, photo de profil et informations de profil sont utilisés pour créer votre identité sur la plateforme et faciliter la confiance entre utilisateurs."
              isChecked={consents.personalData}
              onToggle={() => handleConsentToggle('personalData')}
            />

            <ConsentItem
              title="Données d'analyse"
              description="Nous collectons des données d'utilisation pour améliorer notre service, détecter les bugs et optimiser les fonctionnalités de l'application."
              isChecked={consents.analytics}
              onToggle={() => handleConsentToggle('analytics')}
            />

            <ConsentItem
              title="Communication marketing (optionnel)"
              description="Recevez des notifications sur les meilleures offres, promotions exclusives et nouveautés BonDeal. Vous pouvez vous désabonner à tout moment."
              isChecked={consents.marketing}
              onToggle={() => handleConsentToggle('marketing')}
            />
          </View>

          {/* Terms Summary */}
          <View style={styles.termsSection}>
            <Text style={styles.sectionTitle}>Ce que nous garantissons</Text>
            <View style={styles.termBullet}>
              <Ionicons name="shield-checkmark" size={20} color={theme.colors.success} />
              <Text style={styles.termText}>
                Vos données sont cryptées et stockées en toute sécurité
              </Text>
            </View>
            <View style={styles.termBullet}>
              <Ionicons name="refresh" size={20} color={theme.colors.success} />
              <Text style={styles.termText}>
                Vous pouvez modifier vos préférences à tout moment
              </Text>
            </View>
            <View style={styles.termBullet}>
              <Ionicons name="trash" size={20} color={theme.colors.success} />
              <Text style={styles.termText}>
                Vous pouvez supprimer vos données personnelles à tout moment
              </Text>
            </View>
            <View style={styles.termBullet}>
              <Ionicons name="lock-closed" size={20} color={theme.colors.success} />
              <Text style={styles.termText}>
                Nous ne vendons jamais vos données à des tiers
              </Text>
            </View>
            <View style={styles.termBullet}>
              <Ionicons name="globe" size={20} color={theme.colors.success} />
              <Text style={styles.termText}>
                Conformité RGPD et standards internationaux de protection des données
              </Text>
            </View>
          </View>

          {/* Legal Links */}
          <View style={styles.linksSection}>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Lire la Politique de confidentialité complète</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.linkButton}>
              <Text style={styles.linkText}>Lire les Conditions d'utilisation complètes</Text>
              <Ionicons name="chevron-forward" size={16} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>

          {/* Bottom Spacing */}
          <View style={styles.bottomSpacing} />
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.declineButton, !allConsentsAccepted && styles.declineButtonDisabled]}
            onPress={handleDecline}
            disabled={!allConsentsAccepted}>
            <Text style={styles.declineButtonText}>Refuser</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.acceptButton, !allConsentsAccepted && styles.acceptButtonDisabled]}
            onPress={handleAccept}
            disabled={!allConsentsAccepted}>
            <Text style={styles.acceptButtonText}>Accepter et continuer</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.lg,
  },
  welcomeSection: {
    alignItems: 'center',
    marginBottom: theme.spacing.xl,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: `${theme.colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing.md,
  },
  welcomeTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  welcomeDescription: {
    fontSize: 16,
    color: theme.colors.gray,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: theme.spacing.md,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
    marginBottom: theme.spacing.md,
  },
  consentsSection: {
    marginBottom: theme.spacing.xl,
  },
  consentItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    padding: theme.spacing.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.grayLight,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: theme.colors.gray,
    marginRight: theme.spacing.md,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  consentText: {
    flex: 1,
  },
  consentTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    marginBottom: 4,
  },
  consentDescription: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 20,
  },
  termsSection: {
    marginBottom: theme.spacing.xl,
  },
  termBullet: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: theme.spacing.sm,
  },
  termText: {
    fontSize: 14,
    color: theme.colors.gray,
    lineHeight: 22,
    marginLeft: theme.spacing.sm,
    flex: 1,
  },
  linksSection: {
    marginBottom: theme.spacing.md,
  },
  linkButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.grayLight,
  },
  linkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '500',
  },
  bottomSpacing: {
    height: 120,
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    paddingBottom: theme.spacing.lg,
    backgroundColor: theme.colors.white,
    borderTopWidth: 1,
    borderTopColor: theme.colors.grayLight,
    gap: theme.spacing.md,
  },
  declineButton: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: theme.colors.grayLight,
  },
  declineButtonDisabled: {
    opacity: 0.5,
  },
  declineButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.gray,
  },
  acceptButton: {
    flex: 2,
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: theme.spacing.md,
    alignItems: 'center',
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  acceptButtonDisabled: {
    backgroundColor: theme.colors.gray,
    shadowOpacity: 0,
    elevation: 0,
  },
  acceptButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.colors.white,
  },
});

