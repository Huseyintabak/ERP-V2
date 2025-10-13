import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface User {
  id: string;
  name: string;
  email: string;
  role: 'yonetici' | 'planlama' | 'depo' | 'operator';
  is_active: boolean;
  created_at: string;
  last_login_at?: string;
  operators?: {
    series: string;
    location: string;
    experience_years: number;
    daily_capacity: number;
    hourly_rate: number;
  };
}

interface UserState {
  users: User[];
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  
  // Filters
  filters: {
    search: string;
    role: string;
    is_active: string | null;
  };
  
  // Actions
  setUsers: (users: User[]) => void;
  setCurrentUser: (user: User | null) => void;
  addUser: (user: User) => void;
  updateUser: (id: string, user: Partial<User>) => void;
  removeUser: (id: string) => void;
  setPagination: (pagination: Partial<UserState['pagination']>) => void;
  setFilters: (filters: Partial<UserState['filters']>) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useUserStore = create<UserState>()(
  subscribeWithSelector((set, get) => ({
    users: [],
    currentUser: null,
    isLoading: false,
    error: null,
    
    pagination: {
      page: 1,
      limit: 50,
      total: 0,
      pages: 0,
    },
    
    filters: {
      search: '',
      role: '',
      is_active: null,
    },

    setUsers: (users) => set({ users }),

    setCurrentUser: (user) => set({ currentUser: user }),

    addUser: (user) => {
      const { users } = get();
      set({ users: [user, ...users] });
    },

    updateUser: (id, updatedUser) => {
      const { users, currentUser } = get();
      const updatedUsers = users.map(u => u.id === id ? { ...u, ...updatedUser } : u);
      const updatedCurrentUser = currentUser?.id === id ? { ...currentUser, ...updatedUser } : currentUser;
      set({ users: updatedUsers, currentUser: updatedCurrentUser });
    },

    removeUser: (id) => {
      const { users } = get();
      const updatedUsers = users.filter(u => u.id !== id);
      set({ users: updatedUsers });
    },

    setPagination: (pagination) => {
      const { pagination: currentPagination } = get();
      set({ pagination: { ...currentPagination, ...pagination } });
    },

    setFilters: (filters) => {
      const { filters: currentFilters } = get();
      set({ filters: { ...currentFilters, ...filters } });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),
  }))
);

