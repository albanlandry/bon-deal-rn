// app/login.tsx - Login screen (phone OTP)
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

export default function LoginScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { setConfirmation, setPhoneNumber } = usePhoneAuth();

  const [countryCode, setCountryCode] = useState<CountryCode>('US');
  const [callingCode, setCallingCode] = useState<string>('1');
  const [nationalNumber, setNationalNumber] = useState('');
  const [loading, setLoading] = useState(false);

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

  const fullE164 = useMemo(() => {
    const raw = `+${callingCode}${nationalNumber.replace(/\D/g, '')}`;
    const parsed = parsePhoneNumberFromString(raw);
    return parsed?.isValid() ? parsed.number : raw;
  }, [callingCode, nationalNumber]);

  const handleLogin = async () => {
    if (!nationalNumber.trim()) {
      return;
    }

    const parsed = parsePhoneNumberFromString(fullE164);
    if (!parsed || !parsed.isValid()) {
      Alert.alert('Numéro invalide', 'Veuillez saisir un numéro de téléphone valide.');
      return;
    }

    setLoading(true);

    try {
      // Send OTP code via Firebase Auth
      const confirmation = await auth().signInWithPhoneNumber(fullE164);

      // Store confirmation + phone number for the verify screen
      setConfirmation(confirmation);
      setPhoneNumber(fullE164);

      setLoading(false);

      // Verify in "login" mode — on success, route straight to the app
      router.push({
        pathname: '/verify-number',
        params: { phone: fullE164, mode: 'login' },
      });
    } catch (error: any) {
      setLoading(false);
      console.error('Firebase login error:', error);

      let errorMessage = "Échec de l'envoi du code de vérification. Veuillez réessayer.";

      if (error.code === 'auth/invalid-phone-number') {
        errorMessage = 'Format de numéro invalide. Veuillez vérifier et réessayer.';
      } else if (error.code === 'auth/too-many-requests') {
        errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
      } else if (error.code === 'auth/quota-exceeded') {
        errorMessage = 'Quota SMS dépassé. Veuillez réessayer plus tard.';
      }

      Alert.alert('Erreur', errorMessage);
    }
  };

  const canSubmit =
    !!nationalNumber && nationalNumber.replace(/\D/g, '').length >= 6 && !loading;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>Connectez-vous à votre compte</Text>

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
                modalProps={{ style: { margin: 0 } }}
                flatListProps={
                  {
                    contentContainerStyle: { paddingTop: insets.top },
                  } as any
                }
              />
              <Text style={styles.callingCodeText}>{`+${callingCode}`}</Text>
            </View>

            <TextInput
              style={[styles.input, styles.nationalInput]}
              placeholder="Numéro de téléphone"
              placeholderTextColor="#999"
              value={nationalNumber}
              onChangeText={setNationalNumber}
              keyboardType="phone-pad"
              autoCapitalize="none"
            />
          </View>

          {/* Helper text */}
          <Text style={styles.helperText}>
            Nous vous enverrons un code de vérification à ce numéro.
          </Text>

          {/* Signup link */}
          <View style={styles.signupLinkContainer}>
            <Text style={styles.signupText}>Pas de compte? </Text>
            <Link href="/signup" asChild>
              <TouchableOpacity>
                <Text style={styles.signupLink}>Inscrivez vous !</Text>
              </TouchableOpacity>
            </Link>
          </View>

          {/* Validate Button */}
          <TouchableOpacity
            style={[styles.validateButton, !canSubmit && styles.validateButtonDisabled]}
            onPress={handleLogin}
            disabled={!canSubmit}>
            {loading ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.validateButtonText}>Valider</Text>
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
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    height: 56,
    fontSize: 16,
    color: '#333',
  },
  nationalInput: {
    flex: 1,
  },
  helperText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  signupLinkContainer: {
    flexDirection: 'row',
    marginBottom: 60,
    marginTop: 8,
  },
  signupText: {
    fontSize: 15,
    color: '#666',
  },
  signupLink: {
    fontSize: 15,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  validateButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  validateButtonDisabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  validateButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});
