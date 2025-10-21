'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { 
  Bell, 
  BellRing, 
  Check, 
  Trash2, 
  Eye, 
  EyeOff,
  Filter,
  Plus
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useSmartNotificationsUnified } from '@/lib/hooks/use-smart-notifications-unified';
import { toast } from 'sonner';
import { useRealtimeUnified } from '@/lib/hooks/use-realtime-unified';
import { RealtimeConnectionMonitor } from '@/components/realtime-connection-monitor';

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

const getNotificationTypeDisplay = (type: string) => {
  switch (type) {
    case 'critical_stock':
      return 'Kritik Stok';
    case 'production_delay':
      return 'Üretim Gecikmesi';
    case 'order_update':
      return 'Sipariş Güncellemesi';
    default:
      return type;
  }
};

const getNotificationColor = (type: string) => {
  switch (type) {
    case 'critical_stock':
      return 'bg-red-100 text-red-800 border-red-200';
    case 'production_delay':
      return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'order_update':
      return 'bg-blue-100 text-blue-800 border-blue-200';
    default:
      return 'bg-gray-100 text-gray-800 border-gray-200';
  }
};

export default function BildirimlerPage() {
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const {
    notifications,
    unreadCount,
    isLoading,
    markNotificationAsRead,
    deleteNotification,
    markAllNotificationsAsRead,
    refreshNotifications,
  } = useSmartNotificationsUnified(true); // Disable polling to avoid conflicts with realtime

  // Initial fetch when filters change
  useEffect(() => {
    refreshNotifications();
  }, [typeFilter, statusFilter, refreshNotifications]);

  // Real-time updates for notifications with unified system
  const { 
    isConnected: notificationsConnected, 
    isRealtimeEnabled: notificationsRealtimeEnabled,
    isUsingFallback: notificationsUsingFallback,
    retryRealtime: retryNotificationsRealtime
  } = useRealtimeUnified('notifications', 
    (newNotification) => {
      console.log('🔔 New notification received:', newNotification);
      refreshNotifications();
      toast.success('Yeni bildirim geldi!');
    },
    (updatedNotification) => {
      console.log('🔔 Notification updated:', updatedNotification);
      refreshNotifications();
    },
    (deletedNotification) => {
      console.log('🔔 Notification deleted:', deletedNotification);
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

  const handleMarkAllAsRead = () => {
    markAllNotificationsAsRead();
  };

  const filteredNotifications = notifications.filter(notification => {
    if (typeFilter && typeFilter !== 'all' && notification.type !== typeFilter) return false;
    if (statusFilter === 'read' && !notification.is_read) return false;
    if (statusFilter === 'unread' && notification.is_read) return false;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Bildirimler</h1>
          <p className="text-muted-foreground">
            Sistem bildirimlerini yönetin ve takip edin
          </p>
        </div>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <Button onClick={handleMarkAllAsRead} variant="outline">
              <Check className="mr-2 h-4 w-4" />
              Tümünü Okundu İşaretle
            </Button>
          )}
        </div>
      </div>

      {/* Connection Status Monitor */}
      <RealtimeConnectionMonitor
        connections={[
          {
            table: 'notifications',
            isConnected: notificationsConnected,
            isRealtimeEnabled: notificationsRealtimeEnabled,
            isUsingFallback: notificationsUsingFallback,
            error: null,
            retryCount: 0,
            retryRealtime: retryNotificationsRealtime
          }
        ]}
        className="mb-6"
      />

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Bildirim</CardTitle>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Okunmamış</CardTitle>
            <BellRing className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
            <span className="text-lg">🔴</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {notifications.filter(n => n.type === 'critical_stock' && !n.is_read).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Üretim Gecikmesi</CardTitle>
            <span className="text-lg">⚠️</span>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">
              {notifications.filter(n => n.type === 'production_delay' && !n.is_read).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Tür seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Türler</SelectItem>
                <SelectItem value="critical_stock">Kritik Stok</SelectItem>
                <SelectItem value="production_delay">Üretim Gecikmesi</SelectItem>
                <SelectItem value="order_update">Sipariş Güncellemesi</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="unread">Okunmamış</SelectItem>
                <SelectItem value="read">Okunmuş</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notifications Table */}
      <Card>
        <CardHeader>
          <CardTitle>Bildirim Listesi</CardTitle>
          <CardDescription>
            {filteredNotifications.length} bildirim gösteriliyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-8 text-center">
              <Bell className="h-12 w-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Bildirim Bulunamadı</h3>
              <p className="text-sm text-gray-500">
                {typeFilter || statusFilter 
                  ? 'Seçilen filtrelerle eşleşen bildirim bulunamadı'
                  : 'Henüz hiç bildirim yok'
                }
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Durum</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Başlık</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredNotifications.map((notification) => (
                  <TableRow 
                    key={notification.id}
                    className={`cursor-pointer ${
                      !notification.is_read ? 'bg-blue-50' : ''
                    }`}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <TableCell>
                      {notification.is_read ? (
                        <Badge variant="outline">
                          <Eye className="h-3 w-3 mr-1" />
                          Okundu
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-blue-600">
                          <EyeOff className="h-3 w-3 mr-1" />
                          Okunmadı
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center space-x-2">
                        <span className="text-lg">
                          {getNotificationIcon(notification.type)}
                        </span>
                        <Badge className={getNotificationColor(notification.type)}>
                          {getNotificationTypeDisplay(notification.type)}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="font-medium">
                      {notification.title}
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {notification.message}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: tr,
                      })}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteClick(notification.id);
                        }}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
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
            <AlertDialogAction 
              onClick={confirmDelete}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
