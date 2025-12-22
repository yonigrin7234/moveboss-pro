import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Platform } from 'react-native';
import { Session, User } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as WebBrowser from 'expo-web-browser';
import * as AuthSession from 'expo-auth-session';
import * as Crypto from 'expo-crypto';
import { supabase } from '../lib/supabase';

// Required for OAuth redirect handling
WebBrowser.maybeCompleteAuthSession();

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signInWithGoogle: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAppleAuthAvailable: boolean;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAppleAuthAvailable, setIsAppleAuthAvailable] = useState(false);

  // Check Apple Sign In availability
  useEffect(() => {
    if (Platform.OS === 'ios') {
      AppleAuthentication.isAvailableAsync().then(setIsAppleAuthAvailable);
    }
  }, []);

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        // Only update if session actually changed (prevents unnecessary re-renders)
        setSession(prev => {
          // Compare user IDs to detect actual session change
          if (prev?.user?.id === newSession?.user?.id) {
            // Session might have refreshed but user is the same - keep existing reference
            // unless access token changed (for API calls)
            if (prev?.access_token === newSession?.access_token) {
              return prev;
            }
          }
          return newSession;
        });
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Memoize functions to prevent re-renders in consumers
  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { error };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  // Sign in with Apple
  const signInWithApple = useCallback(async () => {
    try {
      // Generate a secure random nonce
      const rawNonce = Crypto.getRandomBytes(16)
        .reduce((acc, byte) => acc + byte.toString(16).padStart(2, '0'), '');
      const hashedNonce = await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        rawNonce
      );

      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
        nonce: hashedNonce,
      });

      if (credential.identityToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'apple',
          token: credential.identityToken,
          nonce: rawNonce,
        });
        return { error };
      }

      return { error: new Error('No identity token received from Apple') };
    } catch (e: unknown) {
      if (e instanceof Error && 'code' in e && (e as { code: string }).code === 'ERR_REQUEST_CANCELED') {
        // User canceled the sign in
        return { error: null };
      }
      return { error: e instanceof Error ? e : new Error('Apple sign in failed') };
    }
  }, []);

  // Sign in with Google
  const signInWithGoogle = useCallback(async () => {
    try {
      // Get the redirect URL for this app
      const redirectUrl = AuthSession.makeRedirectUri({
        scheme: 'moveboss',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          skipBrowserRedirect: true,
        },
      });

      if (error) return { error };

      if (data?.url) {
        // Open the Google sign in page using WebBrowser
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUrl
        );

        if (result.type === 'success' && result.url) {
          // Parse the URL to get tokens
          const url = new URL(result.url);
          const fragment = url.hash.substring(1);
          const params = new URLSearchParams(fragment);
          const accessToken = params.get('access_token');
          const refreshToken = params.get('refresh_token');

          if (accessToken) {
            // Set the session from the OAuth response
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken || '',
            });
            return { error: sessionError };
          }
        }

        if (result.type === 'cancel' || result.type === 'dismiss') {
          return { error: null };
        }
      }

      return { error: new Error('Failed to get Google sign in URL') };
    } catch (e) {
      return { error: e instanceof Error ? e : new Error('Google sign in failed') };
    }
  }, []);

  // Memoize the user object to prevent re-renders when session refreshes
  // but user data hasn't actually changed
  const user = useMemo(() => session?.user ?? null, [session?.user?.id]);

  // Memoize session reference to only change when user actually changes
  // This prevents re-renders when token refreshes but user is the same
  const stableSession = useMemo(() => session, [session?.user?.id]);

  // Memoize the entire context value to prevent unnecessary re-renders
  const value = useMemo<AuthContextType>(() => ({
    session: stableSession,
    user,
    loading,
    signIn,
    signInWithApple,
    signInWithGoogle,
    signOut,
    isAppleAuthAvailable,
  }), [stableSession, user, loading, signIn, signInWithApple, signInWithGoogle, signOut, isAppleAuthAvailable]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
