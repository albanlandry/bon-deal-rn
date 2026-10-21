import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useState } from 'react';
import { Modal, StyleSheet, View } from 'react-native';
import Animated, { ZoomIn } from 'react-native-reanimated';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import Celebrate from '../motion/Celebrate';
import { ease, enterFade, enterUp, RM } from '../motion/anim';

export interface SellCelebrationProps {
  visible: boolean;
  title: string;
  onShare: () => void;
  onView: () => void;
  onHome: () => void;
  /** POST /posts `possible_duplicate_of`: same title posted in the last 30 days. */
  duplicateOfId?: number | null;
  onViewDuplicate?: () => void;
}

/**
 * Peak–end rule: celebrate the peak moment (listing published) with a light
 * confetti burst (components/motion/Celebrate, < 900 ms, never blocks
 * touches), then offer the natural next step (share). With "reduce motion"
 * the burst and the card's zoom jump to their end state.
 */
export default function SellCelebration({
  visible,
  title,
  onShare,
  onView,
  onHome,
  duplicateOfId,
  onViewDuplicate,
}: SellCelebrationProps) {
  const t = useTheme();
  // Fire one burst (< 900 ms, docs/09 peak–end) each time the modal opens.
  // The success haptic is fired by the publish mutation itself.
  const [burst, setBurst] = useState(0);
  useEffect(() => {
    setBurst(visible ? Date.now() : 0);
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="none" statusBarTranslucent onRequestClose={onHome}>
      <Animated.View entering={enterFade(duration.medium)} style={[styles.fill, { backgroundColor: t.colors.scrim }]}>
        <Animated.View
          entering={ZoomIn.duration(duration.medium).easing(ease.enter).reduceMotion(RM)}
          accessibilityViewIsModal
          style={[styles.card, { backgroundColor: t.colors.surface, borderRadius: t.radius.lg }]}>
          <View style={[styles.icon, { backgroundColor: t.colors.successTint }]}>
            <Ionicons name="checkmark-done" size={36} color={t.colors.success} />
          </View>
          <AppText variant="h2" align="center" accessibilityRole="header">
            Annonce publiée !
          </AppText>
          <AppText variant="small" color="inkMuted" align="center">
            « {title} » est maintenant visible par les acheteurs de votre ville. Partagez-la pour
            trouver preneur plus vite.
          </AppText>
          {!!duplicateOfId && (
            <View
              accessibilityRole="alert"
              style={[styles.dup, { backgroundColor: t.colors.warningTint, borderRadius: t.radius.md }]}>
              <Ionicons name="copy-outline" size={20} color={t.colors.warning} />
              <View style={styles.flex}>
                <AppText variant="labelStrong">Vous avez déjà publié une annonce similaire</AppText>
                <AppText variant="caption" color="inkMuted">
                  Les doublons gênent les acheteurs et peuvent être retirés par la modération.
                </AppText>
                {onViewDuplicate && (
                  <Button
                    label="Voir l’autre annonce"
                    variant="ghost"
                    size="sm"
                    iconRight="arrow-forward"
                    onPress={onViewDuplicate}
                    style={styles.dupBtn}
                  />
                )}
              </View>
            </View>
          )}
          <Animated.View entering={enterUp(3)} style={styles.actions}>
            <Button label="Partager l’annonce" icon="share-social-outline" onPress={onShare} fullWidth size="lg" />
            <Button label="Voir mon annonce" variant="secondary" onPress={onView} fullWidth />
            <Button label="Retour à l’accueil" variant="ghost" onPress={onHome} fullWidth />
          </Animated.View>
        </Animated.View>
        <Celebrate trigger={burst} originY={0.3} haptic={false} />
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  actions: { alignSelf: 'stretch', gap: 12 },
  card: { width: '100%', maxWidth: 380, padding: 24, gap: 12, alignItems: 'center' },
  dup: { flexDirection: 'row', gap: 10, padding: 12, alignSelf: 'stretch' },
  dupBtn: { alignSelf: 'flex-start', marginLeft: -8 },
  flex: { flex: 1 },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
