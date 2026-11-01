/**
 * Phone-number form shared by login and signup: country picker (defaults to
 * the default country from /app-config, enabled countries only), national number, inline validation, and the Firebase
 * `signInWithPhoneNumber` call. The caller decides where to go next.
 *
 * Local test login (config.devLogin): no SMS is sent; only the configured
 * number is accepted, and the code screen takes the fixed code 123456.
 *
 * With `onPasswordSubmit` (login screen, "mot de passe" mode) it asks for the
 * password instead and sends no SMS; any number may try.
 */
import { Ionicons } from '@expo/vector-icons';
import auth, { FirebaseAuthTypes } from '@react-native-firebase/auth';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import { useQuery } from '@tanstack/react-query';
import React, { useEffect, useMemo, useRef, useState } from 'react';
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
import IconButton from '@/components/atoms/IconButton';
import TextField from '@/components/atoms/TextField';
import { appConfigQuery } from '@/lib/api/appConfig';
import { countriesQuery } from '@/lib/api/geo';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';
import { config } from '@/utils/config';

const DEV = config.devLogin;
const devPhone = DEV.enabled ? parsePhoneNumberFromString(DEV.phone) : undefined;
/** The test number as typed in the national field, e.g. "06 12 34 56". */
const DEV_NATIONAL = devPhone ? devPhone.formatNational() : '';
/** Test-login copy is for developers only, never in a release build. */
const SHOW_DEV_HINTS = __DEV__ && DEV.enabled;

export interface AuthPhoneFormProps {
  submitLabel: string;
  /** Push the submit button to the bottom of the available height. */
  submitAtBottom?: boolean;
  /** Called with the Firebase confirmation (null in local test login) and the E.164 number. */
  onCodeSent?: (confirmation: FirebaseAuthTypes.ConfirmationResult | null, e164: string) => void;
  /** Password mode: sign in with the number + password. Resolves to an error message, or null on success. */
  onPasswordSubmit?: (e164: string, password: string) => Promise<string | null>;
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
      return 'Impossible d’envoyer le code. Réessayez.';
  }
}

export default function AuthPhoneForm({
  submitLabel,
  submitAtBottom = false,
  onCodeSent,
  onPasswordSubmit,
}: AuthPhoneFormProps) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const [countryCode, setCountryCode] = useState<CountryCode>('GA');
  const [callingCode, setCallingCode] = useState<string>('241');
  const [nationalNumber, setNationalNumber] = useState(DEV_NATIONAL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const passwordMode = !!onPasswordSubmit;
  const [password, setPassword] = useState('');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Default to the platform's default country (/app-config), and offer only
  // the enabled countries (/geo/countries). Until they load (or if they fail)
  // the picker keeps Gabon and the full list.
  const appConfig = useQuery(appConfigQuery());
  const countries = useQuery(countriesQuery());
  const enabledCodes = useMemo(
    () => (countries.data ?? []).map((c) => c.iso2 as CountryCode),
    [countries.data],
  );
  const userPicked = useRef(false);
  const defaultCountry = appConfig.data?.default_country;
  useEffect(() => {
    if (userPicked.current || !defaultCountry?.iso2) return;
    setCountryCode(defaultCountry.iso2 as CountryCode);
    const code = defaultCountry.phone_code?.replace(/\D/g, '');
    if (code) setCallingCode(code);
  }, [defaultCountry?.iso2, defaultCountry?.phone_code]);

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
    userPicked.current = true;
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
  const missing = tooShort || (passwordMode && password.length === 0);

  const handleSubmit = async () => {
    if (missing) return;
    const parsed = parsePhoneNumberFromString(fullE164);
    if (!parsed || !parsed.isValid()) {
      setError('Ce numéro ne semble pas valide. Vérifiez le pays et les chiffres.');
      haptics.error();
      return;
    }
    setError(null);
    if (onPasswordSubmit) {
      setPasswordError(null);
      setLoading(true);
      const message = await onPasswordSubmit(parsed.number, password);
      setLoading(false);
      if (message) setPasswordError(message);
      return;
    }
    if (DEV.enabled) {
      if (parsed.number !== DEV.phone) {
        setError(
          SHOW_DEV_HINTS
            ? `Mode test : seul le ${devPhone?.formatInternational() ?? DEV.phone} est accepté.`
            : 'Ce numéro ne peut pas recevoir de code pour le moment.',
        );
        haptics.error();
        return;
      }
      onCodeSent?.(null, parsed.number);
      return;
    }
    setLoading(true);
    try {
      const confirmation = await auth().signInWithPhoneNumber(fullE164);
      setLoading(false);
      onCodeSent?.(confirmation, fullE164);
    } catch (e: any) {
      setLoading(false);
      console.error('Firebase phone auth error:', e);
      setError(firebaseErrorMessage(e?.code));
      // No error haptic when offline: the user did nothing wrong.
      if (e?.code !== 'auth/network-request-failed') haptics.error();
    }
  };

  return (
    <View style={[styles.wrap, submitAtBottom && styles.grow]}>
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
            withFilter={enabledCodes.length !== 1}
            countryCodes={enabledCodes.length ? enabledCodes : undefined}
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
          returnKeyType={passwordMode ? 'next' : 'done'}
          onSubmitEditing={passwordMode ? undefined : handleSubmit}
          error={error}
          helper={
            passwordMode
              ? undefined
              : SHOW_DEV_HINTS
                ? 'Mode test, sans SMS : le code est 123456.'
                : 'Nous vous enverrons un code par SMS.'
          }
        />
      </View>
      {passwordMode && (
        <TextField
          label="Mot de passe"
          value={password}
          onChangeText={(v) => {
            setPassword(v);
            if (passwordError) setPasswordError(null);
          }}
          secureTextEntry={!passwordVisible}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          returnKeyType="done"
          onSubmitEditing={handleSubmit}
          error={passwordError}
          containerStyle={styles.password}
          right={
            <IconButton
              icon={passwordVisible ? 'eye-off-outline' : 'eye-outline'}
              label={passwordVisible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
              onPress={() => setPasswordVisible((v) => !v)}
              color="inkMuted"
              size={20}
            />
          }
        />
      )}
      <Button
        label={submitLabel}
        onPress={handleSubmit}
        loading={loading}
        disabled={missing}
        disabledReason={
          tooShort
            ? 'Saisissez votre numéro pour continuer'
            : missing
              ? 'Saisissez votre mot de passe pour continuer'
              : undefined
        }
        fullWidth
        size="lg"
        haptic
        style={submitAtBottom ? styles.submitBottom : styles.submit}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignSelf: 'stretch' },
  label: { marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  country: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    minHeight: 48,
    paddingHorizontal: 12,
    borderWidth: 1,
  },
  flex: { flex: 1 },
  password: { marginTop: 16 },
  submit: { marginTop: 16 },
  grow: { flexGrow: 1 },
  submitBottom: { marginTop: 'auto', paddingTop: 24 },
});
