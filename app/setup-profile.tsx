// app/setup-profile.tsx — Profile setup after phone verification
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import { Alert, Pressable, StyleSheet, View } from 'react-native';
import AppImage from '@/components/atoms/AppImage';
import AppText from '@/components/atoms/AppText';
import Button from '@/components/atoms/Button';
import ProgressRing from '@/components/atoms/ProgressRing';
import TextField from '@/components/atoms/TextField';
import { showToast } from '@/components/atoms/Toast';
import AuthScaffold from '@/components/organisms/AuthScaffold';
import { apiFetch } from '@/lib/api';
import { uploadAvatar } from '@/lib/api/me';
import { acceptConsents } from '@/lib/api/account';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/theme';

const TOTAL_STEPS = 5;

function nicknameError(v: string): string | null {
  const s = v.trim();
  if (!s) return 'Le pseudonyme est requis';
  if (s.length < 2) return 'Au moins 2 caractères';
  if (s.length > 30) return '30 caractères maximum';
  return null;
}

export default function SetupProfileScreen() {
  const t = useTheme();
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  const { refreshUser } = useAuth();

  const [nickname, setNickname] = useState('');
  const [touched, setTouched] = useState(false);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Endowed progress: account created + phone verified are real, completed
  // steps by the time the user lands here (OTP succeeded). Nickname and photo
  // count live; the password is the 5th step on the next screen.
  const nicknameOk = nicknameError(nickname) === null;
  const done = 2 + (nicknameOk ? 1 : 0) + (profileImage ? 1 : 0);
  const error = touched ? nicknameError(nickname) : null;

  const pick = async (source: 'camera' | 'library') => {
    try {
      const perm =
        source === 'camera'
          ? await ImagePicker.requestCameraPermissionsAsync()
          : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert(
          'Permission requise',
          source === 'camera'
            ? 'Autorisez l’appareil photo pour prendre votre photo.'
            : 'Autorisez l’accès à vos photos pour en choisir une.',
        );
        return;
      }
      const opts: ImagePicker.ImagePickerOptions = {
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      };
      const result =
        source === 'camera'
          ? await ImagePicker.launchCameraAsync(opts)
          : await ImagePicker.launchImageLibraryAsync(opts);
      if (!result.canceled && result.assets[0]) setProfileImage(result.assets[0].uri);
    } catch {
      showToast.error('Erreur', 'Impossible d’accéder aux photos.');
    }
  };

  const handlePickImage = () => {
    Alert.alert('Photo de profil', 'Choisissez une option', [
      { text: 'Annuler', style: 'cancel' },
      { text: 'Prendre une photo', onPress: () => pick('camera') },
      { text: 'Choisir dans la galerie', onPress: () => pick('library') },
      ...(profileImage
        ? [{ text: 'Retirer la photo', style: 'destructive' as const, onPress: () => setProfileImage(null) }]
        : []),
    ]);
  };

  const handleContinue = async () => {
    setTouched(true);
    if (!nicknameOk) return;

    // Persist the nickname as the backend username. The Firebase→JWT exchange
    // may still be in flight; a 401 is transparently retried by the API
    // client. A failure (e.g. nickname taken) is surfaced but does not block
    // onboarding — the backend keeps the auto-generated username.
    setSaving(true);
    // Signup accepted the terms ("En continuant, vous acceptez…" on the
    // signup screen): record the current versions now that we have a session.
    // If this fails, the consent gate asks again before the tabs.
    try {
      await acceptConsents();
    } catch (e) {
      console.warn('[setup-profile] consent save failed:', e);
    }
    try {
      await apiFetch('/auth/me', {
        method: 'PATCH',
        body: { username: nickname.trim(), first_name: nickname.trim() },
      });
    } catch (e: any) {
      console.warn('[setup-profile] profile save failed:', e);
      showToast.error('Profil non enregistré', e?.message || 'Réessayez plus tard.');
    }
    if (profileImage) {
      try {
        await uploadAvatar(profileImage);
      } catch (e: any) {
        console.warn('[setup-profile] avatar upload failed:', e);
        showToast.error('Photo non enregistrée', 'Vous pourrez l’ajouter depuis votre profil.');
      }
    }
    await refreshUser();
    setSaving(false);

    router.push({
      pathname: '/set-password',
      params: {
        phone: phone || '',
        nickname: nickname.trim(),
        profileImage: profileImage || '',
      },
    });
  };

  return (
    <AuthScaffold
      title="Votre profil"
      subtitle="Un pseudo et une photo inspirent confiance aux acheteurs et vendeurs."
      hero={
        <View style={styles.hero}>
          <ProgressRing
            progress={done / TOTAL_STEPS}
            size={64}
            label={`${done} étapes sur ${TOTAL_STEPS} faites`}>
            <AppText variant="labelStrong">
              {done}/{TOTAL_STEPS}
            </AppText>
          </ProgressRing>
          <View style={styles.heroText}>
            <AppText variant="labelStrong">
              {done} étapes sur {TOTAL_STEPS} faites
            </AppText>
            <View style={styles.doneRow}>
              <Ionicons name="checkmark-circle" size={14} color={t.colors.trust} />
              <AppText variant="caption" color="inkMuted">
                Numéro vérifié
              </AppText>
            </View>
          </View>
        </View>
      }>
      <View style={styles.avatarSection}>
        <Pressable
          onPress={handlePickImage}
          accessibilityRole="button"
          accessibilityLabel={profileImage ? 'Changer la photo de profil' : 'Ajouter une photo de profil'}
          style={styles.avatarWrap}>
          {profileImage ? (
            <AppImage uri={profileImage} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.avatarEmpty, { backgroundColor: t.colors.brandTint }]}>
              <Ionicons name="camera-outline" size={36} color={t.colors.brandStrong} />
            </View>
          )}
          <View style={[styles.editBadge, { backgroundColor: t.colors.brand, borderColor: t.colors.canvas }]}>
            <Ionicons name={profileImage ? 'pencil' : 'add'} size={18} color={t.colors.onBrand} />
          </View>
        </Pressable>
        <AppText variant="caption" color="inkMuted">
          Photo facultative, mais recommandée
        </AppText>
      </View>

      <TextField
        label="Pseudonyme"
        value={nickname}
        onChangeText={setNickname}
        onBlur={() => setTouched(true)}
        placeholder="Ex. Awa241"
        maxLength={30}
        showCount
        autoCapitalize="words"
        error={error}
        helper="Visible par les autres membres."
      />

      <Button
        label="Continuer"
        onPress={handleContinue}
        loading={saving}
        disabled={!nicknameOk}
        disabledReason={!nicknameOk ? 'Choisissez un pseudonyme (2 caractères min.)' : undefined}
        fullWidth
        size="lg"
        style={styles.cta}
      />
    </AuthScaffold>
  );
}

const styles = StyleSheet.create({
  hero: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 20 },
  heroText: { gap: 2 },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  avatarSection: { alignItems: 'center', gap: 8, marginBottom: 20 },
  avatarWrap: { width: 112, height: 112 },
  avatar: { width: 112, height: 112, borderRadius: 56 },
  avatarEmpty: { alignItems: 'center', justifyContent: 'center' },
  editBadge: {
    position: 'absolute',
    right: 0,
    bottom: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cta: { marginTop: 8 },
});
