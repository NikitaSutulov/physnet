import { create } from 'zustand';
import type { AuthUser } from '@physnet/shared';

interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  setUser: (user: AuthUser) => void;
  setStatus: (status: AuthState['status']) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  status: 'idle',
  setUser: (user) => set({ user, status: 'authenticated' }),
  setStatus: (status) => set({ status }),
  reset: () => set({ user: null, status: 'anonymous' }),
}));
