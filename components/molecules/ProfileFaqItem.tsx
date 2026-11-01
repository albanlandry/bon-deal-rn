import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';

/** Accordion row for help/FAQ content (progressive disclosure). */
export default function ProfileFaqItem({
  question,
  answer,
  last,
}: {
  question: string;
  answer: string;
  last?: boolean;
}) {
  const t = useTheme();
  const [open, setOpen] = useState(false);
  return (
    <View style={{ borderBottomWidth: last ? 0 : StyleSheet.hairlineWidth, borderBottomColor: t.colors.line }}>
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={question}
        onPress={() => setOpen((o) => !o)}
        style={styles.row}>
        <AppText variant="bodyStrong" style={styles.flex}>
          {question}
        </AppText>
        <Ionicons name={open ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.inkMuted} />
      </Pressable>
      {open && (
        <AppText variant="small" color="inkMuted" style={styles.answer}>
          {answer}
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56, paddingHorizontal: 16, paddingVertical: 12 },
  answer: { paddingHorizontal: 16, paddingBottom: 16 },
  flex: { flex: 1 },
});
