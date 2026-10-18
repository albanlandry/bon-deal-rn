// components/molecules/OTPInput.tsx — OTP/PIN input rendered as chunked boxes
// (3 + 3 for a 6-digit code, Miller chunking). A single hidden TextInput
// drives the boxes, so paste and SMS autofill (Android sms-otp / iOS
// oneTimeCode) fill every box at once.
import React, { forwardRef, useImperativeHandle, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import { useTheme } from '@/theme';

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
  { length = 6, maskChar, onComplete, onChange, error = false, autoFocus = true },
  ref,
) {
  const t = useTheme();
  const n = Math.max(1, length);
  const [value, setValue] = useState('');
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

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
    <Pressable
      onPress={() => inputRef.current?.focus()}
      accessibilityRole="none"
      accessibilityLabel={`Code de vérification à ${n} chiffres, ${value.length} saisis`}
      style={styles.container}>
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
                  <View
                    key={i}
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
                  </View>
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
    </Pressable>
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
