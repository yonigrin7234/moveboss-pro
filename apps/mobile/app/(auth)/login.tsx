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
import { useAuth } from '../../providers/AuthProvider';
import { colors, typography, spacing, radius, shadows } from '../../lib/theme';
import { ScreenContainer } from '../../components/ui';
import { haptics } from '../../lib/haptics';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { signIn } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please enter email and password');
      haptics.warning();
      return;
    }

    setError(null);
    setLoading(true);
    const { error: signInError } = await signIn(email, password);
    setLoading(false);

    if (signInError) {
      setError(signInError.message);
      haptics.error();
    }
  };

  return (
    <ScreenContainer keyboardAvoiding edges={['top', 'bottom']}>
      <View style={[styles.inner, { paddingTop: insets.top + spacing.xxxl }]}>
        <Text style={styles.title}>MoveBoss</Text>
        <Text style={styles.subtitle}>Pro</Text>

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
            returnKeyType="next"
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
          />

          <Pressable
            style={({ pressed }) => [
              styles.button,
              loading && styles.buttonDisabled,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={colors.white} />
            ) : (
              <Text style={styles.buttonText}>Sign In</Text>
            )}
          </Pressable>

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
  title: {
    ...typography.numericLarge,
    fontSize: 36,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  subtitle: {
    ...typography.headline,
    color: colors.textSecondary,
    textAlign: 'center',
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
