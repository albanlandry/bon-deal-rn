// app/set-password.tsx - Set password after phone verification
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useMemo, useState } from 'react';
import {
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
import { theme } from '../utils/theme';

export default function SetPasswordScreen() {
  const router = useRouter();
  const { phone } = useLocalSearchParams<{ phone?: string }>();

  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');

  const requirements = useMemo(() => ({
    length: password.length >= 8,
    upper: /[A-Z]/.test(password),
    lower: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[!@#$%^&*(),.?":{}|<>_\-]/.test(password),
    match: password.length > 0 && password === repeatPassword,
  }), [password, repeatPassword]);

  const canContinue = requirements.length && requirements.upper && requirements.lower && requirements.number && requirements.special && requirements.match;

  const handleContinue = () => {
    if (!canContinue) return;
    // Here you would persist the password for the verified phone user
    // For now, just navigate to home or profile
    router.replace('/(tabs)/home');
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
          <Text style={styles.title}>Set your password</Text>
          {phone ? <Text style={styles.subtitle}>{phone}</Text> : null}

          {/* Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor="#999"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Repeat Password Input */}
          <TextInput
            style={styles.input}
            placeholder="Repeat password"
            placeholderTextColor="#999"
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            secureTextEntry
            autoCapitalize="none"
          />

          {/* Password Requirements */}
          <View style={styles.requirementsContainer}>
            <Requirement ok={requirements.length} label="Minimum of 8 characters" />
            <Requirement ok={requirements.upper} label="At least one uppercase letter (A-Z)" />
            <Requirement ok={requirements.lower} label="At least one lowercase letter (a-z)" />
            <Requirement ok={requirements.number} label="At least one number (0-9)" />
            <Requirement ok={requirements.special} label="At least one special character (!@#$%^&*)" />
            <Requirement ok={requirements.match} label="Passwords match" />
          </View>

          {/* Continue Button */}
          <TouchableOpacity
            style={[styles.continueButton, !canContinue && styles.continueButtonDisabled]}
            onPress={handleContinue}
            disabled={!canContinue}>
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Requirement({ ok, label }: { ok: boolean; label: string }) {
  return (
    <Text style={[styles.requirementText, ok && styles.requirementOk]}>
      {label}
    </Text>
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
    marginBottom: 8,
    lineHeight: 40,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  input: {
    backgroundColor: '#F8F9FA',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    marginBottom: 16,
    color: '#333',
  },
  requirementsContainer: {
    marginTop: 8,
    marginBottom: 24,
    paddingLeft: 4,
  },
  requirementText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
    lineHeight: 20,
  },
  requirementOk: {
    color: '#0A7D2E',
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


