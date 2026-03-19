import { create } from 'zustand';
import type { AuthUser } from '../types';

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: AuthUser, token: string) => void;
  logout: () => void;
  updateUser: (updates: Partial<AuthUser>) => void;
}

const stored = localStorage.getItem('user');
const storedToken = localStorage.getItem('accessToken');

export const useAuthStore = create<AuthState>((set) => ({
  user: stored ? JSON.parse(stored) : null,
  token: storedToken || null,
  isAuthenticated: !!storedToken && !!stored,

  login: (user, token) => {
    localStorage.setItem('accessToken', token);
    localStorage.setItem('user', JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },

  logout: () => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('user');
    set({ user: null, token: null, isAuthenticated: false });
  },

  updateUser: (updates) =>
    set((state) => {
      const updated = state.user ? { ...state.user, ...updates } : null;
      if (updated) localStorage.setItem('user', JSON.stringify(updated));
      return { user: updated };
    }),
}));
