// app/privacy-policy.tsx — Politique de confidentialité (read-only)
// Generic first version (2026-10-23), written from what the code actually
// collects and does. It must be reviewed by a lawyer before launch: the
// operator's legal identity and the Gabonese authority's details are still to
// confirm. The version shown comes from GET /legal (privacy_version); bump it
// in the back office when this text changes so members re-accept it.
import { useQuery } from '@tanstack/react-query';
import { Href, useRouter } from 'expo-router';
import React from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, Button, ScreenHeader } from '@/components/ui';
import { legalVersionsQuery } from '@/lib/api/account';
import { appConfigQuery } from '@/lib/api/appConfig';
import { useTheme } from '@/theme';

const FALLBACK_EMAIL = 'support@bondeal.com';

type Section = { title: string; paragraphs?: string[]; bullets?: string[] };

const SECTIONS: Section[] = [
  {
    title: 'Qui sommes-nous ?',
    paragraphs: [
      'BonDeal est une application de petites annonces entre particuliers au Gabon. Cette politique explique quelles données nous traitons quand vous utilisez l’application, pourquoi, combien de temps, et quels sont vos droits.',
    ],
  },
  {
    title: 'Les données que nous traitons',
    bullets: [
      'Compte : numéro de téléphone (vérifié par SMS), pseudonyme, mot de passe si vous en choisissez un (conservé uniquement sous forme chiffrée irréversible).',
      'Profil, si vous le remplissez : nom, prénom, photo, ville, quartier, genre, date de naissance, adresse e-mail.',
      'Annonces : titre, description, prix, catégorie, état, photos, quartier de retrait.',
      'Échanges : messages, offres, transactions, lieu et heure de rendez-vous, avis laissés et reçus.',
      'Sécurité : signalements, blocages, avertissements de modération.',
      'Recherches : les mots que vous tapez dans la recherche, avec votre ville.',
      'Position : seulement quand vous utilisez « Près de moi », pour trier les annonces par distance. Elle est envoyée avec la recherche et n’est pas enregistrée dans votre profil.',
      'Technique : identifiant de notification de votre téléphone, version de l’application, rapports de plantage.',
      'Statistiques d’utilisation : seulement si vous les activez (Paramètres › Confidentialité). Elles sont désactivées par défaut.',
    ],
  },
  {
    title: 'Pourquoi nous les utilisons',
    bullets: [
      'Faire fonctionner le service : créer votre compte, publier vos annonces, vous mettre en relation avec les acheteurs et vendeurs, envoyer les notifications que vous avez choisies.',
      'Sécurité et confiance : vérifier les numéros, modérer les annonces, traiter les signalements et les litiges, limiter la fraude et les abus.',
      'Améliorer l’application : corriger les plantages et, si vous l’acceptez, mesurer l’usage de façon agrégée.',
      'Tendances de recherche : les recherches sont comptées de façon agrégée. Un mot n’apparaît dans « Tendances » que s’il a été cherché par au moins 3 personnes, et sans jamais indiquer qui.',
      'Messages commerciaux : seulement si vous les activez. Ils sont désactivés par défaut.',
    ],
  },
  {
    title: 'Ce que voient les autres membres',
    paragraphs: [
      'Votre pseudonyme, votre photo, votre ville et votre quartier, vos annonces, votre note et vos avis sont visibles par les autres membres. Votre numéro de téléphone n’est jamais affiché : les échanges passent par la messagerie de BonDeal.',
    ],
  },
  {
    title: 'Nos prestataires',
    paragraphs: [
      'Nous ne vendons pas vos données. Nous les confions uniquement aux prestataires nécessaires au service, qui ne peuvent pas les utiliser pour leur propre compte :',
    ],
    bullets: [
      'Google Firebase : vérification du numéro par SMS, notifications, rapports de plantage.',
      'Hébergement des serveurs, de la base de données et des photos.',
      'Suivi des erreurs du serveur.',
      'Assistant IA (Google Gemini), uniquement quand vous utilisez une fonction IA : les photos et le texte concernés lui sont envoyés pour proposer une suggestion.',
    ],
  },
  {
    title: 'Combien de temps nous les gardons',
    bullets: [
      'Compte et profil : tant que votre compte existe.',
      'Annonces : jusqu’à leur suppression ; une annonce expire automatiquement après la durée affichée dans l’application.',
      'Recherches : 30 jours.',
      'Notifications lues : supprimées automatiquement après un certain temps.',
      'Après la suppression de votre compte : vos données personnelles sont effacées ou rendues anonymes. Les messages et avis déjà échangés restent visibles par l’autre personne, sans votre nom.',
    ],
  },
  {
    title: 'Sécurité',
    paragraphs: [
      'Les échanges avec nos serveurs sont chiffrés. Votre numéro de téléphone, votre e-mail et votre date de naissance sont chiffrés dans notre base de données. Les mots de passe ne sont jamais conservés en clair.',
    ],
  },
  {
    title: 'Vos droits',
    bullets: [
      'Accéder à vos données et en obtenir une copie : Paramètres › Confidentialité › Télécharger mes données.',
      'Les corriger : Moi › Modifier le profil.',
      'Supprimer votre compte : Paramètres › Supprimer mon compte, ou sur notre page web de suppression de compte.',
      'Vous opposer aux statistiques et aux messages commerciaux : Paramètres › Confidentialité et Paramètres › Notifications.',
      'Pour toute autre demande, écrivez-nous (adresse ci-dessous). Vous pouvez aussi saisir l’autorité gabonaise chargée de la protection des données personnelles.',
    ],
  },
  {
    title: 'Modifications',
    paragraphs: [
      'Si cette politique change de façon importante, nous vous demanderons de l’accepter à nouveau dans l’application avant de continuer.',
    ],
  },
];

export default function PrivacyPolicyScreen() {
  const t = useTheme();
  const router = useRouter();
  const legal = useQuery(legalVersionsQuery());
  const config = useQuery(appConfigQuery());
  const email = config.data?.support_email || FALLBACK_EMAIL;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader large title="Politique de confidentialité" />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {legal.data?.privacy_version ? (
          <AppText variant="caption" color="inkMuted">
            Version {legal.data.privacy_version}
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

        <View style={[styles.contact, { backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md }]}>
          <AppText variant="bodyStrong">Nous contacter</AppText>
          <AppText variant="small" color="inkMuted">
            {email}
          </AppText>
          <Button
            label="Écrire au support"
            variant="secondary"
            onPress={() => Linking.openURL(`mailto:${email}?subject=${encodeURIComponent('Données personnelles')}`).catch(() => {})}
          />
          <Button
            label="Gérer ma confidentialité"
            variant="ghost"
            onPress={() => router.push('/privacy-settings' as Href)}
          />
        </View>
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
  contact: { padding: 16, gap: 8, borderWidth: StyleSheet.hairlineWidth },
});
