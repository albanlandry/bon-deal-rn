// app/terms-and-conditions.tsx — Conditions d’utilisation (read-only)
// Generic first version (2026-10-23), written from what the app actually does.
// It must be reviewed by a lawyer before launch (operator's legal identity,
// applicable courts). The version shown comes from GET /legal (terms_version);
// bump it in the back office when this text changes so members re-accept it
// (new members accept at signup; others are sent to the blocking /consent).
// Data use lives in the privacy policy (app/privacy-policy.tsx).
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, ScreenHeader } from '@/components/ui';
import { legalVersionsQuery } from '@/lib/api/account';
import { useTheme } from '@/theme';

type Section = { title: string; paragraphs?: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    title: '1. Objet',
    paragraphs: [
      'Ces conditions fixent les règles d’utilisation de l’application BonDeal, un service de petites annonces entre particuliers au Gabon. En créant un compte ou en utilisant l’application, vous les acceptez.',
    ],
  },
  {
    title: '2. Le service',
    paragraphs: [
      'BonDeal permet de publier des annonces, de les consulter, d’échanger des messages et de faire des offres. BonDeal met les membres en relation mais n’est ni vendeur ni acheteur : les ventes se concluent directement entre membres, et le paiement se fait entre eux, lors de la remise en main propre. BonDeal n’encaisse aucun paiement.',
      'L’utilisation de BonDeal est actuellement gratuite.',
    ],
  },
  {
    title: '3. Votre compte',
    bullets: [
      'Votre compte est lié à un numéro de téléphone vérifié par SMS. Un compte est personnel.',
      'Les informations de votre profil doivent être exactes.',
      'Vous êtes responsable de ce qui est fait depuis votre compte. Ne partagez ni votre code de vérification ni votre mot de passe.',
    ],
  },
  {
    title: '4. Les annonces',
    paragraphs: ['Une annonce doit décrire honnêtement un objet que vous avez le droit de vendre, avec de vraies photos de cet objet et un prix réel.'],
    bullets: [
      'Interdits : objets illégaux ou volés, contrefaçons, armes et munitions, drogues et médicaments, animaux protégés, contenus pour adultes, documents officiels, et tout ce que la loi interdit de vendre.',
      'Une annonce par objet ; pas d’annonce trompeuse, en double ou publicitaire.',
      'N’indiquez pas vos coordonnées dans l’annonce : utilisez la messagerie de BonDeal.',
      'Les annonces expirent après une durée affichée dans l’application ; vous pouvez les renouveler.',
    ],
  },
  {
    title: '5. Les échanges entre membres',
    bullets: [
      'Une offre acceptée engage les deux membres à se rencontrer de bonne foi pour conclure la vente.',
      'Rencontrez-vous dans un lieu public, vérifiez l’objet avant de payer, et ne payez jamais d’avance.',
      'Restez courtois. Le harcèlement, les insultes, les menaces et le spam sont interdits.',
    ],
  },
  {
    title: '6. Les avis',
    paragraphs: [
      'Un avis ne peut être laissé qu’après une transaction. Il doit être sincère et porter sur l’échange, pas sur la personne. Les avis faux, injurieux ou contre rémunération sont interdits et peuvent être retirés.',
    ],
  },
  {
    title: '7. Modération et sanctions',
    paragraphs: [
      'Les annonces peuvent être vérifiées avant ou après leur publication. Vous pouvez signaler une annonce, un message, un avis ou un membre, et bloquer un membre.',
      'En cas de manquement à ces conditions, BonDeal peut, selon la gravité : envoyer un avertissement, masquer ou refuser une annonce, retirer un avis, suspendre ou fermer le compte.',
    ],
  },
  {
    title: '8. Fonctions d’intelligence artificielle',
    paragraphs: [
      'Certaines fonctions proposent des suggestions automatiques (titre, description, catégorie, prix, recherche). Ce ne sont que des suggestions : vérifiez-les avant de publier. Vous restez responsable de vos annonces.',
    ],
  },
  {
    title: '9. Vos contenus',
    paragraphs: [
      'Vous restez propriétaire de vos photos et de vos textes. Vous autorisez BonDeal à les afficher et à les adapter (par exemple redimensionner une photo) pour faire fonctionner le service, tant qu’ils sont en ligne.',
    ],
  },
  {
    title: '10. Responsabilité',
    paragraphs: [
      'BonDeal ne garantit ni la qualité, ni la conformité, ni la légalité des objets proposés, ni la capacité des membres à vendre ou à acheter. Les litiges entre membres se règlent entre eux ; BonDeal peut aider en examinant un litige signalé dans l’application.',
      'Nous faisons notre possible pour que l’application soit disponible et sûre, mais elle peut être interrompue pour maintenance ou en cas de panne.',
    ],
  },
  {
    title: '11. Données personnelles',
    paragraphs: ['L’utilisation de vos données est décrite dans la politique de confidentialité.'],
  },
  {
    title: '12. Fermeture du compte',
    paragraphs: [
      'Vous pouvez supprimer votre compte à tout moment depuis Paramètres › Supprimer mon compte. BonDeal peut fermer un compte qui enfreint ces conditions.',
    ],
  },
  {
    title: '13. Modifications',
    paragraphs: [
      'Ces conditions peuvent évoluer. En cas de changement important, nous vous demanderons de les accepter à nouveau dans l’application avant de continuer.',
    ],
  },
  {
    title: '14. Droit applicable',
    paragraphs: ['Ces conditions sont soumises au droit gabonais.'],
  },
];

export default function TermsAndConditionsScreen() {
  const router = useRouter();
  const t = useTheme();
  const legal = useQuery(legalVersionsQuery());

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader large title="Conditions d’utilisation" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {legal.data?.terms_version ? (
          <AppText variant="caption" color="inkMuted">
            Version {legal.data.terms_version}
          </AppText>
        ) : null}

        {SECTIONS.map((section) => (
          <View key={section.title} style={styles.section}>
            <AppText variant="h3" accessibilityRole="header">
              {section.title}
            </AppText>
            {section.paragraphs?.map((p) => (
              <AppText key={p} variant="body" color="inkMuted">
                {p}
              </AppText>
            ))}
            {section.bullets?.map((b) => (
              <View key={b} style={styles.bullet}>
                <AppText variant="body" color="inkMuted">
                  •
                </AppText>
                <AppText variant="body" color="inkMuted" style={styles.flex}>
                  {b}
                </AppText>
              </View>
            ))}
          </View>
        ))}

        <Button
          label="Lire la politique de confidentialité"
          icon="shield-outline"
          variant="secondary"
          onPress={() => router.push('/privacy-policy' as Href)}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { paddingHorizontal: 16, paddingBottom: 48, gap: 24 },
  section: { gap: 8 },
  bullet: { flexDirection: 'row', gap: 8 },
  flex: { flex: 1 },
});
