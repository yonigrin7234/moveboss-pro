import { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

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
    signOut,
  }), [stableSession, user, loading, signIn, signOut]);

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
