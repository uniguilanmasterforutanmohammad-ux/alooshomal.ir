'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface AuthUser {
  id: string;
  email: string | null;
  phone?: string | null;
  fullName: string | null;
  role: 'USER' | 'CITIZEN_REPORTER' | 'MODERATOR' | 'ADMIN';
}

interface AuthState {
  token: string | null;
  user: AuthUser | null;
  hydrated: boolean;
  setSession: (token: string, user: AuthUser) => void;
  /** Swap in a freshly refreshed access token (silent refresh). */
  setToken: (token: string) => void;
  /** Patch the cached user (e.g. after a verified phone/email change). */
  setUser: (user: AuthUser) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuth = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      hydrated: false,
      setSession: (token, user) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('alooshomal_token', token);
        }
        set({ token, user });
      },
      setToken: (token) => {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('alooshomal_token', token);
        }
        set({ token });
      },
      setUser: (user) => set({ user }),
      clear: () => {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('alooshomal_token');
        }
        set({ token: null, user: null });
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
