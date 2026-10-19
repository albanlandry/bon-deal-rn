import { Ionicons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import AppImage from '../atoms/AppImage';
import AppText from '../atoms/AppText';
import IconButton from '../atoms/IconButton';

export interface ItemGalleryProps {
  images: string[];
  title: string;
  /** Overlay content drawn on top (e.g. header buttons, badges). */
  overlay?: React.ReactNode;
}

function Dots({ count, index, light }: { count: number; index: number; light?: boolean }) {
  const t = useTheme();
  if (count < 2) return null;
  return (
    <View style={styles.dots} accessibilityElementsHidden importantForAccessibility="no-hide-descendants">
      {Array.from({ length: count }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.dot,
            {
              width: i === index ? 18 : 6,
              backgroundColor: i === index ? t.colors.brand : light ? 'rgba(255,255,255,0.6)' : t.colors.overlay,
            },
          ]}
        />
      ))}
    </View>
  );
}

/**
 * Full-bleed swipeable gallery with dots (aesthetic–usability: large product
 * imagery). Tap opens a fullscreen viewer; pinch-zoom where the platform's
 * ScrollView supports it (iOS).
 */
export default function ItemGallery({ images, title, overlay }: ItemGalleryProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const [fullscreen, setFullscreen] = useState(false);
  const fsRef = useRef<FlatList<string>>(null);
  const galleryHeight = Math.round(width * 0.9);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const i = Math.round(e.nativeEvent.contentOffset.x / width);
    if (i !== index) setIndex(i);
  };

  return (
    <View style={{ width, height: galleryHeight, backgroundColor: t.colors.surfaceAlt }}>
      {images.length > 0 ? (
        <FlatList
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(u, i) => `${i}-${u}`}
          onMomentumScrollEnd={onScroll}
          renderItem={({ item, index: i }) => (
            <Pressable
              accessibilityRole="imagebutton"
              accessibilityLabel={`Photo ${i + 1} sur ${images.length} de ${title}. Toucher pour agrandir`}
              onPress={() => setFullscreen(true)}>
              <AppImage uri={item} style={{ width, height: galleryHeight }} />
            </Pressable>
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
      <View style={styles.dotsWrap}>
        <Dots count={images.length} index={index} light />
      </View>
      {images.length > 1 && (
        <View style={[styles.counter, { backgroundColor: t.colors.overlay }]}>
          <AppText variant="captionStrong" style={{ color: t.colors.onOverlay }}>
            {index + 1}/{images.length}
          </AppText>
        </View>
      )}
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
            onMomentumScrollEnd={onScroll}
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
          <View style={[styles.fsDots, { bottom: insets.bottom + 24 }]}>
            <Dots count={images.length} index={index} light />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { alignItems: 'center', justifyContent: 'center', gap: 6 },
  dotsWrap: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  dots: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 },
  counter: { position: 'absolute', bottom: 10, right: 12, paddingHorizontal: 8, paddingVertical: 2, borderRadius: 999 },
  fsBg: { flex: 1, backgroundColor: '#000' },
  fsItem: { flexGrow: 1, alignItems: 'center', justifyContent: 'center' },
  fsClose: { position: 'absolute', right: 12 },
  fsDots: { position: 'absolute', left: 0, right: 0, alignItems: 'center' },
});
