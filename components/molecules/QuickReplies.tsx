import React from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import Chip from '../atoms/Chip';

export interface QuickRepliesProps {
  replies: string[];
  onPick: (text: string) => void;
}

/** Uncertainty reduction: one-tap openers for a first contact. */
export default function QuickReplies({ replies, onPick }: QuickRepliesProps) {
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.row}>
      {replies.map((r) => (
        <Chip key={r} label={r} kind="action" onPress={() => onPick(r)} />
      ))}
    </ScrollView>
  );
}

export const BUYER_QUICK_REPLIES = [
  'Bonjour, toujours disponible ?',
  'Où peut-on se rencontrer ?',
  'Le prix est-il négociable ?',
  'Pouvez-vous envoyer d’autres photos ?',
];

export const SELLER_QUICK_REPLIES = [
  'Oui, toujours disponible !',
  'On peut se voir dans un lieu public ?',
  'Quand êtes-vous disponible ?',
];

const styles = StyleSheet.create({
  row: { gap: 8, paddingHorizontal: 12, paddingVertical: 8 },
});
