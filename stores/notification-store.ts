import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

export interface Notification {
  id: string;
  type: 'critical_stock' | 'production_delay' | 'order_update';
  title: string;
  message: string;
  material_type?: 'raw' | 'semi' | 'finished';
  material_id?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  is_read: boolean;
  created_at: string;
}

interface NotificationState {
  notifications: Notification[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  setNotifications: (notifications: Notification[]) => void;
  addNotification: (notification: Notification) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
  removeNotification: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  clearError: () => void;
}

export const useNotificationStore = create<NotificationState>()(
  subscribeWithSelector((set, get) => ({
    notifications: [],
    unreadCount: 0,
    isLoading: false,
    error: null,

    setNotifications: (notifications) => {
      const unreadCount = notifications.filter(n => !n.is_read).length;
      set({ notifications, unreadCount });
    },

    addNotification: (notification) => {
      const { notifications } = get();
      const updatedNotifications = [notification, ...notifications];
      const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
      set({ notifications: updatedNotifications, unreadCount });
    },

    markAsRead: (id) => {
      const { notifications } = get();
      const updatedNotifications = notifications.map(n =>
        n.id === id ? { ...n, is_read: true } : n
      );
      const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
      set({ notifications: updatedNotifications, unreadCount });
    },

    markAllAsRead: () => {
      const { notifications } = get();
      const updatedNotifications = notifications.map(n => ({ ...n, is_read: true }));
      set({ notifications: updatedNotifications, unreadCount: 0 });
    },

    removeNotification: (id) => {
      const { notifications } = get();
      const updatedNotifications = notifications.filter(n => n.id !== id);
      const unreadCount = updatedNotifications.filter(n => !n.is_read).length;
      set({ notifications: updatedNotifications, unreadCount });
    },

    setLoading: (loading) => set({ isLoading: loading }),

    setError: (error) => set({ error }),

    clearError: () => set({ error: null }),
  }))
);