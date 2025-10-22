// components/molecules/OTPInput.tsx - Reusable OTP/PIN input widget
import React, { useRef, useState } from 'react';
import {
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { theme } from '../../utils/theme';

interface OTPInputProps {
  /** Number of digits in the OTP (minimum 1) */
  length: number;
  /** Optional mask character to hide input (e.g., '*' or '•') */
  maskChar?: string;
  /** Callback when OTP is complete */
  onComplete?: (otp: string) => void;
  /** Callback on every change */
  onChange?: (otp: string) => void;
}

export default function OTPInput({
  length = 6,
  maskChar,
  onComplete,
  onChange,
}: OTPInputProps) {
  const [otp, setOtp] = useState<string[]>(Array(length).fill(''));
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  const handleChange = (text: string, index: number) => {
    // Only allow numbers
    const numericText = text.replace(/[^0-9]/g, '');
    
    if (numericText.length === 0) {
      // Handle backspace
      const newOtp = [...otp];
      newOtp[index] = '';
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      
      // Move to previous input
      if (index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
      return;
    }

    // Handle paste or single digit
    if (numericText.length > 1) {
      // Handle paste of multiple digits
      const digits = numericText.split('').slice(0, length);
      const newOtp = [...otp];
      
      digits.forEach((digit, i) => {
        if (index + i < length) {
          newOtp[index + i] = digit;
        }
      });
      
      setOtp(newOtp);
      onChange?.(newOtp.join(''));
      
      // Move to next empty field or last field
      const nextIndex = Math.min(index + digits.length, length - 1);
      inputRefs.current[nextIndex]?.focus();
      
      // Check if complete
      if (newOtp.every((digit) => digit !== '')) {
        onComplete?.(newOtp.join(''));
      }
      return;
    }

    // Single digit input
    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);
    onChange?.(newOtp.join(''));

    // Auto-focus next input
    if (index < length - 1) {
      inputRefs.current[index + 1]?.focus();
    }

    // Check if complete
    if (newOtp.every((digit) => digit !== '')) {
      onComplete?.(newOtp.join(''));
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace' && otp[index] === '' && index > 0) {
      // If current input is empty and backspace is pressed, go to previous
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleFocus = (index: number) => {
    setFocusedIndex(index);
  };

  const handlePress = (index: number) => {
    inputRefs.current[index]?.focus();
  };

  return (
    <View style={styles.container}>
      {Array(length)
        .fill(0)
        .map((_, index) => (
          <TouchableOpacity
            key={index}
            activeOpacity={0.7}
            onPress={() => handlePress(index)}>
            <View
              style={[
                styles.inputBox,
                focusedIndex === index && styles.inputBoxFocused,
              ]}>
              <TextInput
                ref={(ref) => (inputRefs.current[index] = ref)}
                style={styles.input}
                maxLength={1}
                keyboardType="number-pad"
                value={maskChar && otp[index] ? maskChar : otp[index]}
                onChangeText={(text) => handleChange(text, index)}
                onKeyPress={(e) => handleKeyPress(e, index)}
                onFocus={() => handleFocus(index)}
                selectTextOnFocus
                caretHidden={false}
              />
              <Text style={styles.inputText}>
                {maskChar && otp[index] ? maskChar : otp[index]}
              </Text>
            </View>
          </TouchableOpacity>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  inputBox: {
    width: 56,
    height: 64,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E0E0E0',
    backgroundColor: theme.colors.white,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputBoxFocused: {
    borderColor: theme.colors.primary,
    backgroundColor: '#F0F8FF',
  },
  input: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    opacity: 0,
    fontSize: 24,
    textAlign: 'center',
  },
  inputText: {
    fontSize: 32,
    fontWeight: '600',
    color: '#000',
  },
});

