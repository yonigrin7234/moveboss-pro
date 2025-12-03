import { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { supabase } from '../../lib/supabase';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { ScreenContainer, Icon } from '../../components/ui';
import { haptics } from '../../lib/haptics';

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();

  // Handle the access_token from the deep link
  useEffect(() => {
    const handleDeepLink = async () => {
      const accessToken = params.access_token as string;
      const refreshToken = params.refresh_token as string;

      if (accessToken && refreshToken) {
        await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });
      }
    };

    handleDeepLink();
  }, [params]);

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      setError('Please fill in all fields');
      haptics.warning();
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      haptics.warning();
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);
    const { error: updateError } = await supabase.auth.updateUser({
      password: password,
    });
    setLoading(false);

    if (updateError) {
      setError(updateError.message);
      haptics.error();
    } else {
      setSuccess(true);
      haptics.success();
    }
  };

  if (success) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
          <View style={styles.successIcon}>
            <Icon name="check-circle" size={48} color={colors.success} />
          </View>
          <Text style={styles.title}>Password Updated</Text>
          <Text style={styles.message}>
            Your password has been successfully reset. You can now sign in with your new password.
          </Text>
          <Pressable
            style={({ pressed }) => [
              styles.button,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              haptics.selection();
              router.replace('/(auth)/login');
            }}
          >
            <Text style={styles.buttonText}>Go to Login</Text>
          </Pressable>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom']}>
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
        <Text style={styles.title}>Set New Password</Text>
        <Text style={styles.subtitle}>
          Enter your new password below
        </Text>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          <TextInput
            style={styles.input}
            placeholder="New Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="new-password"
            returnKeyType="next"
          />

          <TextInput
            style={styles.input}
            placeholder="Confirm Password"
            placeholderTextColor={colors.textMuted}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            autoComplete="new-password"
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
              <Text style={styles.buttonText}>Update Password</Text>
            )}
          </Pressable>

          <Pressable
            style={({ pressed }) => [
              styles.backButton,
              pressed && styles.backButtonPressed,
            ]}
            onPress={() => {
              haptics.selection();
              router.replace('/(auth)/login');
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
