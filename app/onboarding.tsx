// app/onboarding.tsx — 3-slide first-launch tour (MB-AUTH-07)
// Motion (docs/09 §4): the illustration moves slightly with the swipe
// (parallax from the scroll offset) and the page indicator morphs (active dot
// widens via scaleX). Transforms/opacity only; reduce motion → static.
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  NativeScrollEvent,
  NativeSyntheticEvent,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  interpolate,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import { haptics } from '@/lib/haptics';
import { font, useTheme } from '@/theme';

/** Same key as app/index.tsx (ONBOARDING_KEY). */
const ONBOARDING_KEY = 'bondeal.onboarding.seen';

type IconName = React.ComponentProps<typeof Ionicons>['name'];

interface Slide {
  key: string;
  icon: IconName;
  tone: 'brand' | 'trust';
  title: string;
  body: string;
  points: { icon: IconName; text: string }[];
}

const SLIDES: Slide[] = [
  {
    key: 'local',
    icon: 'storefront',
    tone: 'brand',
    title: 'Les bonnes affaires de votre quartier',
    body: 'Achetez, vendez, donnez ou échangez avec vos voisins, dans votre ville.',
    points: [
      { icon: 'location-outline', text: 'Annonces près de chez vous' },
      { icon: 'chatbubbles-outline', text: 'Discutez directement avec le vendeur' },
    ],
  },
  {
    key: 'ai',
    icon: 'camera',
    tone: 'brand',
    title: 'Votre annonce en 30 secondes',
    body: 'Prenez une photo : BonDeal propose le titre, la catégorie et un prix conseillé. Vous gardez le dernier mot.',
    points: [
      { icon: 'sparkles-outline', text: 'Suggestions IA modifiables' },
      { icon: 'pricetag-outline', text: 'Prix conseillé d’après des articles similaires' },
    ],
  },
  {
    key: 'safety',
    icon: 'shield-checkmark',
    tone: 'trust',
    title: 'Échangez en sécurité',
    body: 'Ne perdez pas votre argent : ne payez jamais d’avance, même un acompte.',
    points: [
      { icon: 'people-outline', text: 'Rencontrez-vous dans un lieu public' },
      { icon: 'eye-outline', text: 'Vérifiez l’article avant de payer' },
    ],
  },
];

function SlideView({ item, i, width, x }: { item: Slide; i: number; width: number; x: SharedValue<number> }) {
  const t = useTheme();
  const tint = item.tone === 'trust' ? t.colors.trustTint : t.colors.brandTint;
  const fg = item.tone === 'trust' ? t.colors.trust : t.colors.brandStrong;
  const range = [(i - 1) * width, i * width, (i + 1) * width];
  const illo = useAnimatedStyle(() => {
    if (t.reduceMotion) return {};
    return {
      transform: [
        // Parallax: the illustration lags behind the page (moves at ~0.7×).
        { translateX: interpolate(x.value, range, [width * 0.3, 0, -width * 0.3], 'clamp') },
        { scale: interpolate(x.value, range, [0.86, 1, 0.86], 'clamp') },
      ],
    };
  });
  const inner = useAnimatedStyle(() => {
    if (t.reduceMotion) return {};
    return { transform: [{ translateX: interpolate(x.value, range, [width * 0.12, 0, -width * 0.12], 'clamp') }] };
  });
  const text = useAnimatedStyle(() => ({
    opacity: interpolate(x.value, range, [0, 1, 0], 'clamp'),
  }));
  return (
    <View style={[styles.slide, { width }]} accessibilityLabel={`Étape ${i + 1} sur ${SLIDES.length}`}>
      <View style={styles.slideInner}>
        <Animated.View style={[styles.illustration, { backgroundColor: tint }, illo]}>
          <Animated.View style={[styles.illustrationInner, { backgroundColor: t.colors.surface }, inner]}>
            <Ionicons name={item.icon} size={72} color={fg} />
          </Animated.View>
        </Animated.View>
        <Animated.View style={[styles.textBlock, text]}>
          <AppText variant="h1" accessibilityRole="header" style={styles.title}>
            {item.title}
          </AppText>
          <AppText variant="body" color="inkMuted" style={styles.body}>
            {item.body}
          </AppText>
          <View style={styles.points}>
            {item.points.map((p) => (
              <View key={p.text} style={styles.point}>
                <View style={[styles.pointIcon, { backgroundColor: tint }]}>
                  <Ionicons name={p.icon} size={18} color={fg} />
                </View>
                <AppText variant="label" style={styles.flex}>
                  {p.text}
                </AppText>
              </View>
            ))}
          </View>
        </Animated.View>
      </View>
    </View>
  );
}

