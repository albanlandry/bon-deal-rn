// app/verify-number.tsx — Confirm the SMS code (Firebase phone auth)
import auth from '@react-native-firebase/auth';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import { showToast } from '@/components/atoms/Toast';
import OTPInput, { OTPInputHandle } from '@/components/molecules/OTPInput';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { DEV_OTP_CODE, useAuth } from '@/contexts/AuthContext';
import { usePhoneAuth } from '@/contexts/PhoneAuthContext';
import { ApiError } from '@/lib/api';
import { haptics } from '@/lib/haptics';
import { config } from '@/utils/config';

const RESEND_COOLDOWN_S = 30;

export default function VerifyNumberScreen() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const { confirmation, phoneNumber, setConfirmation, clearAuth } = usePhoneAuth();
  const { signInWithDevOtp } = useAuth();
  const [otp, setOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Bumped on a wrong code: the OTP boxes shake 6 px × 3 (docs/09 §4).
  const [shakeKey, setShakeKey] = useState(0);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_S);
  const otpRef = useRef<OTPInputHandle>(null);
  const phoneToShow = phone || phoneNumber || '';

  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const goNext = () => {
    haptics.success();
    clearAuth();
    if (mode === 'login') {
      router.replace('/(tabs)/home');
    } else {
      router.push({ pathname: '/setup-profile', params: { phone: phoneToShow } });
    }
  };

  /** Local test login: the backend checks the number and the fixed code. */
  const verifyDev = async (code: string) => {
    setError(null);
    setLoading(true);
    try {
      await signInWithDevOtp(phoneToShow, code);
      goNext();
    } catch (e) {
      setLoading(false);
      haptics.error();
      setShakeKey((k) => k + 1);
      setError(
        e instanceof ApiError && e.status === 401
          ? `Code incorrect. En mode test, le code est ${DEV_OTP_CODE}.`
          : "Connexion impossible. Le serveur accepte-t-il la connexion de test (DEV_OTP_ENABLED) ?",
      );
      setOtp('');
      otpRef.current?.clear();
    }
  };

  const verify = async (code: string) => {
    if (code.length !== 6 || loading) return;
    if (config.devLogin.enabled) return verifyDev(code);
    if (!confirmation) {
      setError('La session a expiré. Demandez un nouveau code.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await confirmation.confirm(code);
      // Firebase is now signed in — AuthContext exchanges the Firebase ID
      // token for a backend JWT in the background.
      goNext();
    } catch (e: any) {
      setLoading(false);
      console.error('Firebase verification error:', e);
      haptics.error();
      setShakeKey((k) => k + 1);
      let msg = 'Code incorrect. Vérifiez le SMS et réessayez.';
      if (e?.code === 'auth/code-expired') {
        msg = 'Ce code a expiré. Demandez-en un nouveau.';
        clearAuth();
      } else if (e?.code === 'auth/session-expired') {
        msg = 'La session a expiré. Demandez un nouveau code.';
        clearAuth();
      }
      setError(msg);
      setOtp('');
      otpRef.current?.clear();
    }
  };

  const handleResend = async () => {
    if (!phoneToShow) {
      setError('Numéro introuvable. Revenez en arrière et réessayez.');
      return;
    }
    if (config.devLogin.enabled) {
      showToast.success('Mode test', `Aucun SMS n'est envoyé : le code est ${DEV_OTP_CODE}.`);
      setCooldown(RESEND_COOLDOWN_S);
      return;
    }
    setResending(true);
    try {
      const next = await auth().signInWithPhoneNumber(phoneToShow);
      setConfirmation(next);
      setError(null);
      setCooldown(RESEND_COOLDOWN_S);
      showToast.success('Code renvoyé', `Un nouveau SMS a été envoyé au ${phoneToShow}.`);
    } catch (e: any) {
      console.error('Firebase resend error:', e);
      const msg =
        e?.code === 'auth/too-many-requests'
          ? 'Trop de tentatives. Réessayez plus tard.'
          : e?.code === 'auth/quota-exceeded'
            ? 'Quota SMS dépassé. Réessayez plus tard.'
            : "Impossible de renvoyer le code. Réessayez.";
      setError(msg);
    } finally {
      setResending(false);
    }
  };

  return (
    <AuthScaffold
      title="Entrez le code"
      subtitle={
        config.devLogin.enabled
          ? `Mode test pour le ${phoneToShow} : saisissez ${DEV_OTP_CODE}.`
          : phoneToShow
            ? `Envoyé par SMS au ${phoneToShow}`
            : 'Envoyé par SMS'
      }
      icon="chatbox-ellipses"
      onBack={() => router.back()}>
      <OTPInput
        ref={otpRef}
        length={6}
        error={!!error}
        shakeKey={shakeKey}
        onChange={(v) => {
          setOtp(v);
          if (error) setError(null);
        }}
        onComplete={verify}
      />
      <View style={styles.errorSlot}>
        {!!error && (
          <AppText variant="small" color="danger" align="center" accessibilityLiveRegion="polite">
            {error}
          </AppText>
        )}
      </View>

      <Button
        label="Vérifier"
        onPress={() => verify(otp)}
        loading={loading}
        disabled={otp.length !== 6}
        disabledReason={otp.length !== 6 ? 'Saisissez les 6 chiffres du code' : undefined}
        fullWidth
        size="lg"
      />

      <View style={styles.resend}>
        <AppText variant="small" color="inkMuted">
          Pas reçu le code ?
        </AppText>
        <Button
          label={cooldown > 0 ? `Renvoyer dans ${cooldown} s` : 'Renvoyer'}
          variant="ghost"
          size="sm"
          onPress={handleResend}
          loading={resending}
          disabled={cooldown > 0}
        />
      </View>
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  errorSlot: { minHeight: 44, justifyContent: 'center', paddingVertical: 8 },
  resend: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 16, flexWrap: 'wrap' },
});
