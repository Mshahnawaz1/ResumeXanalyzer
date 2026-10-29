import React, { createContext, useCallback, useContext, useState, useEffect } from 'react';
import { supabase, isMockAuth } from '../lib/supabaseClient';

export interface User {
  id: string;
  email: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isMockMode: boolean;
  login: (email: string, password: string) => Promise<void>;
  loginWithGithub: () => Promise<void>;
  register: (email: string, password: string) => Promise<string>;
  logout: () => Promise<void>;
  clearError: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  // Only covers the initial session check — App swaps the whole router for a
  // loader while this is true, so auth actions must not toggle it.
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Initialize Auth
  useEffect(() => {
    if (isMockAuth) {
      // Mock Authentication Flow
      const storedToken = localStorage.getItem('auth_token');
      const storedUser = localStorage.getItem('auth_user');

      if (storedToken && storedUser) {
        try {
          setToken(storedToken);
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error('Failed to parse stored auth data:', e);
          localStorage.removeItem('auth_token');
          localStorage.removeItem('auth_user');
        }
      }
      setIsLoading(false);
    } else {
      // Supabase Authentication Flow
      const initializeSupabaseAuth = async () => {
        try {
          // Get current session
          const { data: { session }, error: sessionError } = await supabase!.auth.getSession();
          if (sessionError) throw sessionError;

          if (session) {
            setUser({
              id: session.user.id,
              email: session.user.email || '',
            });
            setToken(session.access_token);
          }
        } catch (err: any) {
          console.error('Error getting initial Supabase session:', err);
        } finally {
          setIsLoading(false);
        }
      };

      initializeSupabaseAuth();

      // Listen to Auth state changes
      const { data: { subscription } } = supabase!.auth.onAuthStateChange((_event, session) => {
        if (session) {
          setUser({
            id: session.user.id,
            email: session.user.email || '',
          });
          setToken(session.access_token);
        } else {
          setUser(null);
          setToken(null);
        }
        setIsLoading(false);
      });

      return () => {
        subscription.unsubscribe();
      };
    }
  }, []);

  const login = async (email: string, password: string) => {
    setError(null);
    try {
      if (isMockAuth) {
        // Mock Login
        const mockUser: User = { id: 'mock-user-id', email };
        const mockToken = 'mock-jwt-token-for-gemini-nexus';
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
      } else {
        // Supabase Login
        const { data, error: loginError } = await supabase!.auth.signInWithPassword({
          email,
          password,
        });

        if (loginError) {
          throw new Error(loginError.message);
        }

        if (data.session) {
          setUser({
            id: data.session.user.id,
            email: data.session.user.email || '',
          });
          setToken(data.session.access_token);
        }
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during login.');
      throw e;
    }
  };

  const loginWithGithub = async () => {
    setError(null);
    try {
      if (isMockAuth) {
        // Mock GitHub Login
        const mockUser: User = { id: 'mock-github-user-id', email: 'github-user@example.com' };
        const mockToken = 'mock-jwt-token-for-gemini-nexus-github';
        setUser(mockUser);
        setToken(mockToken);
        localStorage.setItem('auth_token', mockToken);
        localStorage.setItem('auth_user', JSON.stringify(mockUser));
      } else {
        // Supabase GitHub Login
        const { error: githubError } = await supabase!.auth.signInWithOAuth({
          provider: 'github',
          options: {
            redirectTo: window.location.origin
          }
        });

        if (githubError) {
          throw new Error(githubError.message);
        }
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during GitHub login.');
      throw e;
    }
  };

  const register = async (email: string, password: string): Promise<string> => {
    setError(null);
    try {
      if (isMockAuth) {
        // Mock Register
        return 'Mock registration successful! You can now log in with these credentials.';
      } else {
        // Supabase Register
        const { data, error: registerError } = await supabase!.auth.signUp({
          email,
          password,
        });

        if (registerError) {
          throw new Error(registerError.message);
        }

        if (data.user && data.session === null) {
          return 'Registration successful! Please check your email for the confirmation link.';
        }

        return 'Registration successful! You are now logged in.';
      }
    } catch (e: any) {
      setError(e.message || 'An error occurred during registration.');
      throw e;
    }
  };

  const logout = async () => {
    setError(null);
    try {
      if (isMockAuth) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
      } else {
        const { error: logoutError } = await supabase!.auth.signOut();
        if (logoutError) throw logoutError;
      }
      setUser(null);
      setToken(null);
    } catch (e: any) {
      console.error('Failed to logout:', e);
      setError(e.message || 'Failed to sign out.');
    }
  };

  // Stable identity so consumers can list it in effect deps
  const clearError = useCallback(() => setError(null), []);

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: !!user,
    isLoading,
    isMockMode: isMockAuth,
    login,
    loginWithGithub,
    register,
    logout,
    error,
    clearError,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
