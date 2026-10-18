// app/signup.tsx — Sign up with phone + SMS code (Firebase)
import { useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import AuthPhoneForm from '@/components/organisms/AuthPhoneForm';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';

export default function SignupScreen() {
  const router = useRouter();
  const { setConfirmation, setPhoneNumber } = usePhoneAuth();

  return (
    <AuthScaffold
      title="Rejoignez BonDeal"
      subtitle="Achetez et vendez près de chez vous. Il suffit de votre numéro."
      icon="person-add"
      onBack={router.canGoBack() ? () => router.back() : undefined}
      footer={
        <View style={styles.footerCol}>
          <View style={styles.footer}>
            <AppText variant="small" color="inkMuted">
              Déjà un compte ?
            </AppText>
            <Button label="Se connecter" variant="ghost" size="sm" onPress={() => router.push('/login')} />
          </View>
        </View>
      }>
      <AuthPhoneForm
        submitLabel="Continuer"
        onCodeSent={(confirmation, e164) => {
          setConfirmation(confirmation);
          setPhoneNumber(e164);
          router.push({ pathname: '/verify-number', params: { phone: e164 } });
        }}
      />
      <AppText variant="caption" color="inkSubtle" align="center" style={styles.legal}>
        En continuant, vous acceptez les conditions d’utilisation de BonDeal.
      </AppText>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  footerCol: { alignItems: 'center' },
  footer: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' },
  legal: { marginTop: 12 },
});
