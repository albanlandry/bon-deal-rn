// app/verify-number.tsx - Number verification screen
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useState } from 'react';
import {
    ActivityIndicator,
    Alert,
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
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';

export default function VerifyNumberScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const { confirmation, phoneNumber, setConfirmation, clearAuth } = usePhoneAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  const handleOtpComplete = (code: string) => {
    setOtp(code);
  };

  const handleContinue = async () => {
    if (otp.length !== 6) {
      return;
    }

    if (!confirmation) {
      Alert.alert('Error', 'Verification session expired. Please request a new code.');
      return;
    }

    setLoading(true);

    try {
      // Verify the OTP code with Firebase
      const userCredential = await confirmation.confirm(otp);
      
      // Clear the auth context
      clearAuth();
      
      // Navigate to profile setup on successful verification
      router.push({ 
        pathname: '/setup-profile', 
        params: { phone: phone || phoneNumber || '' } 
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Firebase verification error:', error);
      
      let errorMessage = 'Invalid verification code. Please try again.';
      
      if (error.code === 'auth/invalid-verification-code') {
        errorMessage = 'Invalid verification code. Please check and try again.';
      } else if (error.code === 'auth/code-expired') {
        errorMessage = 'Verification code has expired. Please request a new code.';
        clearAuth();
      } else if (error.code === 'auth/session-expired') {
        errorMessage = 'Verification session expired. Please request a new code.';
        clearAuth();
      }
      
      Alert.alert('Verification Failed', errorMessage);
      setOtp(''); // Clear OTP on error
    }
  };

  const handleResend = async () => {
    const phoneToUse = phone || phoneNumber;
    
    if (!phoneToUse) {
      Alert.alert('Error', 'Phone number not found. Please go back and try again.');
      return;
    }

    setResending(true);

    try {
      // Resend OTP code via Firebase Auth
      const newConfirmation = await auth().signInWithPhoneNumber(phoneToUse);
      
      // Update confirmation in context
      setConfirmation(newConfirmation);
      
      Alert.alert('Success', 'Verification code has been resent.');
    } catch (error: any) {
      console.error('Firebase resend error:', error);
      
      let errorMessage = 'Failed to resend verification code. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
    } finally {
      setResending(false);
    }
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
            onPress={handleResend}
            disabled={resending}>
            {resending ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={styles.resendText}>
                Vous n'avez pas reçu le code?{' '}
                <Text style={styles.resendLink}>Renvoyer</Text>
              </Text>
            )}
          </TouchableOpacity>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (otp.length !== 6 || loading) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={otp.length !== 6 || loading}>
            {loading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.continueButtonText}>Continuer</Text>
            )}
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

