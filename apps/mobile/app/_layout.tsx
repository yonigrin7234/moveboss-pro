// IMPORTANT: react-native-reanimated must be the first import
import 'react-native-reanimated';

import { Slot, useRouter, useSegments } from 'expo-router';
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
import { ToastProvider } from '../components/ui/Toast';
import { colors } from '../lib/theme';

function RootLayoutNav() {
  const { session, loading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    const inAuthGroup = segments[0] === '(auth)';
    const isResetPassword = (segments as string[]).includes('reset-password');

    if (!session && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (session && inAuthGroup && !isResetPassword) {
      // Redirect to home if authenticated but on auth screen (except reset-password)
      router.replace('/(app)');
    }
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoText}>MoveBoss</Text>
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
          <View style={styles.logoPlaceholder} />
        </View>
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={styles.gestureRoot}>
      <SafeAreaProvider>
        <AuthProvider>
          <NotificationProvider>
            <BottomSheetModalProvider>
              <ToastProvider>
                <RootLayoutNav />
              </ToastProvider>
            </BottomSheetModalProvider>
          </NotificationProvider>
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
  logoText: {
    fontSize: 32,
    fontWeight: '700',
    color: colors.primary,
    letterSpacing: -1,
  },
  logoSubtext: {
    fontSize: 14,
    color: colors.textMuted,
    marginTop: 8,
  },
  logoPlaceholder: {
    width: 120,
    height: 40,
    backgroundColor: colors.surface,
    borderRadius: 8,
  },
});
