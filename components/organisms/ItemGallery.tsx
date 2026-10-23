/**
 * Immersive hero gallery (docs/09 §4 Item details):
 * - full width; the photo moves at 0.5× the page scroll (parallax) and
 *   stretches on pull-down overscroll (`scrollY` from the page);
 * - page dots morph as you swipe (the active one widens, scaleX only);
 * - double-tap toggles a 2× zoom around the tapped point (pinch-free),
 *   single tap opens the fullscreen viewer;
 * - a top gradient keeps the back / share / report icons legible.
 * All animations are transform/opacity with ReduceMotion.System.
 */
import { Ionicons } from '@expo/vector-icons';
import { requireOptionalNativeModule } from 'expo';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  interpolate,
  runOnJS,
  type SharedValue,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';
import { spring } from '../motion/anim';

let LinearGradient: any = null;
try {
  if (requireOptionalNativeModule('ExpoLinearGradient')) {
    LinearGradient = require('expo-linear-gradient').LinearGradient;
  }
} catch {
  LinearGradient = null;
}

const DOT = 6;
const DOT_SLOT = 14;

export interface ItemGalleryProps {
  images: string[];
  title: string;
  /** Overlay at the top (header buttons), drawn over the gradient. */
  overlay?: React.ReactNode;
  /** Overlay pinned to the bottom-left of the photo (price pill, badges). */
  bottomOverlay?: React.ReactNode;
  /** Vertical page scroll, for parallax + overscroll stretch. */
  scrollY?: SharedValue<number>;
  /** Height as a fraction of the width (default 0.9), capped at 55 % of the screen. */
  ratio?: number;
  /** Space covered at the bottom by an overlapping sheet: dots and badges sit above it. */
  bottomInset?: number;
  /** Cached low-res image shown on the first photo until it loads (tapped card's cover). */
  placeholder?: string | null;
  /** First photo loaded (SharedPhoto hands over to the gallery). */
  onFirstImageLoad?: () => void;
}

/** Gallery height for a ratio, as rendered (so placeholders can match it). */
export function galleryHeightFor(width: number, height: number, ratio = 0.9) {
  return Math.round(Math.min(width * ratio, height * 0.55));
}

function MorphDot({ i, page }: { i: number; page: SharedValue<number> }) {
  const t = useTheme();
  const style = useAnimatedStyle(() => {
    const d = Math.min(Math.abs(page.value - i), 1);
    return {
      opacity: interpolate(d, [0, 1], [1, 0.6]),
      transform: [{ scaleX: interpolate(d, [0, 1], [DOT_SLOT / DOT, 1]) }],
    };
  });
  return (
    <View style={styles.dotSlot}>
      <Animated.View style={[styles.dot, { backgroundColor: t.colors.onOverlay }, style]} />
    </View>
  );
}

function ZoomPage({
  uri,
  width,
  height,
  label,
  onOpen,
  zoomed,
  placeholder,
  onLoad,
}: {
  placeholder?: string | null;
  onLoad?: () => void;
  uri: string;
  width: number;
  height: number;
  label: string;
  onOpen: () => void;
  zoomed: SharedValue<number>;
}) {
  const s = useSharedValue(1);
  const fx = useSharedValue(0);
  const fy = useSharedValue(0);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDelay(250)
    .onEnd((e) => {
      if (s.value > 1.01) {
        s.value = spring(1, 'fast');
        zoomed.value = 0;
      } else {
        fx.value = width / 2 - e.x;
        fy.value = height / 2 - e.y;
        s.value = spring(2, 'fast');
        zoomed.value = 1;
      }
    });
  const singleTap = Gesture.Tap()
    .numberOfTaps(1)
    .onEnd(() => {
      if (s.value > 1.01) {
        s.value = spring(1, 'fast');
        zoomed.value = 0;
      } else runOnJS(onOpen)();
    });
  const gesture = Gesture.Exclusive(doubleTap, singleTap);

  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: fx.value * (s.value - 1) },
      { translateY: fy.value * (s.value - 1) },
      { scale: s.value },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <View
        accessible
        accessibilityRole="imagebutton"
        accessibilityLabel={label}
        accessibilityHint="Toucher pour agrandir, toucher deux fois pour zoomer"
        style={{ width, height, overflow: 'hidden' }}>
        <Animated.View style={style}>
          <AppImage uri={uri} placeholderUri={placeholder} onLoad={onLoad} style={{ width, height }} />
        </Animated.View>
      </View>
    </GestureDetector>
  );
}

