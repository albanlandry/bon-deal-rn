// app/help-support.tsx — Aide & Support (MB-TS-04)
// FAQ and community rules are in-screen accordions; terms open the terms
// screen in read mode; contact opens the mail app.
import { Href, useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import { Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import {
  AppText,
  Button,
  Card,
  ListGroup,
  ListRow,
  SafetyBanner,
  ScreenHeader,
  showToast,
} from '@/components/ui';
import ProfileFaqItem from '@/components/molecules/ProfileFaqItem';

const SUPPORT_EMAIL = 'support@bondeal.com';

const FAQ = [
  {
    question: 'Comment publier une annonce ?',
    answer:
      'Appuyez sur « Vendre » au centre de la barre du bas. Ajoutez au moins une photo : les Suggestions IA proposent un titre, une catégorie et une description que vous pouvez modifier. Choisissez ensuite votre prix (un prix conseillé vous est montré quand des annonces similaires existent), vérifiez l’aperçu et publiez. Votre brouillon est enregistré automatiquement.',
  },
  {
    question: 'Comment contacter un vendeur ?',
    answer:
      'Sur la page d’une annonce, appuyez sur « Contacter ». La conversation est liée à l’annonce et apparaît dans l’onglet Messages.',
  },
  {
    question: 'Comment faire une offre ?',
    answer:
      'Si le vendeur accepte la négociation, appuyez sur « Faire une offre » depuis l’annonce. Le vendeur peut accepter, refuser ou faire une contre-offre ; tout l’historique s’affiche dans la conversation.',
  },
  {
    question: 'Comment payer en toute sécurité ?',
    answer:
      'Ne payez jamais d’avance. Rencontrez le vendeur dans un lieu public, vérifiez l’article, puis payez sur place. BonDeal ne vous demandera jamais de payer en dehors de l’application.',
  },
  {
    question: 'Puis-je modifier ou retirer mon annonce ?',
    answer: 'Oui : Profil › Mes annonces, puis choisissez l’annonce à modifier, masquer ou supprimer.',
  },
  {
    question: 'Comment changer de quartier ?',
    answer: 'Depuis l’accueil, appuyez sur le quartier en haut de l’écran, ou allez dans Paramètres › Mon quartier.',
  },
  {
    question: 'Comment retirer une annonce de mes favoris ?',
    answer: 'Dans l’onglet Favoris, appuyez sur le cœur de l’annonce.',
  },
];

const RULES = [
  {
    question: 'Soyez honnête',
    answer: 'Décrivez l’état réel de l’article et utilisez vos propres photos. Indiquez les défauts.',
  },
  {
    question: 'Restez respectueux',
    answer: 'Pas d’insultes, de harcèlement ni de discrimination dans les annonces et les messages.',
  },
  {
    question: 'Articles interdits',
    answer:
      'Armes, drogues, médicaments, contrefaçons, animaux protégés, objets volés et tout article illégal au Gabon sont interdits.',
  },
  {
    question: 'Pas d’arnaque',
    answer:
      'Ne demandez jamais de paiement d’avance ni d’informations bancaires. Les comptes frauduleux sont bannis.',
  },
];

export default function HelpSupportScreen() {
  const router = useRouter();
  const t = useTheme();
  const scrollRef = useRef<ScrollView>(null);
  const [faqY, setFaqY] = useState(0);
  const [rulesY, setRulesY] = useState(0);

  const contact = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent('Aide BonDeal')}`).catch(() =>
      showToast.error('Aucune application e-mail', `Écrivez-nous à ${SUPPORT_EMAIL}`),
    );
  };

  const openTerms = () =>
    router.push({ pathname: '/terms-and-conditions', params: { mode: 'read' } } as Href);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <ScreenHeader title="Aide & Support" />
      <ScrollView ref={scrollRef} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ListGroup title="Besoin d'aide ?">
          <ListRow
            icon="help-circle-outline"
            title="Questions fréquentes"
            onPress={() => scrollRef.current?.scrollTo({ y: faqY, animated: !t.reduceMotion })}
          />
          <ListRow
            icon="people-outline"
            title="Règles de la communauté"
            onPress={() => scrollRef.current?.scrollTo({ y: rulesY, animated: !t.reduceMotion })}
          />
          <ListRow icon="document-text-outline" title="Conditions d'utilisation" onPress={openTerms} />
          {/* No standalone privacy-policy document exists yet: the data-use
              commitments live in the terms screen. */}
          <ListRow icon="shield-outline" title="Politique de confidentialité" onPress={openTerms} />
          <ListRow icon="mail-outline" title="Contacter le support" onPress={contact} last />
        </ListGroup>

        <SafetyBanner />

        <View onLayout={(e) => setFaqY(e.nativeEvent.layout.y)} style={styles.section}>
          <ListGroup title="Questions fréquentes">
            {FAQ.map((f, i) => (
              <ProfileFaqItem key={f.question} question={f.question} answer={f.answer} last={i === FAQ.length - 1} />
            ))}
          </ListGroup>
        </View>

        <View onLayout={(e) => setRulesY(e.nativeEvent.layout.y)}>
          <ListGroup title="Règles de la communauté">
            {RULES.map((f, i) => (
              <ProfileFaqItem key={f.question} question={f.question} answer={f.answer} last={i === RULES.length - 1} />
            ))}
          </ListGroup>
        </View>

        <Card style={styles.contact}>
          <AppText variant="h3" align="center">
            Vous n’avez pas trouvé ?
          </AppText>
          <AppText variant="small" color="inkMuted" align="center">
            Notre équipe vous répond par e-mail : {SUPPORT_EMAIL}
          </AppText>
          <Button label="Écrire au support" icon="mail-outline" onPress={contact} style={styles.contactBtn} />
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginTop: 20 },
  contact: { alignItems: 'center', gap: 6, paddingVertical: 20 },
  contactBtn: { marginTop: 10 },
});
