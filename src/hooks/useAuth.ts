/**
 * Custom hook for managing authentication state with Supabase Auth.
 *
 * Provides the current user, session, loading state, and login/logout functions.
 * Listens to Supabase auth state changes to keep the session in sync
 * (e.g., token refresh, sign-in from another tab).
 */
import { useState, useEffect, useCallback } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

/** Return type of the useAuth hook. */
export interface UseAuthReturn {
  user: User | null;
  session: Session | null;
  loading: boolean;
  /** Login with email and password. Returns an error message on failure, null on success. */
  login: (email: string, password: string) => Promise<string | null>;
  /** Sign the current user out. */
  logout: () => Promise<void>;
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    // Retrieve the existing session on mount
    supabase.auth.getSession().then(({ data: { session: currentSession } }) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      setLoading(false);
    });

    // Subscribe to auth state changes (login, logout, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe();
    };
  }, []);

  /**
   * Authenticate with email and password via Supabase Auth.
   * @returns Error message string on failure, null on success.
   */
  const login = useCallback(async (email: string, password: string): Promise<string | null> => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return error.message;
    }
    return null;
  }, []);

  /** Sign out the current user and clear session state. */
  const logout = useCallback(async (): Promise<void> => {
    await supabase.auth.signOut();
  }, []);

  return { user, session, loading, login, logout };
}
