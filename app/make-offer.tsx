// app/make-offer.tsx — Offer / counter-offer route (doc §4.1, anchoring §1.5).
// The item page opens the same form in place as a Sheet (OfferSheet); this
// route stays for counter-offers from the chatroom and direct links. The
// submit sits in the floating ActionDock with the payment safety line.
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { AppText, IconButton } from '@/components/ui';
import { OfferDock, OfferFormBody, useOfferForm } from '@/components/organisms/OfferForm';
import { dockBottom } from '@/components/organisms/ActionDock';
import { createStyles, useStyles } from '@/theme';

/** Room for the dock (safety line + button + note). */
const DOCK_SPACE = 140;

export default function MakeOfferScreen() {
  const router = useRouter();
  const styles = useStyles(makeStyles);
  const insets = useSafeAreaInsets();
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
    <SafeAreaView style={styles.screen} edges={['top']}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.flex}>
        <View style={styles.header}>
          <AppText variant="h3" style={styles.flex} accessibilityRole="header">
            {form.isCounter ? 'Faire une contre-offre' : 'Faire une offre'}
          </AppText>
          <IconButton icon="close" label="Fermer" onPress={() => router.back()} />
        </View>
        <ScrollView
          contentContainerStyle={[styles.content, { paddingBottom: DOCK_SPACE + dockBottom(insets.bottom) }]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <OfferFormBody form={form} />
        </ScrollView>
        <OfferDock form={form} />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const makeStyles = createStyles((t) => ({
  screen: { flex: 1, backgroundColor: t.colors.canvas },
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: t.spacing.md,
    paddingRight: 4,
    minHeight: 56,
    backgroundColor: t.colors.surface,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: t.colors.line,
  },
  content: { padding: t.spacing.md },
}));