/** Page dot that morphs: widens (scaleX 1 → 3) and fills as its page arrives. */
function Dot({ i, width, x }: { i: number; width: number; x: SharedValue<number> }) {
  const t = useTheme();
  const st = useAnimatedStyle(() => {
    const p = x.value / Math.max(width, 1);
    return { transform: [{ scaleX: interpolate(p, [i - 1, i, i + 1], [1, 3, 1], 'clamp') }] };
  });
  const fill = useAnimatedStyle(() => {
    const p = x.value / Math.max(width, 1);
    return { opacity: interpolate(p, [i - 1, i, i + 1], [0, 1, 0], 'clamp') };
  });
  return (
    <View style={styles.dotSlot}>
      <Animated.View style={[styles.dot, { backgroundColor: t.colors.inkSubtle }, st]}>
        <Animated.View style={[StyleSheet.absoluteFill, styles.dotFill, { backgroundColor: t.colors.brandStrong }, fill]} />
      </Animated.View>
    </View>
  );
}

const AnimatedSlides = Animated.createAnimatedComponent(FlatList<Slide>);

export default function OnboardingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;
  const x = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    x.value = e.contentOffset.x;
  });

  const finish = async () => {
    haptics.success();
    try {
      await AsyncStorage.setItem(ONBOARDING_KEY, '1');
    } catch {
      // not critical — the tour would just show again
    }
    router.replace('/login');
  };

  const next = () => {
    if (last) {
      finish();
      return;
    }
    haptics.light();
    const i = index + 1;
    listRef.current?.scrollToIndex({ index: i, animated: !t.reduceMotion });
    setIndex(i);
  };

  const onScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  const renderSlide = ({ item, index: i }: { item: Slide; index: number }) => (
    <SlideView item={item} i={i} width={width} x={x} />
  );

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.canvas }]}>
      <View style={styles.top}>
        {!last ? (
          <Button label="Passer" variant="ghost" onPress={finish} accessibilityHint="Aller directement à la connexion" />
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      <AnimatedSlides
        ref={listRef as any}
        onScroll={onScroll}
        scrollEventThrottle={16}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderSlide}
        extraData={index}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_: unknown, i: number) => ({ length: width, offset: width * i, index: i })}
        style={styles.fill}
      />

      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={`Diapositive ${index + 1} sur ${SLIDES.length}`}>
          {SLIDES.map((sl, i) => (
            <Dot key={sl.key} i={i} width={width} x={x} />
          ))}
        </View>
        <Button
          label={last ? 'Commencer' : 'Suivant'}
          iconRight={last ? undefined : 'arrow-forward'}
          onPress={next}
          fullWidth
          size="lg"
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
  flex: { flex: 1 },
  // Same height with or without “Passer” (md button, 48 dp): no jump on the last slide.
  top: { height: 56, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 12 },
  topSpacer: { height: 48 },
  slide: { flex: 1, justifyContent: 'center' },
  slideInner: { paddingHorizontal: 24, width: '100%', maxWidth: 560, alignSelf: 'center' },
  textBlock: { alignSelf: 'stretch' },
  pointIcon: { width: 36, height: 36, borderRadius: 6, alignItems: 'center', justifyContent: 'center' },
  illustration: {
    alignSelf: 'stretch',
    height: 200,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 32,
  },
  illustrationInner: { width: 120, height: 120, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  title: { ...font('800'), fontSize: 32, lineHeight: 38, letterSpacing: -0.7, marginBottom: 12 },
  body: { maxWidth: 420 },
  points: { marginTop: 24, gap: 12, alignSelf: 'stretch' },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 4 },
  dotSlot: { width: 28, height: 8, alignItems: 'center', justifyContent: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, overflow: 'hidden' },
  dotFill: { borderRadius: 4 },
});
