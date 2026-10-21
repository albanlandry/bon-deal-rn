// app/edit-profile.tsx — Modifier le profil
// Themed fields with inline validation (Norman); avatar upload is optimistic
// (Doherty). API calls unchanged: PATCH /auth/me, POST /auth/me/avatar.
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useTheme } from '@/theme';
import {
  AppText,
  Avatar,
  Button,
  ScreenHeader,
  TextField,
  showToast,
} from '@/components/ui';
import LocationPickerSheet from '@/components/organisms/LocationPickerSheet';
import { ApiError, apiErrorMessage } from '@/lib/api';
import { updateMe, uploadAvatar } from '@/lib/api/me';
import { locationSaveErrorMessage } from '@/lib/locationErrors';
import { useAuth } from '@/contexts/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saveErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 400) return locationSaveErrorMessage(e);
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status === 409) return apiErrorMessage(e, "Email, téléphone ou nom d'utilisateur déjà utilisé.");
    if (e.status === 422) return 'Certaines valeurs sont invalides.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
  }
  return apiErrorMessage(e, 'Impossible de mettre à jour le profil. Réessayez.');
}

export default function EditProfileScreen() {
  const router = useRouter();
  const t = useTheme();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [city, setCity] = useState(user?.city ?? '');
  const [quartier, setQuartier] = useState(user?.quartier ?? '');
  const [showLocation, setShowLocation] = useState(false);
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url ?? '');
  const [emailError, setEmailError] = useState('');

  const upload = useMutation({
    mutationFn: (uri: string) => uploadAvatar(uri),
    onSuccess: async (updated) => {
      setAvatarUri(updated.avatar_url ?? '');
      await refreshUser();
      showToast.success('Photo mise à jour');
    },
    onError: (e) => {
      setAvatarUri(user?.avatar_url ?? '');
      showToast.error('Échec', saveErrorMessage(e));
    },
  });

  const qc = useQueryClient();
  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateMe(patch),
    onSuccess: async (_d, patch) => {
      await refreshUser();
      if ('city' in patch) qc.invalidateQueries({ queryKey: ['posts'] });
      showToast.success('Profil mis à jour', 'Vos modifications ont été enregistrées.');
      router.back();
    },
    onError: (e) => showToast.error('Échec', saveErrorMessage(e)),
  });

  const pickAvatar = async (fromCamera: boolean) => {
    const result = fromCamera
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.6,
        });
    if (!result.canceled && result.assets[0]) {
      const uri = result.assets[0].uri;
      setAvatarUri(uri); // optimistic preview
      upload.mutate(uri);
    }
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission requise', 'Autorisez l’accès à vos photos.');
        return;
      }
      Alert.alert('Changer la photo', 'Choisissez une option', [
        { text: 'Annuler', style: 'cancel' },
        { text: 'Prendre une photo', onPress: () => pickAvatar(true) },
        { text: 'Choisir depuis la galerie', onPress: () => pickAvatar(false) },
      ]);
    } catch {
      showToast.error('Erreur', 'Impossible d’accéder aux photos.');
    }
  };

  const validateEmail = (value: string) => {
    const v = value.trim();
    setEmailError(v && !EMAIL_RE.test(v) ? 'Adresse e-mail invalide (ex. nom@exemple.com)' : '');
  };

  const dirty =
    firstName !== (user?.first_name ?? '') ||
    lastName !== (user?.last_name ?? '') ||
    email !== (user?.email ?? '') ||
    city !== (user?.city ?? '') ||
    quartier !== (user?.quartier ?? '');

  const handleSave = () => {
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setEmailError('Adresse e-mail invalide (ex. nom@exemple.com)');
      return;
    }
    const patch: Record<string, unknown> = {};
    if (firstName !== (user?.first_name ?? '')) patch.first_name = firstName.trim() || null;
    if (lastName !== (user?.last_name ?? '')) patch.last_name = lastName.trim() || null;
    if (email !== (user?.email ?? '')) patch.email = email.trim() || null;
    if (city !== (user?.city ?? '')) {
      // A new city: send its quartier too (possibly none), never the old one.
      patch.city = city;
      patch.quartier = quartier || null;
    } else if (quartier !== (user?.quartier ?? '')) patch.quartier = quartier || null;

    if (Object.keys(patch).length === 0) {
      showToast.info('Aucune modification', 'Rien à enregistrer.');
      router.back();
      return;
    }
    save.mutate(patch);
  };

  const displayName = [firstName, lastName].filter(Boolean).join(' ') || user?.username;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: t.colors.canvas }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.flex}>
        <ScreenHeader title="Modifier le profil" />

        <ScrollView
          style={styles.flex}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          {/* Avatar */}
          <View style={styles.avatarSection}>
            <Pressable
              onPress={handlePickImage}
              disabled={upload.isPending}
              accessibilityRole="button"
              accessibilityLabel="Changer la photo de profil">
              <Avatar uri={avatarUri || null} name={displayName} size={104} />
              {upload.isPending && (
                <View style={[styles.avatarUploading, { backgroundColor: t.colors.scrim }]}>
                  <ActivityIndicator color="#FFFFFF" />
                </View>
              )}
              <View
                style={[
                  styles.avatarEditBadge,
                  { backgroundColor: t.colors.brand, borderColor: t.colors.canvas },
                ]}>
                <Ionicons name="camera" size={18} color={t.colors.onBrand} />
              </View>
            </Pressable>
            <Button
              label={upload.isPending ? 'Envoi de la photo…' : 'Changer la photo'}
              variant="ghost"
              size="sm"
              onPress={handlePickImage}
              disabled={upload.isPending}
            />
          </View>

          <View style={styles.form}>
            <TextField
              label="Prénom"
              value={firstName}
              onChangeText={setFirstName}
              placeholder="Votre prénom"
              autoCapitalize="words"
              textContentType="givenName"
              maxLength={60}
            />
            <TextField
              label="Nom"
              value={lastName}
              onChangeText={setLastName}
              placeholder="Votre nom"
              autoCapitalize="words"
              textContentType="familyName"
              maxLength={60}
            />
            <TextField
              label="E-mail"
              value={email}
              onChangeText={(v) => {
                setEmail(v);
                if (emailError) validateEmail(v);
              }}
              onBlur={() => validateEmail(email)}
              error={emailError || null}
              helper="Facultatif. Utile pour récupérer votre compte."
              placeholder="votre@email.com"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              textContentType="emailAddress"
            />
            <TextField
              label="Téléphone"
              value={user?.phone_number ?? ''}
              editable={false}
              placeholder="—"
              helper={
                user?.phone_number
                  ? 'Vérifié par SMS. Le numéro ne peut pas être modifié.'
                  : 'Le numéro de téléphone ne peut pas être modifié ici.'
              }
              right={
                user?.phone_number ? (
                  <Ionicons name="shield-checkmark" size={18} color={t.colors.trust} />
                ) : undefined
              }
            />
            <View>
              <AppText variant="labelStrong" style={styles.label}>
                Ville et quartier
              </AppText>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Ville et quartier : ${city ? [quartier, city].filter(Boolean).join(', ') : 'non définis'}. Modifier`}
                onPress={() => setShowLocation(true)}
                style={({ pressed }) => [
                  styles.locationField,
                  {
                    borderColor: t.colors.line,
                    borderRadius: t.radius.sm,
                    backgroundColor: pressed ? t.colors.surfaceAlt : t.colors.surface,
                  },
                ]}>
                <Ionicons name="location-outline" size={18} color={t.colors.brandStrong} />
                <View style={styles.flex}>
                  <AppText variant="body" color={city ? 'ink' : 'inkSubtle'} numberOfLines={1}>
                    {city || 'Choisir ma ville'}
                  </AppText>
                  {!!city && (
                    <AppText variant="caption" color="inkMuted" numberOfLines={1}>
                      {quartier || 'Aucun quartier choisi'}
                    </AppText>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={t.colors.inkSubtle} />
              </Pressable>
              <AppText variant="caption" color="inkMuted" style={styles.helper}>
                Votre ville détermine votre fil d’annonces ; le quartier sert de lieu de retrait par défaut.
              </AppText>
            </View>
          </View>
        </ScrollView>

        <View style={[styles.footer, { borderTopColor: t.colors.line, backgroundColor: t.colors.surface }]}>
          <Button
            label="Enregistrer"
            onPress={handleSave}
            loading={save.isPending}
            disabled={!dirty || !!emailError}
            disabledReason={emailError ? 'Corrigez l’adresse e-mail' : !dirty ? 'Aucune modification' : undefined}
            fullWidth
            haptic
          />
        </View>
      </KeyboardAvoidingView>
      <LocationPickerSheet
        visible={showLocation}
        onClose={() => setShowLocation(false)}
        city={city || null}
        quartier={quartier || null}
        initialStep={city ? 'quartier' : 'city'}
        onConfirm={(c) => {
          setCity(c.city);
          setQuartier(c.quartier ?? '');
          setShowLocation(false);
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  avatarSection: { alignItems: 'center', gap: 4, marginBottom: 16 },
  avatarUploading: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
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
  form: { gap: 8 },
  label: { marginBottom: 8 },
  helper: { marginTop: 6 },
  locationField: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 52,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
  },
  footer: { padding: 16, borderTopWidth: StyleSheet.hairlineWidth },
});
