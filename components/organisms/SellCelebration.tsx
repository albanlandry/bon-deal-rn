import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useMemo } from 'react';
import { Dimensions, Modal, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
  ZoomIn,
} from 'react-native-reanimated';
import { useTheme } from '@/theme';
import AppText from '../atoms/AppText';
import Button from '../atoms/Button';

const { width: W, height: H } = Dimensions.get('window');

function ConfettiPiece({ color, x, delay, rotate, size }: { color: string; x: number; delay: number; rotate: number; size: number }) {
  const y = useSharedValue(-40);
  const o = useSharedValue(1);
  useEffect(() => {
    y.value = withDelay(delay, withTiming(H * 0.55, { duration: 1600, easing: Easing.out(Easing.quad) }));
    o.value = withDelay(delay + 1100, withTiming(0, { duration: 500 }));
  }, []);
  const style = useAnimatedStyle(() => ({
    opacity: o.value,
    transform: [{ translateY: y.value }, { rotate: `${rotate + y.value / 3}deg` }],
  }));
  return (
    <Animated.View
      style={[
        styles.piece,
        { left: x, width: size, height: size * 0.45, backgroundColor: color, borderRadius: 2 },
        style,
      ]}
    />
  );
}

export interface SellCelebrationProps {
  visible: boolean;
  title: string;
  onShare: () => void;
  onView: () => void;
  onHome: () => void;
}

/**
 * Peak–end rule: celebrate the peak moment (listing published) with a light
 * confetti burst, then offer the natural next step (share). Confetti is
 * skipped when the OS "reduce motion" setting is on.
 */
export default function SellCelebration({ visible, title, onShare, onView, onHome }: SellCelebrationProps) {
  const t = useTheme();
  const pieces = useMemo(() => {
    const palette = [t.colors.brand, t.colors.trust, t.colors.warning, t.colors.success, t.colors.brandStrong];
    return Array.from({ length: 28 }, (_, i) => ({
      key: i,
      color: palette[i % palette.length],
      x: Math.random() * (W - 12),
      delay: Math.random() * 350,
      rotate: Math.random() * 180,
      size: 8 + Math.random() * 8,
    }));
  }, [t.colors]);

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent>
      <View style={[styles.fill, { backgroundColor: t.colors.scrim }]}>
        {visible && !t.reduceMotion && (
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            {pieces.map((p) => (
              <ConfettiPiece key={p.key} color={p.color} x={p.x} delay={p.delay} rotate={p.rotate} size={p.size} />
            ))}
          </View>
        )}
        <Animated.View
          entering={t.reduceMotion ? FadeIn.duration(0) : ZoomIn.duration(t.motion.enter)}
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
          <Button label="Partager l’annonce" icon="share-social-outline" onPress={onShare} fullWidth />
          <Button label="Voir mon annonce" variant="secondary" onPress={onView} fullWidth />
          <Button label="Retour à l’accueil" variant="ghost" onPress={onHome} fullWidth />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  piece: { position: 'absolute', top: 0 },
  card: { width: '100%', maxWidth: 380, padding: 24, gap: 12, alignItems: 'center' },
  icon: { width: 72, height: 72, borderRadius: 36, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
});
