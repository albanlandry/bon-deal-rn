// app/login.tsx — Login with phone + SMS code (Firebase), or phone + password
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import AuthPhoneForm from '@/components/organisms/AuthPhoneForm';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { useAuth } from '@/contexts/AuthContext';
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { haptics } from '@/lib/haptics';

/** What to show under the password field for a failed sign-in. */
function passwordLoginError(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === 'invalid_credentials') return 'Numéro ou mot de passe incorrect.';
    if (e.code === 'too_many_attempts') return 'Trop de tentatives. Réessayez dans 15 minutes ou connectez-vous par SMS.';
    if (e.code === 'account_banned') return 'Votre compte a été suspendu.';
  }
  return apiErrorMessage(e, 'Connexion impossible. Réessayez.');
}

export default function LoginScreen() {
  const router = useRouter();
  const { setConfirmation, setPhoneNumber } = usePhoneAuth();
  const { signInWithPassword } = useAuth();
  const [withPassword, setWithPassword] = useState(false);

  const submitPassword = async (e164: string, password: string): Promise<string | null> => {
    try {
      await signInWithPassword(e164, password);
      haptics.success();
      router.replace('/(tabs)/home');
      return null;
    } catch (e) {
      // No error haptic when offline: the user did nothing wrong.
      if (!(e instanceof ApiError && e.status === 0)) haptics.error();
      return passwordLoginError(e);
    }
  };

  return (
    <AuthScaffold
      title="Bon retour !"
      subtitle={
        withPassword
          ? 'Connectez-vous avec votre numéro et votre mot de passe.'
          : 'Connectez-vous avec votre numéro de téléphone.'
      }
      onBack={router.canGoBack() ? () => router.back() : undefined}
      footer={
        <View style={styles.footer}>
          <AppText variant="small" color="inkMuted">
            Pas encore de compte ?
          </AppText>
          <Button label="Créer un compte" variant="ghost" onPress={() => router.push('/signup')} />
        </View>
      }>
      {withPassword ? (
        <AuthPhoneForm key="password" submitAtBottom submitLabel="Se connecter" onPasswordSubmit={submitPassword} />
      ) : (
        <AuthPhoneForm
          submitAtBottom
          key="sms"
          submitLabel="Recevoir le code"
          onCodeSent={(confirmation, e164) => {
            setConfirmation(confirmation);
            setPhoneNumber(e164);
            // Verify in "login" mode — on success, route straight to the app.
            router.push({ pathname: '/verify-number', params: { phone: e164, mode: 'login' } });
          }}
        />
      )}
      <View style={styles.switch}>
        <Button
          label={withPassword ? 'Recevoir plutôt un code par SMS' : 'Se connecter avec un mot de passe'}
          variant="ghost"
          onPress={() => setWithPassword((v) => !v)}
        />
        {withPassword && (
          <AppText variant="small" color="inkMuted" style={styles.hint}>
            Mot de passe oublié ? Connectez-vous par SMS, puis choisissez-en un nouveau dans Paramètres.
          </AppText>
        )}
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  switch: { alignItems: 'center', marginTop: 8, gap: 4 },
  hint: { textAlign: 'center' },
});
