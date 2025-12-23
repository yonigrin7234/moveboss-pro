// IMPORTANT: react-native-reanimated must be the first import
import 'react-native-reanimated';

import { Slot, useRouter, useSegments, useRootNavigationState } from 'expo-router';
import { useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { AuthProvider, useAuth } from '../providers/AuthProvider';
import { NotificationProvider } from '../providers/NotificationProvider';
import { OwnerProvider, useOwner } from '../providers/OwnerProvider';
import { ToastProvider } from '../components/ui/Toast';
import { ErrorBoundary } from '../components/ui/ErrorBoundary';
import { Logo } from '../components/ui/Logo';
import { colors, spacing, radius, typography } from '../lib/theme';

function RootLayoutNav() {
  const { session, loading: authLoading } = useAuth();
  const { isOwnerRole, loading: ownerLoading } = useOwner();
  const segments = useSegments();
  const router = useRouter();
  const navigationState = useRootNavigationState();

  const loading = authLoading || (session && ownerLoading);

  // Check if the navigation state is ready
  const navigationReady = navigationState?.key != null;

  useEffect(() => {
    // Wait for both data loading and navigation to be ready
    if (loading || !navigationReady) return;

    const inAuthGroup = segments[0] === '(auth)';
    const inOwnerGroup = segments[0] === '(owner)';
    const inDriverGroup = segments[0] === '(app)';
    const isResetPassword = (segments as string[]).includes('reset-password');
    const isAuthenticated = !!session;

    // Wrap navigation in try-catch and setTimeout to ensure router is fully mounted
    const navigate = (route: string) => {
      setTimeout(() => {
        try {
          router.replace(route as any);
        } catch (err) {
          // Navigation might fail on initial mount, which is okay
          console.log('Navigation deferred:', route);
        }
      }, 0);
    };

    if (!isAuthenticated && !inAuthGroup) {
      // Redirect to login if not authenticated
      navigate('/(auth)/login');
    } else if (isAuthenticated && inAuthGroup && !isResetPassword) {
      // Redirect to appropriate home based on role
      if (isOwnerRole) {
        navigate('/(owner)');
      } else {
        navigate('/(app)');
      }
    } else if (isAuthenticated && isOwnerRole && inDriverGroup) {
      // Owner/admin/dispatcher accessing driver section - redirect to owner
      // (They should use the owner app unless explicitly switching)
      navigate('/(owner)');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, loading, segments, isOwnerRole, navigationReady]);

  if (loading || !navigationReady) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Logo size={80} />
          <View style={styles.brandRow}>
            <Text style={styles.logoText}>MoveBoss</Text>
            <View style={styles.proBadge}>
              <Text style={styles.proText}>PRO</Text>
            </View>
          </View>
          <Text style={styles.logoSubtext}>Loading...</Text>
        </View>
      </View>
    );
  }

  return <Slot />;
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });

  // Show loading while fonts are loading
  if (!fontsLoaded) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Logo size={80} />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <OwnerProvider>
            <NotificationProvider>
              <BottomSheetModalProvider>
                <ToastProvider>
                  <ErrorBoundary>
                    <RootLayoutNav />
                  </ErrorBoundary>
                </ToastProvider>
              </BottomSheetModalProvider>
            </NotificationProvider>
          </OwnerProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  gestureRoot: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  logoContainer: {
    alignItems: 'center',
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.lg,
    gap: spacing.md,
  },
  logoText: {
    fontSize: 28,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: -0.5,
  },
  proBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  proText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.background,
    letterSpacing: 0.5,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: spacing.md,
  },
});
