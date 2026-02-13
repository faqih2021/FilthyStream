'use client';

import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import type { User as SupabaseUser } from '@supabase/supabase-js';

interface User {
  id: string;
  username: string | null;
  email: string | null;
  name: string | null;
  image: string | null;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (identifier: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (username: string, email: string, password: string) => Promise<{ success: boolean; error?: string; message?: string }>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function mapSupabaseUser(supabaseUser: SupabaseUser | null): User | null {
  if (!supabaseUser) return null;
  return {
    id: supabaseUser.id,
    email: supabaseUser.email || null,
    username: supabaseUser.user_metadata?.username || null,
    name: supabaseUser.user_metadata?.name || null,
    image: supabaseUser.user_metadata?.avatar_url || null,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const pathname = usePathname();

  const refreshUser = useCallback(async () => {
    try {
      // Use getSession first (faster, cached) then getUser for fresh data
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setLoading(false);
        // Optionally refresh with getUser in background for freshest data
        supabase.auth.getUser().then(({ data }) => {
          if (data.user) {
            setUser(mapSupabaseUser(data.user));
          }
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    } catch {
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Initial load - use session for speed
    refreshUser();

    // Listen for auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      console.log('Auth state changed:', event);
      if (event === 'SIGNED_OUT') {
        setUser(null);
        setLoading(false);
      } else if (session?.user) {
        setUser(mapSupabaseUser(session.user));
        setLoading(false);
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    // Refresh user data when tab becomes visible again
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refreshUser();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Also refresh when window regains focus
    const handleFocus = () => {
      refreshUser();
    };
    window.addEventListener('focus', handleFocus);

    return () => {
      subscription.unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshUser]);

  // Refresh user data when route changes
  useEffect(() => {
    refreshUser();
  }, [pathname, refreshUser]);

  const login = async (identifier: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: identifier.toLowerCase(),
        password,
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
        return { success: true };
      }

      return { success: false, error: 'Login failed' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  };

  const register = async (username: string, email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.toLowerCase(),
        password,
        options: {
          data: {
            username: username.toLowerCase(),
            name: username,
          }
        }
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user) {
        setUser(mapSupabaseUser(data.user));
        // Check if email confirmation is required
        if (!data.session) {
          return { success: true, message: 'Please check your email to confirm your account' };
        }
        return { success: true };
      }

      return { success: false, error: 'Registration failed' };
    } catch {
      return { success: false, error: 'An error occurred' };
    }
  };

  const logout = useCallback(async () => {
    console.log('Logout function called');
    
    // Clear user state immediately
    setUser(null);
    setLoading(false);
    
    try {
      // Sign out from Supabase client
      await supabase.auth.signOut();
      console.log('Supabase signOut completed');
      
      // Call logout API to clear server-side cookies
      await fetch('/api/auth/logout', { method: 'POST' });
      console.log('Cookies cleared via API');
    } catch (error) {
      console.error('Logout error:', error);
    }
    
    // Force navigate to login with hard refresh to clear all state
    console.log('Navigating to /login');
    window.location.href = '/login';
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
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