export default function ItemGallery({
  images,
  title,
  overlay,
  bottomOverlay,
  scrollY,
  ratio = 0.9,
  bottomInset = 0,
  placeholder,
  onFirstImageLoad,
}: ItemGalleryProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const fsRef = useRef<FlatList<string>>(null);
  // Cap the hero on wide screens (tablets) so the price stays above the fold.
  const galleryHeight = galleryHeightFor(width, height, ratio);
  const page = useSharedValue(0);
  const zoomed = useSharedValue(0);
  const zero = useSharedValue(0);
  const y = scrollY ?? zero;

  const onHScroll = useAnimatedScrollHandler((e) => {
    page.value = e.contentOffset.x / Math.max(width, 1);
  });

  const onMomentum = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  // Parallax (0.5×) when scrolling up; stretch from the top on pull-down.
  const parallax = useAnimatedStyle(() => {
    const v = y.value;
    if (v < 0) {
      const scale = 1 + -v / galleryHeight;
      return { transform: [{ translateY: v / 2 }, { scale }] };
    }
    return { transform: [{ translateY: v * 0.5 }] };
  });

  const gradTop = insets.top + 80;

  return (
    <View style={{ width, height: galleryHeight, backgroundColor: t.colors.surfaceAlt, overflow: 'hidden' }}>
      <Animated.View style={[StyleSheet.absoluteFill, parallax]}>
        {images.length > 0 ? (
          <Animated.FlatList
            data={images}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `${i}-${u}`}
            onScroll={onHScroll}
            scrollEventThrottle={16}
            onMomentumScrollEnd={onMomentum}
            renderItem={({ item, index: i }) => (
              <ZoomPage
                uri={item}
                width={width}
                height={galleryHeight}
                zoomed={zoomed}
                placeholder={i === 0 ? placeholder : undefined}
                onLoad={i === 0 ? onFirstImageLoad : undefined}
                label={`Photo ${i + 1} sur ${images.length} de ${title}`}
                onOpen={() => setFullscreen(true)}
              />
            )}
          />
        ) : (
          <View style={[styles.empty, { height: galleryHeight }]}>
            <Ionicons name="image-outline" size={56} color={t.colors.inkSubtle} />
            <AppText variant="caption" color="inkMuted">
              Pas de photo
            </AppText>
          </View>
        )}
      </Animated.View>

      {/* Top gradient for the header icons */}
      <View pointerEvents="none" style={[styles.topGrad, { height: gradTop }]}>
        {LinearGradient ? (
          <LinearGradient
            colors={['rgba(12,10,9,0.6)', 'rgba(12,10,9,0)']}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(12,10,9,0.25)' }]} />
        )}
      </View>

      {images.length > 1 && (
        <View
          style={[
            styles.dots,
            { backgroundColor: t.colors.overlay, bottom: bottomInset + 12 },
            !!bottomOverlay && styles.dotsRight,
          ]}
          accessibilityLabel={`Photo ${index + 1} sur ${images.length}`}>
          {images.map((_, i) => (
            <MorphDot key={i} i={i} page={page} />
          ))}
        </View>
      )}
      {bottomOverlay && <View style={[styles.bottomOverlay, { bottom: bottomInset + 12 }]}>{bottomOverlay}</View>}
      {overlay}

      <Modal
        visible={fullscreen}
        onRequestClose={() => setFullscreen(false)}
        animationType={t.reduceMotion ? 'none' : 'fade'}
        statusBarTranslucent>
        <View style={styles.fsBg}>
          <FlatList
            ref={fsRef}
            data={images}
            horizontal
            pagingEnabled
            initialScrollIndex={index}
            getItemLayout={(_, i) => ({ length: width, offset: width * i, index: i })}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(u, i) => `fs-${i}-${u}`}
            onMomentumScrollEnd={onMomentum}
            renderItem={({ item }) => (
              <ScrollView
                style={{ width, height }}
                contentContainerStyle={styles.fsItem}
                maximumZoomScale={3}
                minimumZoomScale={1}
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}>
                <AppImage uri={item} style={{ width, height: height * 0.8 }} contentFit="contain" />
              </ScrollView>
            )}
          />
          <View style={[styles.fsClose, { top: insets.top + 8 }]}>
            <IconButton icon="close" label="Fermer la galerie" variant="overlay" onPress={() => setFullscreen(false)} />
          </View>
          {images.length > 1 && (
            <View style={[styles.fsCounter, { bottom: insets.bottom + 24, backgroundColor: t.colors.overlay }]}>
              <AppText variant="captionStrong" style={{ color: t.colors.onOverlay }}>
                {index + 1}/{images.length}
              </AppText>
            </View>
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 8 },
  topGrad: { position: 'absolute', top: 0, left: 0, right: 0 },
  // Centred page dots on a small translucent plate (tight corners).
  dots: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
    paddingVertical: 6,
    borderRadius: 6,
  },
  dotSlot: { width: DOT_SLOT + 2, alignItems: 'center' },
  dotsRight: { alignSelf: 'flex-end', right: 12 },
  dot: { width: DOT, height: DOT, borderRadius: DOT / 2 },
  bottomOverlay: { position: 'absolute', left: 12, right: 110 },
  fsBg: { flex: 1, backgroundColor: '#000' },
  fsItem: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  fsClose: { position: 'absolute', right: 12 },
  fsCounter: { position: 'absolute', alignSelf: 'center', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6 },
});
