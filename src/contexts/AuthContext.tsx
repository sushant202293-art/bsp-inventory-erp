import React, { createContext, useContext, useEffect, useState, useCallback, useRef, type ReactNode } from 'react';
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
  // Tracks which user the current profile/company belong to, so a background
  // token refresh can update the session without re-fetching (or blanking the
  // UI) when nothing has actually changed.
  const profileUserIdRef = useRef<string | null>(null);

  const loadProfile = useCallback(async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, company:companies!profiles_company_id_fkey(*)')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Failed to load profile:', error.message);
        return;
      }

      if (data) {
        // The `company` alias pins the embed to `profiles_company_id_fkey`. A bare
        // `companies(*)` is ambiguous here: the live schema also exposes a
        // many-to-many path between the two tables, and PostgREST rejects that
        // embed with PGRST201 "more than one relationship was found".
        const { company, ...profileData } = data as unknown as Profile & { company: Company | null };
        setProfile(profileData as Profile);
        setCompany((company as Company) ?? null);
        profileUserIdRef.current = userId;

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
        profileUserIdRef.current = null;
        // Drop the cached company id so a later sign-in as a different user
        // in the same tab cannot resolve to the previous tenant.
        clearCompanyIdCache();
        setLoading(false);
        return;
      }

      if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        setUser(session.user);
        setLoading(true);
        await loadProfile(session.user.id);
        if (mounted) setLoading(false);
        return;
      }

      if (event === 'TOKEN_REFRESHED') {
        // supabase-js revalidates the session when the tab regains visibility,
        // so this fires every time the user switches away and comes back.
        // Flipping `loading` here would make ProtectedRoute swap the whole app
        // for a full-screen loader, remount every component and re-run every
        // page's queries - which looked exactly like the app reloading itself.
        // Keep the existing session in place and only refresh what is stale.
        setUser(session.user);
        if (profileUserIdRef.current !== session.user.id) {
          setLoading(true);
          await loadProfile(session.user.id);
          if (mounted) setLoading(false);
        }
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
        // Only active staff accounts may enter. Credentials alone are not
        // enough: an admin can deactivate a user (Users page) and that must
        // take effect immediately, not just block data through RLS.
        const { data: prof } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', data.user.id)
          .single();

        if (prof && !prof.is_active) {
          await supabase.auth.signOut();
          return { error: 'This account has been deactivated. Contact your administrator.' };
        }

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
