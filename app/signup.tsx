// app/signup.tsx - Signup screen
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';
import auth from '@react-native-firebase/auth';
import * as Localization from 'expo-localization';
import { Link, useRouter } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import CountryPicker, {
  Country,
  CountryCode,
  getCallingCode,
} from 'react-native-country-picker-modal';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { theme } from '../utils/theme';

export default function SignupScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setConfirmation, setPhoneNumber } = usePhoneAuth();

  // Country/phone state
  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [callingCode, setCallingCode] = useState<string>('1');
  const [showCountryPicker, setShowCountryPicker] = useState(false);
  const [nationalNumber, setNationalNumber] = useState('');
  const [loading, setLoading] = useState(false);

  // Legacy password fields removed for phone-based signup

  useEffect(() => {
    // Auto-detect country using device locale
    const region = (Localization as any).region as CountryCode | undefined;
    const fallback = Array.isArray(Localization.getLocales)
      ? (Localization.getLocales()[0]?.regionCode as CountryCode | undefined)
      : undefined;
    const detected = region || fallback;
    if (detected) {
      setCountryCode(detected);
    }
  }, []);

  useEffect(() => {
    // Resolve calling code whenever country changes
    (async () => {
      try {
        const code = await getCallingCode(countryCode);
        if (code) setCallingCode(code);
      } catch {}
    })();
  }, [countryCode]);

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    if (country.callingCode && country.callingCode.length > 0) {
      setCallingCode(country.callingCode[0]);
    }
  };

  // Keep calling code in sync when country changes (for auto-detected region)
  // No custom header required for the country picker

  const fullE164 = useMemo(() => {
    const raw = `+${callingCode}${nationalNumber.replace(/\D/g, '')}`;
    const parsed = parsePhoneNumberFromString(raw);
    return parsed?.isValid() ? parsed.number : raw;
  }, [callingCode, nationalNumber]);

  const handleSignup = async () => {
    if (!nationalNumber.trim()) {
      return;
    }

    // Validate phone number format
    const parsed = parsePhoneNumberFromString(fullE164);
    if (!parsed || !parsed.isValid()) {
      Alert.alert('Invalid Phone Number', 'Please enter a valid phone number.');
      return;
    }

    setLoading(true);

    try {
      // Send OTP code via Firebase Auth
      const confirmation = await auth().signInWithPhoneNumber(fullE164);
      
      // Store confirmation and phone number in context for the verify screen
      setConfirmation(confirmation);
      setPhoneNumber(fullE164);
      
      setLoading(false);
      
      // Navigate to OTP verification with phone number
      router.push({
        pathname: '/verify-number',
        params: { 
          phone: fullE164,
        },
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Firebase signup error:', error);
      
      let errorMessage = 'Failed to send verification code. Please try again.';
      
      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Invalid phone number format. Please check and try again.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Too many requests. Please try again later.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'SMS quota exceeded. Please try again later.';
      }
      
      Alert.alert('Error', errorMessage);
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
          <Text style={styles.title}>Rejoignez-nous dès aujourd's hui !</Text>

          {/* Phone Number with Country Picker */}
          <View style={styles.phoneRow}>
            <View style={styles.countryPickerButton}>
              <CountryPicker
                withFilter
                withFlag
                withCallingCode
                countryCode={countryCode}
                onSelect={onSelectCountry}
                containerButtonStyle={styles.countryPickerInner}
                modalProps={{
                  style: {
                    margin: 0,
                  },
                }}
                flatListProps={{
                  contentContainerStyle: {
                    paddingTop: insets.top,
                  },
                } as any}
              />
              <Text style={styles.callingCodeText}>{`+${callingCode}`}</Text>
            </View>

            <TextInput
              style={[styles.input, styles.nationalInput]}
              placeholder="Phone number"
              placeholderTextColor="#999"
              value={nationalNumber}
              onChangeText={setNationalNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          {/* Helper text */}
          <Text style={styles.helperText}>
            We’ll send a verification code to this number.
          </Text>

          {/* Spacer */}
          <View style={styles.requirementsContainer} />

          {/* Already have account link */}
          <View style={styles.loginLinkContainer}>
            <Text style={styles.loginText}>Déjà un compte ? </Text>
            <Link href="/login" asChild>
              <TouchableOpacity>
                <Text style={styles.loginLink}>Connectez-vous !</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              ((!nationalNumber || nationalNumber.replace(/\D/g, '').length < 6) || loading) && styles.continueButtonDisabled,
            ]}
            onPress={handleSignup}
            disabled={!nationalNumber || nationalNumber.replace(/\D/g, '').length < 6 || loading}
          >
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
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 40,
    lineHeight: 40,
  },
  phoneRow: {
    flexDirection: 'row',
    gap: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  countryPickerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 56,
    minWidth: 96,
  },
  countryPickerInner: {
    flexDirection: 'row',
    alignItems: 'center',
    height: '100%',
    paddingVertical: 0,
  },
  callingCodeText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
    marginLeft: 8,
  },
  nationalInput: {
    flex: 1,
  },
  countryHeader: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
    fontSize: 16,
    color: '#333',
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 24,
    paddingLeft: 4,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  loginLinkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 32,
  },
  loginText: {
    fontSize: 15,
    color: '#666',
  },
  loginLink: {
    fontSize: 15,
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

