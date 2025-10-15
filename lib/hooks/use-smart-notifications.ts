'use client';

import { useEffect, useRef, useCallback } from 'react';
import { useNotifications } from './use-notifications';

export const useSmartNotifications = () => {
  const {
    notifications,
    unreadCount,
    isLoading,
    fetchNotifications,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
  } = useNotifications();

  const lastFetchRef = useRef<number>(0);
  const isVisibleRef = useRef<boolean>(true);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Smart fetch - only if enough time has passed
  const smartFetch = useCallback((force = false) => {
    const now = Date.now();
    const timeSinceLastFetch = now - lastFetchRef.current;
    
    // Only fetch if forced or if more than 10 seconds have passed
    if (force || timeSinceLastFetch > 10000) {
      lastFetchRef.current = now;
      fetchNotifications();
    }
  }, [fetchNotifications]);

  // Start smart polling
  const startPolling = useCallback(() => {
    if (intervalRef.current) return; // Already polling
    
    intervalRef.current = setInterval(() => {
      if (isVisibleRef.current) {
        smartFetch();
      }
    }, 20000); // Her 20 saniyede bir
  }, [smartFetch]);

  // Stop polling
  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Handle visibility changes
  useEffect(() => {
    const handleVisibilityChange = () => {
      isVisibleRef.current = document.visibilityState === 'visible';
      
      if (isVisibleRef.current) {
        // Page became visible - fetch immediately and start polling
        smartFetch(true);
        startPolling();
      } else {
        // Page became hidden - stop polling
        stopPolling();
      }
    };

    // Initial setup
    isVisibleRef.current = document.visibilityState === 'visible';
    if (isVisibleRef.current) {
      smartFetch(true);
      startPolling();
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [smartFetch, startPolling, stopPolling]);

  // Manual refresh function
  const refreshNotifications = useCallback(() => {
    smartFetch(true);
  }, [smartFetch]);

  return {
    notifications,
    unreadCount,
    isLoading,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    refreshNotifications, // Manual refresh
  };
};
