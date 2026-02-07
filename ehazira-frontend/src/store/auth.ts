import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, UserType } from '@/types';
import { websocketService } from '@/services/websocket';
import { authAPI } from '@/services/api';

interface AuthState {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  deviceId: number | null;
  isAuthenticated: boolean;

  setAuth: (accessToken: string, refreshToken: string, user: User, deviceId?: number) => void;
  logout: () => Promise<void>;
  updateUser: (user: Partial<User>) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      deviceId: null,
      isAuthenticated: false,

      setAuth: (accessToken, refreshToken, user, deviceId) => {
        localStorage.setItem('access_token', accessToken);
        localStorage.setItem('refresh_token', refreshToken);
        if (deviceId) {
          localStorage.setItem('device_id', deviceId.toString());
        }
        set({
          accessToken,
          refreshToken,
          user,
          deviceId: deviceId || null,
          isAuthenticated: true,
        });
      },

      logout: async () => {
        const state = get();

        // For students, call backend to deactivate device
        // This allows them to login from another device
        if (state.user?.user_type === 'student' && state.accessToken) {
          try {
            await authAPI.logout();
          } catch {
            // Ignore errors - clear local state anyway
          }
        }

        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        localStorage.removeItem('device_id');
        websocketService.disconnect();
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          deviceId: null,
          isAuthenticated: false,
        });
      },

      updateUser: (userData) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        }));
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        deviceId: state.deviceId,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
