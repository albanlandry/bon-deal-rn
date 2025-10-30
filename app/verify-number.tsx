// app/verify-number.tsx - Number verification screen
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
    KeyboardAvoidingView,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import OTPInput from '../components/molecules/OTPInput';
import { theme } from '../utils/theme';

export default function VerifyNumberScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [otp, setOtp] = useState('');

  const handleOtpComplete = (code: string) => {
    console.log('OTP Complete:', code);
    setOtp(code);
    // Add verification logic here
  };

  const handleContinue = () => {
    if (otp.length === 6) {
      // Verify OTP then navigate to set password
      console.log('Verifying OTP:', otp);
      router.push({ pathname: '/set-password', params: { phone: phone || '' } });
    }
  };

  const handleResend = () => {
    console.log('Resend code');
    // Add resend logic here
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>Confirmez votre numéro</Text>

          {/* OTP Input */}
          <View style={styles.otpContainer}>
            <OTPInput
              length={6}
              onComplete={handleOtpComplete}
              onChange={setOtp}
            />
          </View>

          {/* Resend Code Link */}
          <TouchableOpacity
            style={styles.resendContainer}
            onPress={handleResend}>
            <Text style={styles.resendText}>
              Vous n'avez pas reçu le code?{' '}
              <Text style={styles.resendLink}>Renvoyer</Text>
            </Text>
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              otp.length !== 6 && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={otp.length !== 6}>
            <Text style={styles.continueButtonText}>Continuer</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 60,
    textAlign: 'center',
    lineHeight: 40,
  },
  otpContainer: {
    marginBottom: 40,
    alignItems: 'center',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  resendText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
  },
  resendLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueButtonDisabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  continueButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

