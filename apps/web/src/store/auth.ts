import { create } from 'zustand';
import type { User } from '@qvanta/types';
import { apiClient } from '@/lib/api-client';

interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
}

interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  setAuth: (user: User, tokens: AuthTokens) => void;
  setUser: (user: User) => void;
  logout: () => void;
}

const USER_KEY = 'qvanta_user';
const TOKEN_KEY = 'qvanta_token';
const REFRESH_KEY = 'qvanta_refresh_token';

const loadInitialState = (): Partial<AuthState> => {
  try {
    const accessToken = localStorage.getItem(TOKEN_KEY);
    const refreshToken = localStorage.getItem(REFRESH_KEY);
    const userStr = localStorage.getItem(USER_KEY);

    if (!accessToken) {
      return { user: null, tokens: null, isAuthenticated: false };
    }

    const user = userStr ? (JSON.parse(userStr) as User) : null;
    const tokens: AuthTokens = { accessToken };
    if (refreshToken) {
      tokens.refreshToken = refreshToken;
    }

    return {
      user,
      tokens,
      isAuthenticated: Boolean(accessToken && user)
    };
  } catch {
    return { user: null, tokens: null, isAuthenticated: false };
  }
};

export const useAuthStore = create<AuthState>((set) => {
  const initial = loadInitialState();

  return {
    user: initial.user ?? null,
    tokens: initial.tokens ?? null,
    isAuthenticated: initial.isAuthenticated ?? false,

    setAuth: (user: User, tokens: AuthTokens) => {
      try {
        localStorage.setItem(TOKEN_KEY, tokens.accessToken);
        // Refresh tokens are issued as httpOnly cookies and never need to be
        // readable by the browser application.
        localStorage.removeItem(REFRESH_KEY);
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // ignore persistence errors
      }
      set({ user, tokens: { accessToken: tokens.accessToken }, isAuthenticated: true });
    },

    setUser: (user: User) => {
      try {
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        // ignore
      }
      set({ user });
    },

    logout: () => {
      void apiClient.post('/auth/logout').catch(() => undefined);
      try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(REFRESH_KEY);
        localStorage.removeItem(USER_KEY);
      } catch {
        // ignore
      }
      set({ user: null, tokens: null, isAuthenticated: false });
    }
  };
});
