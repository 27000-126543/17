import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UserRole = 'inspector' | 'plant_leader' | 'dispatcher' | 'admin';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  avatar: string;
  plantId?: string;
  area?: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  hasPermission: (roles: UserRole[]) => boolean;
}

const mockUsers: Record<string, { password: string; user: Omit<User, 'id'> & { id?: string } }> = {
  inspector: {
    password: '123456',
    user: {
      username: 'inspector',
      name: '张巡线',
      role: 'inspector',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=inspector',
      area: '东城区',
    },
  },
  plant_leader: {
    password: '123456',
    user: {
      username: 'plant_leader',
      name: '李厂长',
      role: 'plant_leader',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=plant',
      plantId: 'plant-001',
    },
  },
  dispatcher: {
    password: '123456',
    user: {
      username: 'dispatcher',
      name: '王调度',
      role: 'dispatcher',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dispatch',
    },
  },
  admin: {
    password: '123456',
    user: {
      username: 'admin',
      name: '赵管理',
      role: 'admin',
      avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
    },
  },
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,

      login: async (username, password) => {
        await new Promise((resolve) => setTimeout(resolve, 500));

        const mock = mockUsers[username];
        if (!mock || mock.password !== password) {
          return false;
        }

        const user: User = {
          ...mock.user,
          id: mock.user.id || `user-${Date.now()}`,
        };
        const token = `mock-token-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

        set({ user, token, isAuthenticated: true });
        return true;
      },

      logout: () => {
        set({ user: null, token: null, isAuthenticated: false });
      },

      hasPermission: (roles) => {
        const { user } = get();
        if (!user) return false;
        return roles.includes(user.role);
      },
    }),
    {
      name: 'water-auth-storage',
    }
  )
);
