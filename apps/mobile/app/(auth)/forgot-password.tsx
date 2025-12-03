import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { ScreenContainer, Icon } from '../../components/ui';
import { haptics } from '../../lib/haptics';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email address');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: 'moveboss://reset-password',
    });
    setLoading(false);

    if (resetError) {
      setError(resetError.message);
      haptics.error();
    } else {
      setSent(true);
      haptics.success();
    }
  };

  if (sent) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
          <View style={styles.successIcon}>
            <Icon name="mail" size={48} color={colors.success} />
          </View>
          <Text style={styles.title}>Check Your Email</Text>
          <Text style={styles.message}>
            We've sent a password reset link to {email}
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              haptics.selection();
              router.back();
            }}
          >
            <Text style={styles.buttonText}>Back to Login</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom']}>
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
        <Text style={styles.title}>Reset Password</Text>
        <Text style={styles.subtitle}>
          Enter your email and we'll send you a reset link
        </Text>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="done"
            onSubmitEditing={handleResetPassword}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Send Reset Link</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => {
              haptics.selection();
              router.back();
            }}
          >
            <Text style={styles.backButtonText}>Back to Login</Text>
          </Pressable>
        </View>
      </View>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  inner: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.screenPadding,
  },
  successIcon: {
    alignSelf: 'center',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.successSoft,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    ...typography.hero,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
  },
  message: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xxl,
    lineHeight: 24,
  },
  form: {
    gap: spacing.lg,
  },
  errorContainer: {
    backgroundColor: colors.errorSoft,
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.error,
  },
  errorText: {
    ...typography.bodySmall,
    color: colors.error,
    textAlign: 'center',
  },
  input: {
    ...typography.body,
    backgroundColor: colors.inputBackground,
    borderRadius: radius.input,
    padding: spacing.inputPadding,
    color: colors.textPrimary,
    borderWidth: 1,
    borderColor: colors.border,
    minHeight: 56,
  },
  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.button,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.sm,
    minHeight: 56,
    ...shadows.glow,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonPressed: {
    backgroundColor: colors.primaryMuted,
  },
  buttonText: {
    ...typography.button,
    fontSize: 18,
  },
  backButton: {
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  backButtonPressed: {
    opacity: 0.7,
  },
  backButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
