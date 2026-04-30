import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';
import { setTokenGetter } from '../api/client';

export const useAuthStore = create((set) => ({
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
}));
