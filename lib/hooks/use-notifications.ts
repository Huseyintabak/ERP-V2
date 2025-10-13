import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import { toast } from 'sonner';

export function useNotifications() {
  const {
    notifications,
    unreadCount,
    isLoading,
    error,
    setNotifications,
    addNotification,
    markAsRead,
    markAllAsRead,
    removeNotification,
    setLoading,
    setError,
    clearError,
  } = useNotificationStore();

  // Fetch notifications
  const fetchNotifications = useCallback(async (params?: {
    page?: number;
    limit?: number;
    unread_only?: boolean;
    type?: string;
  }) => {
    setLoading(true);
    clearError();

    try {
      const searchParams = new URLSearchParams();
      if (params?.page) searchParams.set('page', params.page.toString());
      if (params?.limit) searchParams.set('limit', params.limit.toString());
      if (params?.unread_only) searchParams.set('unread_only', 'true');
      if (params?.type) searchParams.set('type', params.type);

      const response = await fetch(`/api/notifications?${searchParams.toString()}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch notifications');
      }

      const data = await response.json();
      setNotifications(data.data);
    } catch (error: any) {
      setError(error.message);
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setNotifications, setError]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
      });

      if (!response.ok) {
        throw new Error('Failed to mark notification as read');
      }

      markAsRead(id);
    } catch (error: any) {
      console.error('Error marking notification as read:', error);
      toast.error('Bildirim okundu olarak işaretlenemedi');
    }
  }, [markAsRead]);

  // Delete notification
  const deleteNotification = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete notification');
      }

      removeNotification(id);
      toast.success('Bildirim silindi');
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      toast.error('Bildirim silinemedi');
    }
  }, [removeNotification]);

  // Mark all as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      // Mark all unread notifications as read
      await Promise.all(
        unreadNotifications.map(notification => 
          fetch(`/api/notifications/${notification.id}`, {
            method: 'PATCH',
          })
        )
      );

      markAllAsRead();
      toast.success('Tüm bildirimler okundu olarak işaretlendi');
    } catch (error: any) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Bildirimler okundu olarak işaretlenemedi');
    }
  }, [notifications, markAllAsRead]);

  // Create notification (admin only)
  const createNotification = useCallback(async (data: {
    type: 'stock_critical' | 'production_complete' | 'system_alert' | 'order_status';
    title: string;
    message: string;
    user_id?: string;
    metadata?: Record<string, any>;
  }) => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error('Failed to create notification');
      }

      const notification = await response.json();
      addNotification(notification);
      toast.success('Bildirim oluşturuldu');
      return notification;
    } catch (error: any) {
      console.error('Error creating notification:', error);
      toast.error('Bildirim oluşturulamadı');
      throw error;
    }
  }, [addNotification]);

  // Auto-fetch notifications on mount
  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  return {
    notifications,
    unreadCount,
    isLoading,
    error,
    fetchNotifications,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    createNotification,
    clearError,
  };
}

