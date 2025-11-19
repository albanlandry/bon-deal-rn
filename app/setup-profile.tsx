// app/setup-profile.tsx - Profile setup screen after phone verification
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useState } from 'react';
import {
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
import { showToast } from '../components/atoms/Toast';
import { theme } from '../utils/theme';

export default function SetupProfileScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();
  
  const [nickname, setNickname] = useState('');
  const [profileImage, setProfileImage] = useState<string | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!nickname.trim()) {
      newErrors.nickname = 'Le pseudonyme est requis';
    } else if (nickname.trim().length < 2) {
      newErrors.nickname = 'Le pseudonyme doit contenir au moins 2 caractères';
    } else if (nickname.trim().length > 30) {
      newErrors.nickname = 'Le pseudonyme ne peut pas dépasser 30 caractères';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission requise',
          'Nous avons besoin de votre permission pour accéder à vos photos.'
        );
        return;
      }

      Alert.alert(
        'Ajouter une photo de profil',
        'Choisissez une option',
        [
          { text: 'Annuler', style: 'cancel' },
          {
            text: 'Prendre une photo',
            onPress: async () => {
              const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
              }
            },
          },
          {
            text: 'Choisir depuis la galerie',
            onPress: async () => {
              const result = await ImagePicker.launchImageLibraryAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                allowsEditing: true,
                aspect: [1, 1],
                quality: 0.8,
              });
              if (!result.canceled && result.assets[0]) {
                setProfileImage(result.assets[0].uri);
              }
            },
          },
        ]
      );
    } catch (error) {
      showToast.error('Erreur', 'Impossible d\'accéder aux photos.');
    }
  };

  const handleRemoveImage = () => {
    Alert.alert(
      'Supprimer la photo',
      'Êtes-vous sûr de vouloir supprimer cette photo ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => setProfileImage(null),
        },
      ]
    );
  };

  const handleContinue = () => {
    if (!validateForm()) {
      showToast.error('Erreur de validation', 'Veuillez corriger les erreurs dans le formulaire.');
      return;
    }

    // TODO: Save profile image and nickname to backend
    // For now, navigate to set password with the data
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
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}>
          {/* Title */}
          <Text style={styles.title}>Configurez votre profil</Text>
          <Text style={styles.subtitle}>
            Ajoutez une photo et un pseudonyme pour personnaliser votre compte
          </Text>

          {/* Profile Image Section */}
          <View style={styles.avatarSection}>
            <TouchableOpacity onPress={handlePickImage} style={styles.avatarContainer}>
              {profileImage ? (
                <Image source={{ uri: profileImage }} style={styles.avatar} />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Ionicons name="camera" size={40} color="#999" />
                </View>
              )}
              <View style={styles.avatarEditBadge}>
                <Ionicons 
                  name={profileImage ? "pencil" : "camera"} 
                  size={20} 
                  color="#fff" 
                />
              </View>
            </TouchableOpacity>
            {profileImage ? (
              <TouchableOpacity onPress={handleRemoveImage}>
                <Text style={styles.removePhotoText}>Supprimer la photo</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity onPress={handlePickImage}>
                <Text style={styles.addPhotoText}>Ajouter une photo</Text>
              </TouchableOpacity>
            )}
            <Text style={styles.photoHelperText}>
              (Optionnel mais recommandé)
            </Text>
          </View>

          {/* Nickname Input */}
          <View style={styles.formSection}>
            <View style={styles.formField}>
              <Text style={styles.label}>Pseudonyme *</Text>
              <TextInput
                style={[styles.input, errors.nickname && styles.inputError]}
                value={nickname}
                onChangeText={(text) => {
                  setNickname(text);
                  if (errors.nickname) setErrors({ ...errors, nickname: '' });
                }}
                placeholder="Votre pseudonyme"
                placeholderTextColor="#999"
                maxLength={30}
                autoCapitalize="words"
              />
              {errors.nickname && (
                <Text style={styles.errorText}>{errors.nickname}</Text>
              )}
              <Text style={styles.helperText}>
                {nickname.length}/30 caractères
              </Text>
            </View>
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!nickname.trim() || nickname.trim().length < 2) && styles.continueButtonDisabled,
            ]}
            onPress={handleContinue}
            disabled={!nickname.trim() || nickname.trim().length < 2}>
            <Text style={styles.continueButtonText}>Continuer</Text>
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
  },
  title: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 12,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    lineHeight: 22,
  },
  avatarSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: theme.colors.primary,
  },
  avatarPlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#F8F9FA',
    borderWidth: 3,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: theme.colors.white,
  },
  addPhotoText: {
    fontSize: 16,
    color: theme.colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  removePhotoText: {
    fontSize: 16,
    color: '#FF6B6B',
    fontWeight: '600',
    marginBottom: 4,
  },
  photoHelperText: {
    fontSize: 13,
    color: '#999',
  },
  formSection: {
    marginBottom: 32,
  },
  formField: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
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
    marginTop: 8,
  },
  helperText: {
    fontSize: 12,
    color: '#666',
    marginTop: 8,
  },
  continueButton: {
    backgroundColor: theme.colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  continueButtonDisabled: {
    backgroundColor: '#B0B0B0',
    opacity: 0.6,
  },
  continueButtonText: {
    color: theme.colors.white,
    fontSize: 18,
    fontWeight: '600',
  },
});

