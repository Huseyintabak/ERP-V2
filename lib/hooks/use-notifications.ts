import { useEffect, useCallback } from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

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

      const url = `/api/notifications?${searchParams.toString()}`;
      logger.log('🔔 Fetching notifications from:', url);
      
      const response = await fetch(url);
      
      logger.log('🔔 Notifications response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('🔔 Notifications API error:', errorText);
        
        // If unauthorized, return empty array instead of throwing error
        if (response.status === 401 || response.status === 403) {
          logger.log('🔔 User not authenticated, returning empty notifications');
          setNotifications([]);
          return;
        }
        
        throw new Error(`Failed to fetch notifications: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      logger.log('🔔 Notifications data received:', data);
      setNotifications(data.data || []);
    } catch (error: any) {
      logger.error('🔔 Error fetching notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  }, [setLoading, clearError, setNotifications, setError]);

  // Mark notification as read
  const markNotificationAsRead = useCallback(async (id: string) => {
    try {
      const response = await fetch(`/api/notifications/${id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ is_read: true }),
      });

      if (!response.ok) {
        // If unauthorized, just update local state
        if (response.status === 401 || response.status === 403) {
          logger.log('🔔 User not authenticated, updating local state only');
          markAsRead(id);
          return;
        }
        throw new Error('Failed to mark notification as read');
      }

      markAsRead(id);
    } catch (error: any) {
      logger.error('Error marking notification as read:', error);
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
        // If unauthorized, just update local state
        if (response.status === 401 || response.status === 403) {
          logger.log('🔔 User not authenticated, updating local state only');
          removeNotification(id);
          toast.success('Bildirim silindi (yerel)');
          return;
        }
        throw new Error('Failed to delete notification');
      }

      removeNotification(id);
      toast.success('Bildirim silindi');
    } catch (error: any) {
      logger.error('Error deleting notification:', error);
      toast.error('Bildirim silinemedi');
    }
  }, [removeNotification]);

  // Mark all as read
  const markAllNotificationsAsRead = useCallback(async () => {
    try {
      const unreadNotifications = notifications.filter(n => !n.is_read);
      
      if (unreadNotifications.length === 0) {
        return;
      }
      
      // Try to mark all unread notifications as read
      const results = await Promise.allSettled(
        unreadNotifications.map(notification => 
          fetch(`/api/notifications/${notification.id}`, {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ is_read: true }),
          })
        )
      );

      // Check if any requests failed due to authentication
      const authErrors = results.filter(result => 
        result.status === 'rejected' || 
        (result.status === 'fulfilled' && (result.value.status === 401 || result.value.status === 403))
      );

      if (authErrors.length > 0) {
        logger.log('🔔 Some requests failed due to authentication, updating local state only');
        markAllAsRead();
        toast.success('Tüm bildirimler okundu olarak işaretlendi (yerel)');
      } else {
        markAllAsRead();
        toast.success('Tüm bildirimler okundu olarak işaretlendi');
      }
    } catch (error: any) {
      logger.error('Error marking all notifications as read:', error);
      // Fallback: just update local state
      markAllAsRead();
      toast.success('Tüm bildirimler okundu olarak işaretlendi (yerel)');
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
      logger.error('Error creating notification:', error);
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

