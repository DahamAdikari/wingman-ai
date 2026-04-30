import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { jwtDecode } from 'jwt-decode';
import { setTokenGetter } from '../api/client';

export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      user: null,

      login(token) {
        let user = null;
        try {
          user = jwtDecode(token);
        } catch {
          // invalid token
        }
        setTokenGetter(() => token);
        set({ token, user });
      },

      logout() {
        setTokenGetter(() => null);
        set({ token: null, user: null });
      },
    }),
    {
      name: 'wingman-auth',
      onRehydrateStorage: () => (state) => {
        if (state?.token) {
          setTokenGetter(() => state.token);
        }
      },
    }
  )
);
