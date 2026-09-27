import React, { createContext, useContext, useEffect, useState, useCallback, type ReactNode } from 'react';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { clearCompanyIdCache } from '@/lib/tenant';
import type { Profile, Company } from '@/types/database.types';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  company: Company | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: string | null }>;
  updatePassword: (password: string) => Promise<{ error: string | null }>;
  updateProfile: (data: Partial<Profile>) => Promise<{ error: string | null }>;
  refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, companies(*)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to load profile:', error.message);
        return;
      }

      if (data) {
        const { companies, ...profileData } = data as unknown as Profile & { companies: Company | null };
        setProfile(profileData as Profile);
        setCompany((companies as Company) ?? null);

        if (!profileData.last_login) {
          await supabase
            .from('profiles')
            .update({ last_login: new Date().toISOString() })
            .eq('id', userId);
        }
      }
    } catch (err) {
      console.error('Profile load error:', err);
    }
  }, []);

  useEffect(() => {
    let mounted = true;

    const initAuth = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user && mounted) {
          setUser(session.user);
          await loadProfile(session.user.id);
        }
      } catch (err) {
        console.error('Auth init error:', err);
      } finally {
        if (mounted) {
          setLoading(false);
          setInitialized(true);
        }
      }
    };

    initAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_OUT' || !session) {
        setUser(null);
        setProfile(null);
        setCompany(null);
        // Drop the cached company id so a later sign-in as a different user
        // in the same tab cannot resolve to the previous tenant.
        clearCompanyIdCache();
        setLoading(false);
        return;
      }

      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION' || event === 'TOKEN_REFRESHED') {
        setUser(session.user);
        setLoading(true);
        await loadProfile(session.user.id);
        setLoading(false);
      }
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [loadProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        return { error: error.message };
      }

      if (data.user) {
        setUser(data.user);
        await loadProfile(data.user.id);
      }

      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Sign in failed' };
    }
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    try {
      await supabase.auth.signOut();
      setUser(null);
      setProfile(null);
      setCompany(null);
      clearCompanyIdCache();
    } catch (err) {
      console.error('Sign out error:', err);
    }
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/login`,
      });
      return { error: error?.message ?? null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to send reset email' };
    }
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    try {
      const { error } = await supabase.auth.updateUser({ password });
      return { error: error?.message ?? null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update password' };
    }
  }, []);

  const updateProfile = useCallback(async (data: Partial<Profile>) => {
    if (!user) return { error: 'Not authenticated' };
    try {
      const { error } = await supabase
        .from('profiles')
        .update(data)
        .eq('id', user.id);
      if (error) return { error: error.message };
      await loadProfile(user.id);
      return { error: null };
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : 'Failed to update profile' };
    }
  }, [user, loadProfile]);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.id);
  }, [user, loadProfile]);

  const value: AuthContextType = {
    user,
    profile,
    company,
    loading,
    initialized,
    signIn,
    signOut,
    resetPassword,
    updatePassword,
    updateProfile,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
