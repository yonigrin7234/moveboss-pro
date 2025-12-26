import { useState, useEffect, useCallback } from 'react';
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
import { useAuth } from '../../providers/AuthProvider';
import { useBiometricAuth, getBiometricTypeName } from '../../hooks/useBiometricAuth';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { ScreenContainer } from '../../components/ui';
import { Logo } from '../../components/ui/Logo';
import { haptics } from '../../lib/haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showBiometricPrompt, setShowBiometricPrompt] = useState(false);

  const { signIn } = useAuth();
  const {
    isAvailable: biometricAvailable,
    isEnabled: biometricEnabled,
    biometricType,
    authenticate,
    getStoredCredentials,
    enableBiometric,
  } = useBiometricAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // Auto-prompt for biometric login if enabled
  useEffect(() => {
    if (biometricEnabled && biometricAvailable) {
      handleBiometricLogin();
    }
  }, [biometricEnabled, biometricAvailable]);

  const handleBiometricLogin = useCallback(async () => {
    if (!biometricAvailable || !biometricEnabled) return;

    setError(null);
    const success = await authenticate();

    if (success) {
      const credentials = await getStoredCredentials();
      if (credentials) {
        setLoading(true);
        try {
          const { error: signInError } = await signIn(credentials.email, credentials.password);
          if (signInError) {
            setError('Biometric login failed. Please sign in with your password.');
            haptics.error();
          } else {
            haptics.success();
          }
        } catch (err) {
          setError('An error occurred. Please try again.');
          haptics.error();
        } finally {
          setLoading(false);
        }
      }
    }
  }, [biometricAvailable, biometricEnabled, authenticate, getStoredCredentials, signIn]);

  const handleLogin = async () => {
    const trimmedEmail = email.trim().toLowerCase();
    const trimmedPassword = password;

    if (!trimmedEmail || !trimmedPassword) {
      setError('Please enter email and password');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const { error: signInError } = await signIn(trimmedEmail, trimmedPassword);

      if (signInError) {
        console.log('Login error:', signInError.message);
        if (signInError.message.includes('Invalid login credentials')) {
          setError('Invalid email or password. Please check your credentials and try again.');
        } else if (signInError.message.includes('Network')) {
          setError('Network error. Please check your internet connection.');
        } else {
          setError(signInError.message);
        }
        haptics.error();
      } else {
        haptics.success();
        // Offer to enable biometric if available and not already enabled
        if (biometricAvailable && !biometricEnabled) {
          setShowBiometricPrompt(true);
        }
      }
    } catch (err) {
      console.error('Login exception:', err);
      setError('An unexpected error occurred. Please try again.');
      haptics.error();
    } finally {
      setLoading(false);
    }
  };

  const handleEnableBiometric = async () => {
    const success = await enableBiometric(email.trim().toLowerCase(), password);
    setShowBiometricPrompt(false);
    if (success) {
      haptics.success();
    }
  };

  const biometricName = getBiometricTypeName(biometricType);
  const isLoading = loading;

  // Show biometric enable prompt after successful login
  if (showBiometricPrompt && biometricAvailable) {
    return (
      <ScreenContainer edges={['top', 'bottom']}>
        <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
          <Text style={styles.title}>Enable {biometricName}?</Text>
          <Text style={styles.promptSubtitle}>
            Sign in faster next time with {biometricName}
          </Text>

          <View style={styles.promptButtons}>
            <Pressable
              style={({ pressed }) => [
                styles.button,
                pressed && styles.buttonPressed,
              ]}
              onPress={handleEnableBiometric}
            >
              <Text style={styles.buttonText}>Enable {biometricName}</Text>
            </Pressable>

            <Pressable
              style={({ pressed }) => [
                styles.secondaryButton,
                pressed && styles.secondaryButtonPressed,
              ]}
              onPress={() => setShowBiometricPrompt(false)}
            >
              <Text style={styles.secondaryButtonText}>Maybe Later</Text>
            </Pressable>
          </View>
        </View>
      </ScreenContainer>
    );
  }

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom']}>
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
        <View style={styles.logoContainer}>
          <Logo size={72} />
          <View style={styles.brandText}>
            <Text style={styles.title}>MoveBoss</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          </View>
        </View>

        <View style={styles.form}>
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}

          {/* Email/Password Form */}
          <TextInput
            style={styles.input}
            placeholder="Email"
            placeholderTextColor={colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
            autoComplete="email"
            returnKeyType="next"
            editable={!isLoading}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={colors.textMuted}
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoComplete="password"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            editable={!isLoading}
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              isLoading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={isLoading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

          {/* Biometric Quick Sign In */}
          {biometricAvailable && biometricEnabled && (
            <Pressable
              style={({ pressed }) => [
                styles.biometricButton,
                isLoading && styles.buttonDisabled,
                pressed && styles.biometricButtonPressed,
              ]}
              onPress={handleBiometricLogin}
              disabled={isLoading}
            >
              <Text style={styles.biometricIcon}>
                {biometricType === 'face' ? '👤' : '👆'}
              </Text>
              <Text style={styles.biometricButtonText}>
                Sign in with {biometricName}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={({ pressed }) => [
              styles.forgotButton,
              pressed && styles.forgotButtonPressed,
            ]}
            onPress={() => {
              haptics.selection();
              router.push('/(auth)/forgot-password');
            }}
          >
            <Text style={styles.forgotButtonText}>Forgot Password?</Text>
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
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xxxl,
    gap: spacing.lg,
  },
  brandText: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  title: {
    ...typography.numericLarge,
    fontSize: 32,
    color: colors.textPrimary,
  },
  proBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  proText: {
    ...typography.buttonSmall,
    color: colors.background,
    fontWeight: '700',
  },
  promptSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xxxl,
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
  secondaryButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.border,
  },
  secondaryButtonPressed: {
    backgroundColor: colors.surfaceElevated,
  },
  secondaryButtonText: {
    ...typography.button,
    color: colors.textSecondary,
    fontSize: 16,
  },
  biometricButton: {
    backgroundColor: colors.surface,
    borderRadius: radius.button,
    padding: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    minHeight: 56,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  biometricButtonPressed: {
    backgroundColor: colors.primarySoft,
  },
  biometricIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  biometricButtonText: {
    ...typography.button,
    color: colors.primary,
    fontSize: 16,
  },
  promptButtons: {
    gap: spacing.md,
  },
  forgotButton: {
    padding: spacing.md,
    alignItems: 'center',
    minHeight: 44,
    justifyContent: 'center',
  },
  forgotButtonPressed: {
    opacity: 0.7,
  },
  forgotButtonText: {
    ...typography.button,
    color: colors.primary,
  },
});
