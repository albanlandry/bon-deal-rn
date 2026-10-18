/**
 * Phone-number form shared by login and signup: country picker (defaults to
 * Gabon, +241), national number, inline validation, and the Firebase
 * `signInWithPhoneNumber` call. The caller decides where to go next.
 */
import { Ionicons } from '@expo/vector-icons';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import CountryPicker, {
  Country,
  CountryCode,
  DARK_THEME,
  DEFAULT_THEME,
  getCallingCode,
} from 'react-native-country-picker-modal';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import TextField from '@/components/atoms/TextField';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

export interface AuthPhoneFormProps {
  submitLabel: string;
  /** Called with the Firebase confirmation and the E.164 number. */
  onCodeSent: (confirmation: FirebaseAuthTypes.ConfirmationResult, e164: string) => void;
}

function firebaseErrorMessage(code: string | undefined): string {
  switch (code) {
    case 'auth/invalid-phone-number':
      return 'Format de numéro invalide. Vérifiez et réessayez.';
    case 'auth/too-many-requests':
      return 'Trop de tentatives. Réessayez dans quelques minutes.';
    case 'auth/quota-exceeded':
      return 'Quota SMS dépassé. Réessayez plus tard.';
    case 'auth/network-request-failed':
      return 'Pas de connexion. Vérifiez votre réseau et réessayez.';
    default:
      return "Impossible d'envoyer le code. Réessayez.";
  }
}

export default function AuthPhoneForm({ submitLabel, onCodeSent }: AuthPhoneFormProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [countryCode, setCountryCode] = useState<CountryCode>('GA');
  const [callingCode, setCallingCode] = useState<string>('241');
  const [nationalNumber, setNationalNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const code = await getCallingCode(countryCode);
        if (code) setCallingCode(code);
      } catch {
        // keep the previous calling code
      }
    })();
  }, [countryCode]);

  const onSelectCountry = (country: Country) => {
    setCountryCode(country.cca2);
    if (country.callingCode?.length) setCallingCode(country.callingCode[0]);
    setError(null);
  };

  const digits = nationalNumber.replace(/\D/g, '');
  const fullE164 = useMemo(() => {
    const raw = `+${callingCode}${digits}`;
    const parsed = parsePhoneNumberFromString(raw);
    return parsed?.isValid() ? parsed.number : raw;
  }, [callingCode, digits]);

  const tooShort = digits.length < 6;

  const handleSubmit = async () => {
    if (tooShort) return;
    const parsed = parsePhoneNumberFromString(fullE164);
    if (!parsed || !parsed.isValid()) {
      setError('Ce numéro ne semble pas valide. Vérifiez le pays et les chiffres.');
      haptics.error();
      return;
    }
    setError(null);
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(fullE164);
      setLoading(false);
      onCodeSent(confirmation, fullE164);
    } catch (e: any) {
      setLoading(false);
      console.error('Firebase phone auth error:', e);
      setError(firebaseErrorMessage(e?.code));
      haptics.error();
    }
  };

  return (
    <View style={styles.wrap}>
      <AppText variant="labelStrong" style={styles.label}>
        Numéro de téléphone
      </AppText>
      <View style={styles.row}>
        <View
          style={[
            styles.country,
            {
              borderColor: t.colors.line,
              borderRadius: t.radius.sm,
              backgroundColor: t.colors.surface,
            },
          ]}
          accessibilityLabel={`Pays, indicatif +${callingCode}`}>
          <CountryPicker
            withFilter
            withFlag
            withCallingCode
            countryCode={countryCode}
            onSelect={onSelectCountry}
            theme={t.isDark ? DARK_THEME : DEFAULT_THEME}
            translation="fra"
            filterProps={{ placeholder: 'Rechercher un pays' }}
            modalProps={{ style: { margin: 0 } }}
            flatListProps={{ contentContainerStyle: { paddingTop: insets.top } } as any}
          />
          <AppText variant="bodyStrong">{`+${callingCode}`}</AppText>
          <Ionicons name="chevron-down" size={14} color={t.colors.inkMuted} />
        </View>
        <TextField
          containerStyle={styles.flex}
          placeholder="06 12 34 56"
          value={nationalNumber}
          onChangeText={(v) => {
            setNationalNumber(v);
            if (error) setError(null);
          }}
          keyboardType="phone-pad"
          autoComplete="tel-national"
          textContentType="telephoneNumber"
          accessibilityLabel="Numéro de téléphone"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={error}
          helper="Nous vous enverrons un code par SMS."
        />
      </View>
      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        disabled={tooShort}
        disabledReason={tooShort ? 'Saisissez votre numéro pour continuer' : undefined}
        fullWidth
        size="lg"
        haptic
        style={styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  label: { marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  submit: { marginTop: 16 },
});
