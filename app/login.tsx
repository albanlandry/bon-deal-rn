// app/login.tsx — Login with phone + SMS code (Firebase)
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import AuthPhoneForm from '@/components/organisms/AuthPhoneForm';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';

export default function LoginScreen() {
  const router = useRouter();
  const { setConfirmation, setPhoneNumber } = usePhoneAuth();

  return (
    <AuthScaffold
      title="Bon retour !"
      subtitle="Connectez-vous avec votre numéro de téléphone."
      onBack={router.canGoBack() ? () => router.back() : undefined}
      footer={
        <View style={styles.footer}>
          <AppText variant="small" color="inkMuted">
            Pas encore de compte ?
          </AppText>
          <Button label="Créer un compte" variant="ghost" size="sm" onPress={() => router.push('/signup')} />
        </View>
      }>
      <AuthPhoneForm
        submitLabel="Recevoir le code"
        onCodeSent={(confirmation, e164) => {
          setConfirmation(confirmation);
          setPhoneNumber(e164);
          // Verify in "login" mode — on success, route straight to the app.
          router.push({ pathname: '/verify-number', params: { phone: e164, mode: 'login' } });
        }}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
});
