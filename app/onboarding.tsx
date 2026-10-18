// app/onboarding.tsx — 3-slide first-launch tour (MB-AUTH-07)
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
import Animated, { FadeInDown } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

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

export default function OnboardingScreen() {
  const t = useTheme();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const listRef = useRef<FlatList<Slide>>(null);
  const [index, setIndex] = useState(0);
  const last = index === SLIDES.length - 1;

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

  const renderSlide = ({ item, index: i }: { item: Slide; index: number }) => {
    const tint = item.tone === 'trust' ? t.colors.trustTint : t.colors.brandTint;
    const fg = item.tone === 'trust' ? t.colors.trust : t.colors.brandStrong;
    const entering = t.reduceMotion ? undefined : FadeInDown.duration(t.motion.enter);
    return (
      <View style={[styles.slide, { width }]} accessibilityLabel={`Étape ${i + 1} sur ${SLIDES.length}`}>
        {i === index && (
          <Animated.View entering={entering} style={styles.slideInner}>
            <View style={[styles.illustration, { backgroundColor: tint }]}>
              <View style={[styles.illustrationInner, { backgroundColor: t.colors.surface }]}>
                <Ionicons name={item.icon} size={72} color={fg} />
              </View>
            </View>
            <AppText variant="h1" align="center" accessibilityRole="header" style={styles.title}>
              {item.title}
            </AppText>
            <AppText variant="body" color="inkMuted" align="center" style={styles.body}>
              {item.body}
            </AppText>
            <View style={styles.points}>
              {item.points.map((p) => (
                <View key={p.text} style={styles.point}>
                  <Ionicons name={p.icon} size={20} color={fg} />
                  <AppText variant="label" style={styles.flex}>
                    {p.text}
                  </AppText>
                </View>
              ))}
            </View>
          </Animated.View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: t.colors.canvas }]}>
      <View style={styles.top}>
        {!last ? (
          <Button label="Passer" variant="ghost" size="sm" onPress={finish} accessibilityHint="Aller directement à la connexion" />
        ) : (
          <View style={styles.topSpacer} />
        )}
      </View>

      <FlatList
        ref={listRef}
        data={SLIDES}
        keyExtractor={(s) => s.key}
        renderItem={renderSlide}
        extraData={index}
        horizontal
        pagingEnabled
        bounces={false}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={onScrollEnd}
        getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
        style={styles.fill}
      />

      <View style={styles.bottom}>
        <View
          style={styles.dots}
          accessibilityRole="progressbar"
          accessibilityLabel={`Diapositive ${index + 1} sur ${SLIDES.length}`}>
          {SLIDES.map((s, i) => (
            <View
              key={s.key}
              style={[
                styles.dot,
                {
                  width: i === index ? 24 : 8,
                  backgroundColor: i === index ? t.colors.brand : t.colors.line,
                },
              ]}
            />
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
  top: { minHeight: 52, alignItems: 'flex-end', justifyContent: 'center', paddingHorizontal: 12 },
  topSpacer: { height: 40 },
  slide: { flex: 1, justifyContent: 'center' },
  slideInner: { alignItems: 'center', paddingHorizontal: 28 },
  illustration: { width: 200, height: 200, borderRadius: 100, alignItems: 'center', justifyContent: 'center', marginBottom: 32 },
  illustrationInner: { width: 136, height: 136, borderRadius: 68, alignItems: 'center', justifyContent: 'center' },
  title: { marginBottom: 12 },
  body: { maxWidth: 340 },
  points: { marginTop: 24, gap: 12, alignSelf: 'stretch', paddingHorizontal: 12 },
  point: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  bottom: { paddingHorizontal: 24, paddingBottom: 16, gap: 20 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { height: 8, borderRadius: 4 },
});
