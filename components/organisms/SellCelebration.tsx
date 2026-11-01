import { Ionicons } from '@expo/vector-icons';
import React, { useEffect } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { interpolate, useAnimatedStyle, useSharedValue, ZoomIn } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { duration } from '@/theme/motion';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';
import { ease, enterFade, enterUp, RM, timing } from '../motion/anim';

export interface SellCelebrationProps {
  visible: boolean;
  title: string;
  /** "55 000 FCFA" / "Gratuit" / "Échange". */
  priceText?: string;
  /** Pickup quartier, for "Les acheteurs d’Akébé…". */
  place?: string | null;
  thumbUri?: string | null;
  /** "Partager sur WhatsApp" when WhatsApp is installed, else the system share. */
  shareLabel?: string;
  shareIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onShare: () => void;
  onView: () => void;
  onHome: () => void;
  /** POST /posts `possible_duplicate_of`: same title posted in the last 30 days. */
  duplicateOfId?: number | null;
  onViewDuplicate?: () => void;
}

const CHECK_MS = 380;

/**
 * A check that draws itself (short stroke, then long stroke) inside a filled
 * circle — plain Views, no SVG. ≤ 400 ms; reduce motion shows it drawn.
 */
function DrawnCheck({ play }: { play: boolean }) {
  const t = useTheme();
  const p = useSharedValue(0);
  useEffect(() => {
    if (!play) {
      p.value = 0;
      return;
    }
    p.value = timing(1, CHECK_MS, 'standard');
  }, [play, p]);
  const shortLeg = useAnimatedStyle(() => ({ height: 14 * interpolate(p.value, [0, 0.35], [0, 1], 'clamp') }));
  const longLeg = useAnimatedStyle(() => ({ width: 28 * interpolate(p.value, [0.35, 1], [0, 1], 'clamp') }));
  return (
    <Animated.View
      entering={ZoomIn.duration(duration.medium).easing(ease.enter).reduceMotion(RM)}
      style={[styles.halo, { backgroundColor: t.colors.brandTint }]}>
      <View style={[styles.disc, { backgroundColor: t.colors.brand }]}>
        <View style={styles.checkBox}>
          <Animated.View style={[styles.leg, styles.legShort, { backgroundColor: t.colors.onBrand }, shortLeg]} />
          <Animated.View style={[styles.leg, styles.legLong, { backgroundColor: t.colors.onBrand }, longLeg]} />
        </View>
      </View>
    </Animated.View>
  );
}

/**
 * Peak–end (docs/11 §4.3): full screen "Votre annonce est en ligne" with a
 * check that draws in (the success haptic is fired by the publish mutation),
 * then one clear next step — share. Nothing blocks touches, no invented
 * numbers.
 */
export default function SellCelebration({
  visible,
  title,
  priceText,
  place,
  thumbUri,
  shareLabel = 'Partager l’annonce',
  shareIcon = 'share-social-outline',
  onShare,
  onView,
  onHome,
  duplicateOfId,
  onViewDuplicate,
}: SellCelebrationProps) {
  const t = useTheme();
  const where = place ? `Les acheteurs de ${place} et des environs` : 'Les acheteurs de votre ville';

  return (
    <Modal visible={visible} animationType="none" statusBarTranslucent onRequestClose={onHome}>
      <Animated.View entering={enterFade(duration.medium)} style={[styles.fill, { backgroundColor: t.colors.canvas }]}>
        <SafeAreaView style={styles.fill} edges={['top', 'bottom']}>
          <ScrollView contentContainerStyle={styles.scroll} accessibilityViewIsModal>
            <View style={styles.hero}>
              <DrawnCheck play={visible} />
              <AppText variant="h2" align="center" accessibilityRole="header" style={styles.mt24}>
                Votre annonce est en ligne
              </AppText>
              <AppText variant="small" color="inkMuted" align="center">
                {where} peuvent la voir dès maintenant.
              </AppText>
            </View>

            <Animated.View
              entering={enterUp(1)}
              style={[styles.card, { backgroundColor: t.colors.surface, borderColor: t.colors.line, borderRadius: t.radius.md }]}>
              <AppImage uri={thumbUri} style={[styles.thumb, { borderRadius: t.radius.sm }]} />
              <View style={styles.flex}>
                {!!priceText && <AppText variant="price">{priceText}</AppText>}
                <AppText variant="small" numberOfLines={2}>
                  {title}
                </AppText>
                <AppText variant="caption" color="inkSubtle">
                  {place ? `${place} · ` : ''}à l’instant
                </AppText>
              </View>
            </Animated.View>

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

            <View style={[styles.tip, { backgroundColor: t.colors.trustTint, borderRadius: t.radius.md }]}>
              <AppText variant="caption" color="trust">
                <AppText variant="captionStrong" color="trust">
                  Astuce :{' '}
                </AppText>
                partagez-la à vos contacts pour trouver preneur plus vite.
              </AppText>
            </View>
          </ScrollView>

          <Animated.View entering={enterUp(2)} style={styles.actions}>
            <Button label={shareLabel} icon={shareIcon} onPress={onShare} fullWidth size="lg" />
            <Button label="Voir mon annonce" variant="secondary" onPress={onView} fullWidth />
            <Button label="Retour à l’accueil" variant="ghost" onPress={onHome} fullWidth />
          </Animated.View>
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  scroll: { padding: 16, paddingTop: 40, gap: 16 },
  hero: { alignItems: 'center', gap: 8, paddingHorizontal: 8 },
  mt24: { marginTop: 16 },
  halo: { width: 96, height: 96, borderRadius: 48, alignItems: 'center', justifyContent: 'center' },
  disc: { width: 60, height: 60, borderRadius: 30, alignItems: 'center', justifyContent: 'center' },
  // An "L" rotated −45°: the short leg grows down, then the long leg right.
  checkBox: { width: 28, height: 14, transform: [{ translateY: -3 }, { rotate: '-45deg' }] },
  leg: { position: 'absolute', left: 0, borderRadius: 2 },
  legShort: { top: 0, width: 4 },
  legLong: { bottom: 0, height: 4 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, borderWidth: 1 },
  thumb: { width: 72, height: 72 },
  dup: { flexDirection: 'row', gap: 12, padding: 12 },
  dupBtn: { alignSelf: 'flex-start', marginLeft: -8 },
  tip: { padding: 12 },
  actions: { gap: 8, paddingHorizontal: 16, paddingBottom: 12, paddingTop: 8 },
});
