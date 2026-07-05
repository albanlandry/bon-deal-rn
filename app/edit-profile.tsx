// app/edit-profile.tsx - Edit Profile Screen
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';
import { ApiError } from '@/lib/api';
import { updateMe, uploadAvatar } from '@/lib/api/me';
import { quartiersQuery } from '@/lib/api/quartiers';
import { useAuth } from '@/contexts/AuthContext';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function saveErrorMessage(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.status === 409) return "Email, téléphone ou nom d'utilisateur déjà utilisé.";
    if (e.status === 422) return 'Certaines valeurs sont invalides.';
    if (e.status === 401) return 'Session expirée. Reconnectez-vous.';
    if (e.status >= 500) return 'Erreur serveur. Réessayez.';
    return e.message;
  }
  return 'Impossible de mettre à jour le profil. Réessayez.';
}

export default function EditProfileScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();

  const [firstName, setFirstName] = useState(user?.first_name ?? '');
  const [lastName, setLastName] = useState(user?.last_name ?? '');
  const [email, setEmail] = useState(user?.email ?? '');
  const [quartier, setQuartier] = useState(user?.quartier ?? '');
  const [avatarUri, setAvatarUri] = useState(user?.avatar_url ?? '');
  const [emailError, setEmailError] = useState('');

  const quartiersData = useQuery(quartiersQuery(user?.city));
  const quartiers = quartiersData.data?.quartiers ?? [];

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

  const save = useMutation({
    mutationFn: (patch: Record<string, unknown>) => updateMe(patch),
    onSuccess: async () => {
      await refreshUser();
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

  const handleSave = () => {
    if (email.trim() && !EMAIL_RE.test(email.trim())) {
      setEmailError('Email invalide');
      return;
    }
    const patch: Record<string, unknown> = {};
    if (firstName !== (user?.first_name ?? '')) patch.first_name = firstName.trim() || null;
    if (lastName !== (user?.last_name ?? '')) patch.last_name = lastName.trim() || null;
    if (email !== (user?.email ?? '')) patch.email = email.trim() || null;
    if (quartier !== (user?.quartier ?? '')) patch.quartier = quartier || null;

    if (Object.keys(patch).length === 0) {
      showToast.info('Aucune modification', 'Rien à enregistrer.');
      router.back();
      return;
    }
    save.mutate(patch);
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Modifier le profil</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Avatar Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Ionicons name="person" size={44} color={theme.colors.gray} />
                </View>
              )}
              {upload.isPending && (
                <View style={styles.avatarUploading}>
                  <ActivityIndicator color="#fff" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons name="camera" size={20} color="#fff" />
              </View>
            </TouchableOpacity>
            <TouchableOpacity onPress={handlePickImage} disabled={upload.isPending}>
              <Text style={styles.changePhotoText}>Changer la photo</Text>
            </TouchableOpacity>
          </View>

          {/* Form Fields */}
          <View style={styles.formSection}>
            <View style={styles.formField}>
              <Text style={styles.label}>Prénom</Text>
              <TextInput
                style={styles.input}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Votre prénom"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Nom</Text>
              <TextInput
                style={styles.input}
                value={lastName}
                onChangeText={setLastName}
                placeholder="Votre nom"
                placeholderTextColor="#999"
              />
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={[styles.input, emailError && styles.inputError]}
                value={email}
                onChangeText={(t) => {
                  setEmail(t);
                  if (emailError) setEmailError('');
                }}
                placeholder="votre@email.com"
                keyboardType="email-address"
                autoCapitalize="none"
                placeholderTextColor="#999"
              />
              {!!emailError && <Text style={styles.errorText}>{emailError}</Text>}
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Téléphone</Text>
              <TextInput
                style={styles.input}
                value={user?.phone_number ?? ''}
                editable={false}
                placeholder="—"
                placeholderTextColor="#999"
              />
              <Text style={styles.helperText}>Le numéro de téléphone ne peut pas être modifié.</Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Ville</Text>
              <TextInput
                style={styles.input}
                value={user?.city ?? ''}
                editable={false}
                placeholder="Ville non définie"
                placeholderTextColor="#999"
              />
              <Text style={styles.helperText}>
                Changer de ville modifie tout votre fil ; non modifiable ici.
              </Text>
            </View>

            <View style={styles.formField}>
              <Text style={styles.label}>Quartier</Text>
              <View style={styles.quartierChips}>
                <TouchableOpacity
                  style={[styles.chip, !quartier && styles.chipActive]}
                  onPress={() => setQuartier('')}>
                  <Text style={[styles.chipText, !quartier && styles.chipTextActive]}>Aucun</Text>
                </TouchableOpacity>
                {quartiers.map((q) => (
                  <TouchableOpacity
                    key={q.id}
                    style={[styles.chip, quartier === q.name && styles.chipActive]}
                    onPress={() => setQuartier(q.name)}>
                    <Text
                      style={[styles.chipText, quartier === q.name && styles.chipTextActive]}>
                      {q.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {!user?.city && (
                <Text style={styles.helperText}>Définissez d’abord votre ville.</Text>
              )}
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[styles.saveButton, save.isPending && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={save.isPending}>
            {save.isPending ? (
              <ActivityIndicator color={theme.colors.white} />
            ) : (
              <Text style={styles.saveButtonText}>Enregistrer</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.white,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  avatarSection: {
    alignItems: 'center',
    paddingVertical: theme.spacing.xl,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: theme.spacing.md,
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarFallback: {
    backgroundColor: '#F0F0F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarUploading: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 50,
    backgroundColor: 'rgba(0,0,0,0.4)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  changePhotoText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '600',
  },
  formSection: {
    paddingHorizontal: theme.spacing.lg,
    paddingVertical: theme.spacing.md,
  },
  formField: {
    marginBottom: theme.spacing.lg,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#333',
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  inputError: {
    borderColor: '#FF6B6B',
  },
  errorText: {
    fontSize: 12,
    color: '#FF6B6B',
    marginTop: 4,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  quartierChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
  },
  chip: {
    backgroundColor: '#F8F9FA',
    borderRadius: 20,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  chipTextActive: {
    color: theme.colors.white,
  },
  saveButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginHorizontal: theme.spacing.lg,
    marginTop: theme.spacing.lg,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: theme.colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
});
