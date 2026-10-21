// components/molecules/OTPInput.tsx — OTP/PIN input rendered as chunked boxes
// (3 + 3 for a 6-digit code, Miller chunking). A single hidden TextInput
// drives the boxes, so paste and SMS autofill (Android sms-otp / iOS
// oneTimeCode) fill every box at once.
//
// Motion (docs/09 §4): each box pops (1.05 → 1) as its digit arrives; a
// wrong code shakes the row 6 px × 3 (bump `shakeKey`). Transforms only,
// ReduceMotion.System through the motion helpers.
import React, { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withSequence } from 'react-native-reanimated';
import AppText from '@/components/atoms/AppText';
import { spring, timing } from '@/components/motion/anim';
import { useTheme } from '@/theme';
import { duration, shakeOffsets } from '@/theme/motion';

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/** One digit box; pops when its character appears. */
function OTPBox({ ch, children, style }: { ch?: string; children: React.ReactNode; style: any }) {
  const sc = useSharedValue(1);
  const had = useRef(!!ch);
  useEffect(() => {
    if (ch && !had.current) {
      sc.value = withSequence(timing(1.05, duration.press, 'standard'), spring(1, 'fast'));
    }
    had.current = !!ch;
  }, [ch, sc]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: sc.value }] }));
  return <Animated.View style={[style, anim]}>{children}</Animated.View>;
}

interface OTPInputProps {
  /** Number of digits in the OTP (minimum 1) */
  length: number;
  /** Optional mask character to hide input (e.g., '*' or '•') */
  maskChar?: string;
  /** Callback when OTP is complete */
  onComplete?: (otp: string) => void;
  /** Callback on every change */
  onChange?: (otp: string) => void;
  /** Error state: boxes turn red. */
  error?: boolean;
  /** Change this value (e.g. a counter) to shake the boxes — wrong code. */
  shakeKey?: number;
  autoFocus?: boolean;
}

export interface OTPInputHandle {
  clear: () => void;
  focus: () => void;
}

/** Group sizes: 6 → [3,3], 4 → [2,2], else one group. */
function groups(length: number): number[] {
  if (length >= 4 && length % 2 === 0) return [length / 2, length / 2];
  return [length];
}

const OTPInput = forwardRef<OTPInputHandle, OTPInputProps>(function OTPInput(
  { length = 6, maskChar, onComplete, onChange, error = false, autoFocus = true, shakeKey },
  ref,
) {
  const t = useTheme();
  const n = Math.max(1, length);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const shakeX = useSharedValue(0);

  useEffect(() => {
    if (!shakeKey) return;
    const steps = shakeOffsets(6, 3).map((x) => timing(x, 40, 'standard'));
    shakeX.value = withSequence(...steps);
  }, [shakeKey, shakeX]);
  const shakeStyle = useAnimatedStyle(() => ({ transform: [{ translateX: shakeX.value }] }));

  useImperativeHandle(ref, () => ({
    clear: () => {
      setValue('');
      onChange?.('');
      inputRef.current?.focus();
    },
    focus: () => inputRef.current?.focus(),
  }));

  const handleChange = (text: string) => {
    const digits = text.replace(/[^0-9]/g, '').slice(0, n);
    setValue(digits);
    onChange?.(digits);
    if (digits.length === n) onComplete?.(digits);
  };

  const active = Math.min(value.length, n - 1);
  let offset = 0;

  return (
    <AnimatedPressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel={`Code de vérification à ${n} chiffres, ${value.length} saisis`}
      style={[styles.container, shakeStyle]}>
      {groups(n).map((size, gi) => {
        const start = offset;
        offset += size;
        return (
          <React.Fragment key={gi}>
            {gi > 0 && <View style={[styles.dash, { backgroundColor: t.colors.line }]} />}
            <View style={styles.group}>
              {Array.from({ length: size }).map((_, k) => {
                const i = start + k;
                const ch = value[i];
                const isActive = focused && i === active && value.length < n + 1;
                const borderColor = error
                  ? t.colors.danger
                  : isActive
                    ? t.colors.brandStrong
                    : ch
                      ? t.colors.inkMuted
                      : t.colors.line;
                return (
                  <OTPBox
                    key={i}
                    ch={ch}
                    style={[
                      styles.box,
                      {
                        borderColor,
                        borderWidth: isActive || error ? 2 : 1,
                        borderRadius: t.radius.sm,
                        backgroundColor: t.colors.surface,
                      },
                    ]}>
                    <AppText variant="h2">{ch ? maskChar ?? ch : ''}</AppText>
                  </OTPBox>
                );
              })}
            </View>
          </React.Fragment>
        );
      })}
      <TextInput
        ref={inputRef}
        value={value}
        onChangeText={handleChange}
        maxLength={n}
        keyboardType="number-pad"
        textContentType="oneTimeCode"
        autoComplete="sms-otp"
        autoFocus={autoFocus}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        caretHidden
        accessibilityLabel="Code de vérification"
        style={styles.hidden}
      />
    </AnimatedPressable>
  );
});

export default OTPInput;

const styles = StyleSheet.create({
  container: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
  group: { flexDirection: 'row', gap: 8 },
  box: { width: 46, height: 56, alignItems: 'center', justifyContent: 'center' },
  dash: { width: 10, height: 2, borderRadius: 1 },
  hidden: { position: 'absolute', width: 1, height: 1, opacity: 0 },
});
