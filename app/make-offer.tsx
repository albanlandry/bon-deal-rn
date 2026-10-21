// app/make-offer.tsx — Offer / counter-offer route (doc §4.1, anchoring §1.5).
// The item page opens the same form in place as a Sheet (OfferSheet); this
// route stays for counter-offers from the chatroom and direct links.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppText, IconButton } from '@/components/ui';
import { OfferFormBody, OfferSubmitButton, useOfferForm } from '@/components/organisms/OfferForm';
import { createStyles, useStyles } from '@/theme';

export default function MakeOfferScreen() {
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const { postId, negotiationId, conversationId } = useLocalSearchParams<{
    postId?: string;
    negotiationId?: string;
    conversationId?: string;
  }>();

  const form = useOfferForm({
    postId,
    negotiationId,
    conversationId,
    onSent: (_neg, convId, isCounter) => {
      if (isCounter) router.back();
      else if (convId) router.replace({ pathname: '/chatroom', params: { conversationId: String(convId) } });
      else router.back();
    },
  });

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <AppText variant="h3" style={styles.flex} accessibilityRole="header">
            {form.isCounter ? 'Faire une contre-offre' : 'Faire une offre'}
          </AppText>
          <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
        </View>
        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <OfferFormBody form={form} />
        </ScrollView>
        <View style={styles.footer}>
          <OfferSubmitButton form={form} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', paddingLeft: t.spacing.md, paddingRight: 4, minHeight: 56 },
  content: { padding: t.spacing.md },
  footer: {
    padding: t.spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: t.colors.line,
    backgroundColor: t.colors.surface,
  },
}));
