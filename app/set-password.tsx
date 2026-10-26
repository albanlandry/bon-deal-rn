// app/set-password.tsx — Choose or change the password for phone + password sign-in
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { parsePhoneNumberFromString } from 'libphonenumber-js';
import React, { useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import IconButton from '@/components/atoms/IconButton';
import TextField from '@/components/atoms/TextField';
import { showToast } from '@/components/atoms/Toast';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { useAuth } from '@/contexts/AuthContext';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { setMyPassword } from '@/lib/api/me';
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

/**
 * Two entry points: the last signup step (`phone` param, from setup-profile:
 * skippable, then into the app) and Settings (`mode=settings`: create or
 * change, then back). The current password is asked only when this session
 * was opened with the password; after an SMS sign-in it can be replaced
 * without it, which is how a forgotten password is reset.
 */
export default function SetPasswordScreen() {
  const router = useRouter();
  const { phone, mode } = useLocalSearchParams<{ phone?: string; mode?: string }>();
  const fromSettings = mode === 'settings';
  const { user, refreshUser, isPasswordSession, signInWithPassword } = useAuth();
  const changing = !!user?.has_password;
  const needsCurrent = changing && isPasswordSession;

  const [current, setCurrent] = useState('');
  const [currentError, setCurrentError] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [visible, setVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  const r = useMemo(() => passwordRules(password, repeatPassword), [password, repeatPassword]);
  const rulesOk = r.length && r.letter && r.digit && r.charset && r.match;
  const canContinue = rulesOk && (!needsCurrent || current.length > 0);

  const leave = () => {
    if (fromSettings) router.back();
    else router.replace('/(tabs)/home');
  };

  const handleContinue = async () => {
    if (!canContinue || saving) return;
    setSaving(true);
    setCurrentError(null);
    try {
      await setMyPassword({
        password,
        confirm_password: repeatPassword,
        ...(needsCurrent ? { current_password: current } : {}),
      });
    } catch (e) {
      setSaving(false);
      if (e instanceof ApiError && (e.code === 'current_password_invalid' || e.code === 'current_password_required')) {
        setCurrentError(e.code === 'current_password_invalid' ? 'Mot de passe actuel incorrect' : 'Saisissez votre mot de passe actuel');
        haptics.error();
        return;
      }
      if (!(e instanceof ApiError && e.status === 0)) haptics.error();
      showToast.error('Mot de passe non enregistré', apiErrorMessage(e, 'Réessayez dans un instant.'));
      return;
    }
    // A change ends the password sessions opened before it, this one included:
    // sign in again with the new password so the user stays connected.
    if (isPasswordSession && user?.phone_number) {
      await signInWithPassword(user.phone_number, password).catch(() => {});
    } else {
      await refreshUser();
    }
    setSaving(false);
    haptics.success();
    showToast.success(
      changing ? 'Mot de passe modifié' : 'Mot de passe enregistré',
      'Vous pouvez vous connecter avec votre numéro et ce mot de passe.',
    );
    leave();
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

  const rawAccount = phone || user?.phone_number;
  const account = rawAccount ? (parsePhoneNumberFromString(rawAccount)?.formatInternational() ?? rawAccount) : null;
  return (
    <AuthScaffold
      title={changing ? 'Changer de mot de passe' : 'Choisissez un mot de passe'}
      subtitle={
        changing
          ? 'Vos autres connexions par mot de passe seront fermées.'
          : `Pour vous connecter${account ? ` au compte ${account}` : ''} sans attendre de SMS.`
      }
      icon="lock-closed"
      onBack={() => router.back()}
      bottom={
        <>
          <Button
            label={fromSettings ? 'Enregistrer' : 'Terminer'}
            onPress={handleContinue}
            loading={saving}
            disabled={!canContinue}
            disabledReason={
              !canContinue
                ? needsCurrent && !current
                  ? 'Saisissez votre mot de passe actuel'
                  : 'Cochez toutes les règles pour continuer'
                : undefined
            }
            fullWidth
            size="lg"
          />
          {!fromSettings && (
            <Button label="Plus tard" variant="ghost" onPress={leave} disabled={saving} fullWidth />
          )}
        </>
      }>
      {needsCurrent && (
        <TextField
          label="Mot de passe actuel"
          value={current}
          onChangeText={(v) => {
            setCurrent(v);
            if (currentError) setCurrentError(null);
          }}
          secureTextEntry={!visible}
          autoCapitalize="none"
          autoComplete="password"
          textContentType="password"
          error={currentError}
          containerStyle={styles.current}
        />
      )}
      <TextField
        label={changing ? 'Nouveau mot de passe' : 'Mot de passe'}
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
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  current: { marginBottom: 16 },
  gap: { marginTop: 8 },
  rules: { gap: 8, marginTop: 20 },
  rule: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
