'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  fullName: string | null;
  role: 'USER' | 'CITIZEN_REPORTER' | 'ADMIN';
}

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (token: string, refreshToken: string | null, user: AuthUser) => void;
  /** Swap in a freshly rotated token pair (silent refresh). */
  setTokens: (token: string, refreshToken: string | null) => void;
  /** Patch the cached user (e.g. after a verified phone/email change). */
  setUser: (user: AuthUser) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      user: null,
      hydrated: false,
      setSession: (token, refreshToken, user) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('alooshomal_token', token);
          if (refreshToken) {
            window.localStorage.setItem('alooshomal_refresh', refreshToken);
          }
        }
        set({ token, refreshToken, user });
      },
      setTokens: (token, refreshToken) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('alooshomal_token', token);
          if (refreshToken) {
            window.localStorage.setItem('alooshomal_refresh', refreshToken);
          }
        }
        set({ token, refreshToken });
      },
      setUser: (user) => set({ user }),
      clear: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('alooshomal_token');
          window.localStorage.removeItem('alooshomal_refresh');
        }
        set({ token: null, refreshToken: null, user: null });
      },
      setHydrated: () => set({ hydrated: true }),
    }),
    {
      name: 'alooshomal_auth',
      onRehydrateStorage: () => (state) => {
        state?.setHydrated();
      },
    },
  ),
);
