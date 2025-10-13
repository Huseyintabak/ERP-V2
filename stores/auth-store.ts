import { create } from 'zustand';

interface User {
  id: string;
  email: string;
  name: string;
  role: 'yonetici' | 'planlama' | 'depo' | 'operator';
}

interface AuthStore {
  user: User | null;
  setUser: (user: User | null) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  user: null,
  setUser: (user) => set({ user }),
  logout: () => set({ user: null }),
}));

