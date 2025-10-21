'use client';

import { useState, useEffect } from 'react';
import { Bell, BellRing, X, Check, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSmartNotificationsUnified } from '@/lib/hooks/use-smart-notifications-unified';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useRealtimeUnified } from '@/lib/hooks/use-realtime-unified';

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'critical_stock':
      return '🔴';
    case 'production_delay':
      return '⚠️';
    case 'order_update':
      return '📋';
    default:
      return '📢';
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'critical_stock':
      return 'text-red-600 bg-red-50 border-red-200';
    case 'production_delay':
      return 'text-yellow-600 bg-yellow-50 border-yellow-200';
    case 'order_update':
      return 'text-blue-600 bg-blue-50 border-blue-200';
    default:
      return 'text-gray-600 bg-gray-50 border-gray-200';
  }
};

export default function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  
  const {
    notifications,
    unreadCount,
    isLoading,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    refreshNotifications,
  } = useSmartNotificationsUnified(true); // Disable polling to avoid conflicts

  // Real-time updates for notifications with unified system
  const { 
    isConnected: notificationsConnected, 
    isRealtimeEnabled: notificationsRealtimeEnabled,
    isUsingFallback: notificationsUsingFallback,
    retryRealtime: retryNotificationsRealtime
  } = useRealtimeUnified('notifications', 
    (newNotification) => {
      console.log('🔔 Bell: New notification received:', newNotification);
      refreshNotifications();
    },
    (updatedNotification) => {
      console.log('🔔 Bell: Notification updated:', updatedNotification);
      refreshNotifications();
    },
    (deletedNotification) => {
      console.log('🔔 Bell: Notification deleted:', deletedNotification);
      refreshNotifications();
    },
    () => refreshNotifications(), // fallback fetch
    {
      maxRetries: 3,
      retryDelay: 2000,
      enableFallback: true,
      fallbackInterval: 30000
    }
  );

  const handleNotificationClick = (notification: any) => {
    if (!notification.is_read) {
      markNotificationAsRead(notification.id);
    }
  };

  const handleDeleteClick = (id: string) => {
    setDeleteId(id);
  };

  const confirmDelete = () => {
    if (deleteId) {
      deleteNotification(deleteId);
      setDeleteId(null);
    }
  };

  const recentNotifications = notifications.slice(0, 10);

  return (
    <>
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="relative">
            {unreadCount > 0 ? (
              <BellRing className="h-5 w-5" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unreadCount > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-5 w-5 rounded-full p-0 text-xs flex items-center justify-center"
              >
                {unreadCount > 99 ? '99+' : unreadCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        
        <DropdownMenuContent align="end" className="w-80">
          <div className="flex items-center justify-between p-4">
            <h3 className="font-semibold">Bildirimler</h3>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllNotificationsAsRead}
                  className="text-xs"
                >
                  <Check className="h-3 w-3 mr-1" />
                  Tümünü Okundu İşaretle
                </Button>
              )}
            </div>
          </div>
          
          <DropdownMenuSeparator />
          
          <ScrollArea className="h-96">
            {isLoading ? (
              <div className="flex items-center justify-center p-8">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div>
              </div>
            ) : recentNotifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center p-8 text-center">
                <Bell className="h-8 w-8 text-gray-400 mb-2" />
                <p className="text-sm text-gray-500">Henüz bildirim yok</p>
              </div>
            ) : (
              <div className="p-2">
                {recentNotifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`p-3 rounded-lg border mb-2 cursor-pointer transition-colors ${
                      notification.is_read 
                        ? 'bg-white' 
                        : 'bg-blue-50 border-blue-200'
                    } ${getNotificationColor(notification.type)}`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-2 flex-1">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className={`font-medium text-sm ${
                            notification.is_read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatDistanceToNow(new Date(notification.created_at), {
                              addSuffix: true,
                              locale: tr,
                            })}
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(notification.id);
                        }}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
          
          {notifications.length > 10 && (
            <>
              <DropdownMenuSeparator />
              <div className="p-2">
                <Button variant="ghost" size="sm" className="w-full">
                  Tüm Bildirimleri Görüntüle
                </Button>
              </div>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bildirimi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu bildirimi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
