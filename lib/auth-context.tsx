'use client';

import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createBrowserClient } from '@/lib/supabase/client';
import { Profile, UserRole } from '@/types/database';

export type AuthStatus = 'initializing' | 'authenticated' | 'unauthenticated' | 'error';

interface AuthContextType {
  user: User | null;
  profile: Profile | null;
  role: UserRole | null;
  authStatus: AuthStatus;
  authError: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isOwner: boolean;
  isManager: boolean;
  isStaff: boolean;
  signIn: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<Profile | null>;
  checkOwnerExists: () => Promise<boolean>;
  retryAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [authStatus, setAuthStatus] = useState<AuthStatus>('initializing');
  const [authError, setAuthError] = useState<string | null>(null);

  // Keep a ref to the latest user for stable access inside callbacks without re-render cascades
  const userRef = useRef<User | null>(null);
  userRef.current = user;

  // Build a fallback profile from user metadata immediately so auth never hangs
  const createProfileFromUser = useCallback((sessionUser: User): Profile => {
    const meta = sessionUser.user_metadata || {};
    const email = (sessionUser.email || '').toLowerCase().trim();
    const name =
      (meta.full_name as string) ||
      (meta.name as string) ||
      email.split('@')[0] ||
      'Venue User';
    const role = (meta.role as UserRole) || 'sales';
    const isActive = meta.is_active !== undefined ? Boolean(meta.is_active) : true;

    return {
      id: sessionUser.id,
      full_name: name,
      name: name,
      email: email,
      phone: (meta.phone as string) || null,
      role: role,
      is_active: isActive,
      active: isActive,
      avatar_url: (meta.avatar_url as string) || undefined,
      organization_id: (meta.organization_id as string) || undefined,
      created_at: sessionUser.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
  }, []);

  // Fetch full profile from database with safety fallback
  const fetchProfile = useCallback(
    async (userId: string, userEmail?: string, authUser?: User | null): Promise<Profile | null> => {
      const supabase = createBrowserClient();
      if (!supabase) {
        if (authUser) {
          const fallback = createProfileFromUser(authUser);
          setProfile(fallback);
          return fallback;
        }
        return null;
      }

      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.warn('Profile fetch note:', error.message);
        }

        const meta = authUser?.user_metadata || userRef.current?.user_metadata || {};

        if (data) {
          const normalizedProfile: Profile = {
            id: data.id,
            full_name:
              data.full_name ||
              data.name ||
              (meta.full_name as string) ||
              (meta.name as string) ||
              userEmail?.split('@')[0] ||
              'User',
            name:
              data.full_name ||
              data.name ||
              (meta.name as string) ||
              (meta.full_name as string) ||
              userEmail?.split('@')[0] ||
              'User',
            email: (data.email || userEmail || '').toLowerCase().trim(),
            phone: data.phone || (meta.phone as string) || null,
            role: (data.role as UserRole) || ((meta.role as UserRole) || 'sales'),
            is_active:
              data.is_active !== undefined
                ? Boolean(data.is_active)
                : data.active !== undefined
                ? Boolean(data.active)
                : true,
            active:
              data.is_active !== undefined
                ? Boolean(data.is_active)
                : data.active !== undefined
                ? Boolean(data.active)
                : true,
            avatar_url: data.avatar_url || undefined,
            organization_id: data.organization_id || undefined,
            created_at: data.created_at || new Date().toISOString(),
            updated_at: data.updated_at || new Date().toISOString(),
          };
          setProfile(normalizedProfile);
          return normalizedProfile;
        }

        // If profile row does not exist yet, build from metadata
        if (authUser) {
          const fallback = createProfileFromUser(authUser);
          setProfile(fallback);
          return fallback;
        }

        if (userEmail) {
          const cleanEmail = userEmail.toLowerCase().trim();
          const fallbackRole = ((meta.role as UserRole) || 'sales');
          const fallbackName = (meta.full_name as string) || (meta.name as string) || cleanEmail.split('@')[0];
          const fallbackProfile: Profile = {
            id: userId,
            full_name: fallbackName,
            name: fallbackName,
            email: cleanEmail,
            phone: (meta.phone as string) || null,
            role: fallbackRole,
            is_active: true,
            active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          };
          setProfile(fallbackProfile);
          return fallbackProfile;
        }

        return null;
      } catch (err) {
        console.warn('Profile fetch error, using auth user fallback:', err);
        if (authUser) {
          const fallback = createProfileFromUser(authUser);
          setProfile(fallback);
          return fallback;
        }
        return null;
      }
    },
    [createProfileFromUser]
  );

  // Process a session with strict state machine transitions
  const handleSession = useCallback(
    async (session: Session | null): Promise<boolean> => {
      setAuthError(null);

      if (!session?.user) {
        setUser(null);
        setProfile(null);
        setAuthStatus('unauthenticated');
        return false;
      }

      try {
        setUser(session.user);
        // Immediately set an initial profile from metadata to eliminate delay
        const initialProfile = createProfileFromUser(session.user);
        setProfile(initialProfile);

        // Fetch / sync the database profile asynchronously
        const dbProfile = await fetchProfile(session.user.id, session.user.email, session.user);

        if (!dbProfile || !dbProfile.organization_id) {
          // A Supabase Auth session can outlive an organization deletion. Do not
          // render a misleading dashboard with fallback/demo profile data.
          const supabase = createBrowserClient();
          if (supabase) {
            await supabase.auth.signOut().catch(() => {});
          }
          setUser(null);
          setProfile(null);
          setAuthStatus('unauthenticated');
          setAuthError('Your account is not linked to an organization. Please contact an owner or complete setup.');
          return false;
        }

        if (dbProfile && !dbProfile.is_active) {
          // Deactivated user: immediately sign out
          const supabase = createBrowserClient();
          if (supabase) {
            await supabase.auth.signOut().catch(() => {});
          }
          setUser(null);
          setProfile(null);
          setAuthStatus('unauthenticated');
          setAuthError('Your account has been deactivated. Please contact your administrator.');
          return false;
        }

        setAuthStatus('authenticated');
        return true;
      } catch (err) {
        console.error('Session processing error:', err);
        // If user session exists, authenticate with metadata profile rather than crashing
        setUser(session.user);
        setProfile(createProfileFromUser(session.user));
        setAuthStatus('authenticated');
        return true;
      }
    },
    [createProfileFromUser, fetchProfile]
  );

  // Manual retry function for Try Again button
  const retryAuth = useCallback(async () => {
    setAuthStatus('initializing');
    setAuthError(null);
    const supabase = createBrowserClient();
    if (!supabase) {
      setAuthStatus('unauthenticated');
      return;
    }
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setAuthError(error.message);
        setAuthStatus('error');
        return;
      }
      await handleSession(session);
    } catch {
      setAuthError('Unable to verify your session. Please try again.');
      setAuthStatus('error');
    }
  }, [handleSession]);

  // Main Auth Lifecycle Listener (Runs ONCE)
  useEffect(() => {
    const supabase = createBrowserClient();
    if (!supabase) {
      setAuthStatus('unauthenticated');
      return;
    }

    let isMounted = true;

    // 1. Initial Session Check
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (!isMounted) return;
        if (error) {
          console.warn('Initial session check error:', error.message);
          setAuthStatus('unauthenticated');
          return;
        }
        handleSession(session);
      })
      .catch((err) => {
        if (!isMounted) return;
        console.warn('getSession catch:', err);
        setAuthStatus('unauthenticated');
      });

    // 2. Auth State Change Subscription
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
      if (!isMounted) return;

      if (event === 'INITIAL_SESSION') {
        if (session) {
          // Supabase holds an internal auth lock while notifying listeners.
          // Defer profile loading until this callback has returned.
          setTimeout(() => {
            if (isMounted) void handleSession(session);
          }, 0);
        } else {
          setAuthStatus('unauthenticated');
        }
        return;
      }

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        // Do not issue another Supabase request from inside the auth callback.
        setTimeout(() => {
          if (isMounted) void handleSession(session);
        }, 0);
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfile(null);
        setAuthStatus('unauthenticated');
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [handleSession]);

  // Check if an Owner account exists in the database
  const checkOwnerExists = useCallback(async (): Promise<boolean> => {
    const supabase = createBrowserClient();
    if (!supabase) return false;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('role', 'owner')
        .limit(1);

      if (error) {
        const res = await fetch('/api/auth/setup-status');
        if (res.ok) {
          const json = await res.json();
          return Boolean(json.ownerExists);
        }
        return false;
      }

      return Array.isArray(data) && data.length > 0;
    } catch {
      return false;
    }
  }, []);

  // Sign In implementation
  const signIn = useCallback(
    async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
      const supabase = createBrowserClient();
      if (!supabase) {
        return { success: false, error: 'Supabase client is not configured.' };
      }

      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim().toLowerCase(),
          password,
        });

        if (error) {
          if (
            error.message.toLowerCase().includes('invalid login credentials') ||
            error.message.toLowerCase().includes('invalid grant')
          ) {
            return { success: false, error: 'Email or password is incorrect.' };
          }
          return { success: false, error: error.message };
        }

        if (data.user) {
          const hasOrganizationAccess = await handleSession(data.session);
          if (!hasOrganizationAccess) {
            return {
              success: false,
              error: 'Your account is not linked to an organization. Please complete setup before signing in.',
            };
          }
          return { success: true };
        }

        return { success: false, error: 'Unable to authenticate. Please try again.' };
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
        return { success: false, error: msg };
      }
    },
    [handleSession]
  );

  // Sign Out implementation
  const signOut = useCallback(async (): Promise<void> => {
    setUser(null);
    setProfile(null);
    setAuthStatus('unauthenticated');

    try {
      // 1. Call server-side signout endpoint to clear cookies
      await fetch('/api/auth/signout', { method: 'POST' }).catch(() => {});

      // 2. Sign out from Supabase client
      const supabase = createBrowserClient();
      if (supabase) {
        await supabase.auth.signOut().catch(() => {});
      }

      // 3. Clear localStorage and sessionStorage tokens
      if (typeof window !== 'undefined') {
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.startsWith('sb-') || key.includes('auth-token') || key.includes('supabase'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach((k) => localStorage.removeItem(k));
        sessionStorage.clear();

        // 4. Clear document cookies matching sb-
        document.cookie.split(';').forEach((cookie) => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('auth-token')) {
            document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/;`;
          }
        });
      }
    } catch (err) {
      console.error('Sign out error:', err);
    }

    if (typeof window !== 'undefined') {
      window.location.replace('/login');
    }
  }, []);

  // Refresh active profile
  const refreshProfile = useCallback(async (): Promise<Profile | null> => {
    const currentUser = userRef.current;
    if (!currentUser) return null;
    return fetchProfile(currentUser.id, currentUser.email, currentUser);
  }, [fetchProfile]);

  const isAuthenticated = useMemo(() => {
    return authStatus === 'authenticated';
  }, [authStatus]);

  const isLoading = useMemo(() => {
    return authStatus === 'initializing';
  }, [authStatus]);

  const role = useMemo<UserRole | null>(() => {
    return profile?.role || null;
  }, [profile]);

  const isOwner = role === 'owner';
  const isManager = role === 'manager' || role === 'admin';
  const isStaff = role === 'staff' || role === 'sales' || role === 'front_desk';

  const contextValue = useMemo<AuthContextType>(
    () => ({
      user,
      profile,
      role,
      authStatus,
      authError,
      isAuthenticated,
      isLoading,
      isOwner,
      isManager,
      isStaff,
      signIn,
      signOut,
      refreshProfile,
      checkOwnerExists,
      retryAuth,
    }),
    [
      user,
      profile,
      role,
      authStatus,
      authError,
      isAuthenticated,
      isLoading,
      isOwner,
      isManager,
      isStaff,
      signIn,
      signOut,
      refreshProfile,
      checkOwnerExists,
      retryAuth,
    ]
  );

  return <AuthContext.Provider value={contextValue}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
