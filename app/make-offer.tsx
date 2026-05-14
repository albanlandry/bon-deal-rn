// app/make-offer.tsx - Offer / counter-offer modal
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';
import { showToast } from '../components/atoms/Toast';
import { counterOffer, openNegotiation } from '@/lib/api/negotiations';
import { formatAmount } from '@/lib/format';
import type { BdNegotiation } from '@/constants/types';

export default function MakeOfferScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { postId, negotiationId, conversationId } = useLocalSearchParams<{
    postId?: string;
    negotiationId?: string;
    conversationId?: string;
  }>();

  const isCounter = !!negotiationId;
  const [amountText, setAmountText] = useState('');
  const [message, setMessage] = useState('');

  const amount = parseInt(amountText.replace(/[^0-9]/g, ''), 10);
  const canSubmit = Number.isFinite(amount) && amount > 0;

  const mutation = useMutation({
    mutationFn: async (): Promise<BdNegotiation> => {
      const note = message.trim() || undefined;
      if (isCounter) {
        return counterOffer(Number(negotiationId), { amount, message: note });
      }
      return openNegotiation(Number(postId), { amount, message: note });
    },
    onSuccess: (neg) => {
      const convId =
        neg.conversation_id ?? (conversationId ? Number(conversationId) : null);
      if (convId) {
        queryClient.invalidateQueries({ queryKey: ['conversation', convId] });
      }
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      showToast.success(isCounter ? 'Contre-offre envoyée' : 'Offre envoyée');
      if (isCounter) {
        router.back();
      } else if (convId) {
        router.replace({
          pathname: '/chatroom',
          params: { conversationId: String(convId) },
        });
      } else {
        router.back();
      }
    },
    onError: (e: any) => {
      showToast.error('Échec', e?.message || 'Veuillez réessayer.');
    },
  });

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>
            {isCounter ? 'Faire une contre-offre' : 'Faire une offre'}
          </Text>
          <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
            <Ionicons name="close" size={24} color="#000" />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled">
          <Text style={styles.label}>Votre proposition</Text>
          <View style={styles.amountRow}>
            <TextInput
              style={styles.amountInput}
              value={amountText}
              onChangeText={(t) => setAmountText(t.replace(/[^0-9]/g, ''))}
              placeholder="0"
              placeholderTextColor="#bbb"
              keyboardType="number-pad"
              autoFocus
              maxLength={12}
            />
            <Text style={styles.currency}>FCFA</Text>
          </View>
          {canSubmit && <Text style={styles.amountPreview}>{formatAmount(amount)}</Text>}

          <Text style={[styles.label, styles.messageLabel]}>Message (optionnel)</Text>
          <TextInput
            style={styles.messageInput}
            value={message}
            onChangeText={setMessage}
            placeholder="Ajoutez un mot pour le vendeur…"
            placeholderTextColor="#999"
            multiline
            maxLength={500}
          />
        </ScrollView>

        <View style={styles.footer}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!canSubmit || mutation.isPending) && styles.submitButtonDisabled,
            ]}
            onPress={() => mutation.mutate()}
            disabled={!canSubmit || mutation.isPending}>
            {mutation.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.submitButtonText}>
                {isCounter ? 'Envoyer la contre-offre' : "Envoyer l'offre"}
              </Text>
            )}
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
  flex: {
    flex: 1,
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
    color: '#000',
  },
  closeButton: {
    padding: theme.spacing.xs,
  },
  content: {
    paddingHorizontal: theme.spacing.lg,
    paddingTop: theme.spacing.xl,
    paddingBottom: theme.spacing.xl,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: theme.spacing.sm,
  },
  messageLabel: {
    marginTop: theme.spacing.xl,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    height: 64,
  },
  amountInput: {
    flex: 1,
    fontSize: 28,
    fontWeight: '700',
    color: '#000',
  },
  currency: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
    marginLeft: theme.spacing.sm,
  },
  amountPreview: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
    marginTop: theme.spacing.sm,
  },
  messageInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.md,
    fontSize: 16,
    color: '#333',
    minHeight: 100,
    textAlignVertical: 'top',
  },
  footer: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  submitButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  submitButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
