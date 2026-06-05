import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { User, UserRole } from '@/types';
import { authApi } from '@/lib/api';

interface AuthState {
  user: Omit<User, 'password'> | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  error: string | null;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (roles: UserRole[]) => boolean;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      loading: false,
      error: null,

      login: async (username, password) => {
        set({ loading: true, error: null });
        try {
          const res = await authApi.login(username, password);
          if (res.success && res.data) {
            set({ user: res.data.user, token: res.data.token, isAuthenticated: true, loading: false });
            return true;
          }
          set({ error: res.error || '登录失败', loading: false });
          return false;
        } catch (e: any) {
          set({ error: e.message || '登录失败', loading: false });
          return false;
        }
      },

      logout: () => {
        authApi.logout().catch(() => {});
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (roles) => {
        const user = get().user;
        if (!user) return false;
        if (roles.length === 0) return true;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'water-auth',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
