// app/set-password.tsx — Choose a password after phone verification
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import IconButton from '@/components/atoms/IconButton';
import TextField from '@/components/atoms/TextField';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { haptics } from '@/lib/haptics';
import { useTheme } from '@/theme';

/**
 * Rules mirror the backend password policy (letters and digits only,
 * at least one of each, ≥ 8 characters), shown as a live checklist so the
 * user sees progress instead of an error after the fact (Norman).
 */
function passwordRules(pw: string, repeat: string) {
  return {
    length: pw.length >= 8,
    letter: /[A-Za-z]/.test(pw),
    digit: /[0-9]/.test(pw),
    charset: pw.length > 0 && /^[A-Za-z0-9]+$/.test(pw),
    match: pw.length > 0 && pw === repeat,
  };
}

function Rule({ ok, label }: { ok: boolean; label: string }) {
  const t = useTheme();
  return (
    <View
      style={styles.rule}
      accessibilityRole="text"
      accessibilityLabel={`${label} : ${ok ? 'validé' : 'non validé'}`}>
      <Ionicons
        name={ok ? 'checkmark-circle' : 'ellipse-outline'}
        size={18}
        color={ok ? t.colors.success : t.colors.inkSubtle}
      />
      <AppText variant="small" color={ok ? 'ink' : 'inkMuted'}>
        {label}
      </AppText>
    </View>
  );
}

export default function SetPasswordScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [visible, setVisible] = useState(false);

  const r = useMemo(() => passwordRules(password, repeatPassword), [password, repeatPassword]);
  const canContinue = r.length && r.letter && r.digit && r.charset && r.match;

  const handleContinue = () => {
    if (!canContinue) return;
    haptics.success();
    // Persisting the password is not wired yet (phone OTP is the login
    // method); behaviour unchanged: continue into the app.
    router.replace('/(tabs)/home');
  };

  const eye = (
    <IconButton
      icon={visible ? 'eye-off-outline' : 'eye-outline'}
      label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
      onPress={() => setVisible((v) => !v)}
      color="inkMuted"
      size={20}
    />
  );

  return (
    <AuthScaffold
      title="Choisissez un mot de passe"
      subtitle={phone ? `Pour le compte ${phone}` : undefined}
      icon="lock-closed"
      onBack={() => router.back()}>
      <TextField
        label="Mot de passe"
        value={password}
        onChangeText={setPassword}
        secureTextEntry={!visible}
        autoCapitalize="none"
        autoComplete="password-new"
        textContentType="newPassword"
        right={eye}
      />
      <TextField
        label="Confirmez le mot de passe"
        value={repeatPassword}
        onChangeText={setRepeatPassword}
        secureTextEntry={!visible}
        autoCapitalize="none"
        textContentType="newPassword"
        error={repeatPassword.length > 0 && !r.match ? 'Les mots de passe ne correspondent pas' : null}
        containerStyle={styles.gap}
      />

      <View style={styles.rules}>
        <Rule ok={r.length} label="Au moins 8 caractères" />
        <Rule ok={r.letter} label="Au moins une lettre" />
        <Rule ok={r.digit} label="Au moins un chiffre" />
        <Rule ok={r.charset} label="Lettres et chiffres uniquement" />
        <Rule ok={r.match} label="Les deux mots de passe sont identiques" />
      </View>

      <Button
        label="Terminer"
        onPress={handleContinue}
        disabled={!canContinue}
        disabledReason={!canContinue ? 'Cochez toutes les règles pour continuer' : undefined}
        fullWidth
        size="lg"
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  gap: { marginTop: 8 },
  rules: { gap: 8, marginVertical: 20 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
