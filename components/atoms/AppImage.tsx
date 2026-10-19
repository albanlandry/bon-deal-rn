/**
 * Image with blur-up placeholder and disk caching.
 *
 * Uses expo-image when its native module is present (after a dev-client
 * rebuild) and falls back to React Native's <Image> otherwise, so the JS
 * bundle keeps working on an older dev client.
 */
import { requireOptionalNativeModule } from 'expo';
import React, { useState } from 'react';
import { Image as RNImage, ImageStyle, StyleProp, StyleSheet, View } from 'react-native';
import { useTheme } from '@/theme';

let ExpoImage: any = null;
try {
  if (requireOptionalNativeModule('ExpoImage')) {
    ExpoImage = require('expo-image').Image;
  }
} catch {
  ExpoImage = null;
}

export interface AppImageProps {
  uri?: string | null;
  style?: StyleProp<ImageStyle>;
  contentFit?: 'cover' | 'contain';
  accessibilityLabel?: string;
  /** Delay-free transition when reduce-motion is on. */
  transition?: number;
  recyclingKey?: string;
}

export default function AppImage({
  uri,
  style,
  contentFit = 'cover',
  accessibilityLabel,
  transition = 200,
  recyclingKey,
}: AppImageProps) {
  const t = useTheme();
  const [loaded, setLoaded] = useState(false);
  const placeholderBg = { backgroundColor: t.colors.skeleton };

  if (!uri) {
    return <View style={[style as any, placeholderBg]} accessibilityLabel={accessibilityLabel} />;
  }

  if (ExpoImage) {
    return (
      <ExpoImage
        source={{ uri }}
        style={[style, placeholderBg]}
        contentFit={contentFit}
        transition={t.duration(transition)}
        cachePolicy="memory-disk"
        recyclingKey={recyclingKey}
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
      />
    );
  }

  return (
    <View style={[style as any, placeholderBg, styles.clip]}>
      <RNImage
        source={{ uri }}
        style={[StyleSheet.absoluteFill, { opacity: loaded ? 1 : 0 }]}
        resizeMode={contentFit}
        onLoad={() => setLoaded(true)}
        accessibilityLabel={accessibilityLabel}
        accessible={!!accessibilityLabel}
        fadeDuration={t.duration(transition)}
      />
    </View>
  );
}

const styles = StyleSheet.create({ clip: { overflow: 'hidden' } });
