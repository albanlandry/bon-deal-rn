import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

interface AnimatedSplashScreenProps {
  onFinish: () => void;
}

export default function AnimatedSplashScreen({ onFinish }: AnimatedSplashScreenProps) {
  // Animation values
  const scale = useSharedValue(0);
  const opacity = useSharedValue(0);
  const slideY = useSharedValue(0);
  const rotation = useSharedValue(0);
  const gradientAnim = useSharedValue(0);
  const logoGlow = useSharedValue(0);
  const letterBTranslateX = useSharedValue(0); // Start centered, move left
  const letterDTranslateX = useSharedValue(0); // Start at B's position, move right
  const letterDOpacity = useSharedValue(0);

  useEffect(() => {
    // Gradient animation (continuous flow)
    gradientAnim.value = withRepeat(
      withTiming(360, {
        duration: 3000,
        easing: Easing.linear,
      }),
      -1,
      false
    );

    // Logo entrance animations
    scale.value = withSpring(1, {
      damping: 10,
      stiffness: 100,
    });

    opacity.value = withTiming(1, {
      duration: 1000,
      easing: Easing.out(Easing.ease),
    });

    logoGlow.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 1500, easing: Easing.inOut(Easing.ease) }),
        withTiming(0.5, { duration: 1500, easing: Easing.inOut(Easing.ease) })
      ),
      -1,
      true
    );

    // Text slide animation
    slideY.value = withSequence(
      withTiming(30, { duration: 400 }),
      withSpring(0, { damping: 15, stiffness: 100 })
    );

    // Rotation for logo
    rotation.value = withTiming(360, {
      duration: 2000,
      easing: Easing.out(Easing.ease),
    });

    // Both letters animate horizontally to be centered and on the same line
    // B moves to the left, D starts at center and moves to the right
    // Start after B's rotation completes (2000ms)
    letterBTranslateX.value = withDelay(
      2000,
      withTiming(-12, { // Move B to the left - adjusted for better centering
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );

    // D letter animation - start at center where B is, then move to the right
    letterDTranslateX.value = withDelay(
      2000,
      withTiming(28, { // Move D to the right - adjusted for better centering
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );

    letterDOpacity.value = withDelay(
      2000,
      withTiming(1, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      })
    );

    // Hide splash screen after animations complete
    const timer = setTimeout(() => {
      onFinish();
    }, 2900); // 2000ms (rotation) + 600ms (letter animation) + 300ms buffer

    return () => clearTimeout(timer);
  }, []);

  // Gradient positions animation
  const gradientStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      gradientAnim.value,
      [0, 360],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  // Animated styles
  const logoStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { rotate: `${rotation.value}deg` },
    ],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: logoGlow.value,
  }));

  const textStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: slideY.value }],
    opacity: opacity.value,
  }));

  const letterBStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: letterBTranslateX.value }],
  }));

  const letterDStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: letterDTranslateX.value }],
    opacity: letterDOpacity.value,
  }));

  return (
    <View style={styles.container}>
      {/* Animated Gradient Background */}
      <LinearGradient
        colors={['#667eea', '#764ba2', '#f093fb', '#4facfe', '#667eea']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      />
      
      {/* Animated overlay gradient for wave effect */}
      <Animated.View style={[styles.overlay, gradientStyle]}>
        <LinearGradient
          colors={['rgba(255,255,255,0.1)', 'rgba(255,255,255,0)', 'rgba(255,255,255,0.1)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.waveGradient}
        />
      </Animated.View>

      {/* Logo with glow effect */}
      <Animated.View style={[styles.logoContainer, logoStyle]}>
        <Animated.View style={[styles.logoGlowCircle, glowStyle]} />
        <View style={styles.logoCircle}>
          <LinearGradient
            colors={['#2f95dc', '#1e90ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.logoGradient}
          >
            <View style={styles.lettersContainer}>
              <Animated.View style={[letterBStyle, styles.bLetterWrapper]}>
                <Text style={styles.logoText}>B</Text>
              </Animated.View>
              <Animated.View style={[letterDStyle, styles.dLetterWrapper]}>
                <Text style={styles.logoTextD}>D</Text>
              </Animated.View>
            </View>
          </LinearGradient>
        </View>
        {/* Outer ring */}
        <View style={styles.logoRing} />
      </Animated.View>

      {/* App Name */}
      <Animated.View style={textStyle}>
        <Text style={styles.appName}>BonDeal</Text>
        <Text style={styles.tagline}>Your Marketplace, Your Deals</Text>
      </Animated.View>

      {/* Floating particles effect */}
      <View style={styles.particles}>
        {[...Array(6)].map((_, i) => (
          <View
            key={i}
            style={[
              styles.particle,
              {
                left: `${15 + i * 14}%`,
              },
            ]}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  overlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  waveGradient: {
    flex: 1,
    width: '200%',
  },
  logoContainer: {
    marginBottom: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoGlowCircle: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(47, 149, 220, 0.3)',
    shadowColor: '#2f95dc',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    elevation: 20,
  },
  logoCircle: {
    width: 140,
    height: 140,
    borderRadius: 70,
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#2f95dc',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 25,
    elevation: 15,
  },
  logoGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  lettersContainer: {
    position: 'relative',
    width: 120, // Fixed width to keep B centered
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bLetterWrapper: {
    position: 'absolute',
    left: 32, // Center B initially (adjust based on font size)
  },
  logoText: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  logoTextD: {
    fontSize: 56,
    fontWeight: 'bold',
    color: '#FFFFFF',
    textShadowColor: 'rgba(255, 255, 255, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  dLetterWrapper: {
    position: 'absolute',
    left: 32, // Start D at the same centered position as B
  },
  logoRing: {
    position: 'absolute',
    width: 165,
    height: 165,
    borderRadius: 82.5,
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  appName: {
    fontSize: 42,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 12,
    textAlign: 'center',
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
    letterSpacing: 1,
  },
  tagline: {
    fontSize: 16,
    color: 'rgba(255, 255, 255, 0.9)',
    textAlign: 'center',
    fontWeight: '400',
    letterSpacing: 0.5,
  },
  particles: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-start',
    paddingTop: 100,
  },
  particle: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
    elevation: 5,
  },
});

