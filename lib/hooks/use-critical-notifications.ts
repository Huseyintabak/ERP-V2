import { useEffect } from 'react';
import { toast } from 'sonner';
import { useRealtimeStore } from './use-realtime-store';
import { useNotificationStore } from '@/stores/notification-store';

interface CriticalNotification {
  id: string;
  type: 'critical_stock' | 'production_alert' | 'system_alert';
  title: string;
  message: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
}

export const useCriticalNotifications = () => {
  const { addNotification } = useNotificationStore();

  // Real-time handler for critical notifications
  const handlers = {
    onNotificationAdd: (notification: CriticalNotification) => {
      // Only show toast for critical and high severity notifications
      if (notification.severity === 'critical' || notification.severity === 'high') {
        // Determine toast type based on severity
        const toastType = notification.severity === 'critical' ? 'error' : 'warning';
        
        // Show toast notification
        toast[toastType](notification.title, {
          description: notification.message,
          duration: notification.severity === 'critical' ? 10000 : 5000, // Critical notifications stay longer
          action: {
            label: 'Detay',
            onClick: () => {
              // Navigate to relevant page based on notification type
              if (notification.type === 'critical_stock') {
                window.location.href = '/stok/hammaddeler';
              } else if (notification.type === 'production_alert') {
                window.location.href = '/uretim/planlar';
              }
            },
          },
        });
      }
    },
  };

  // Subscribe to real-time notifications
  useRealtimeStore(handlers);

  // Also add to notification store for persistent display
  useEffect(() => {
    // This effect will run when notifications are added via real-time
    // The notification store will handle displaying them in the notification bell
  }, [addNotification]);
};

// Hook for specific critical stock notifications
export const useCriticalStockNotifications = () => {
  const handlers = {
    onRawMaterialUpdate: (material: any) => {
      // Check if material quantity is at critical level
      if (material.quantity <= material.critical_level) {
        toast.error('KRİTİK STOK UYARISI', {
          description: `${material.name} (${material.code}) kritik stok seviyesinin altında!`,
          duration: 10000,
          action: {
            label: 'Stok Kontrolü',
            onClick: () => {
              window.location.href = '/stok/hammaddeler';
            },
          },
        });
      }
    },
    
    onSemiFinishedUpdate: (product: any) => {
      // Check if semi-finished product quantity is at critical level
      if (product.quantity <= product.critical_level) {
        toast.warning('YARI MAMUL STOK UYARISI', {
          description: `${product.name} (${product.code}) kritik stok seviyesinin altında!`,
          duration: 8000,
          action: {
            label: 'Stok Kontrolü',
            onClick: () => {
              window.location.href = '/stok/yari-mamuller';
            },
          },
        });
      }
    },
    
    onFinishedProductUpdate: (product: any) => {
      // Check if finished product quantity is at critical level
      if (product.quantity <= product.critical_level) {
        toast.warning('NİHAİ ÜRÜN STOK UYARISI', {
          description: `${product.name} (${product.code}) kritik stok seviyesinin altında!`,
          duration: 8000,
          action: {
            label: 'Stok Kontrolü',
            onClick: () => {
              window.location.href = '/stok/nihai-urunler';
            },
          },
        });
      }
    },
  };

  useRealtimeStore(handlers);
};

// Hook for production alerts
export const useProductionAlerts = () => {
  const handlers = {
    onProductionPlanUpdate: (plan: any) => {
      // Check if production plan is delayed
      const endDate = new Date(plan.end_date);
      const now = new Date();
      const daysUntilDeadline = Math.ceil((endDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      
      if (daysUntilDeadline <= 1 && plan.status === 'devam_ediyor') {
        toast.warning('ÜRETİM GECİKME UYARISI', {
          description: `Plan ${plan.plan_number || plan.id.slice(0, 8)} teslim tarihine ${daysUntilDeadline} gün kaldı!`,
          duration: 8000,
          action: {
            label: 'Plan Detayı',
            onClick: () => {
              window.location.href = '/uretim/planlar';
            },
          },
        });
      }
      
      // Check if production is completed
      if (plan.status === 'tamamlandi') {
        toast.success('ÜRETİM TAMAMLANDI', {
          description: `Plan ${plan.plan_number || plan.id.slice(0, 8)} başarıyla tamamlandı!`,
          duration: 5000,
        });
      }
    },
    
    onOrderUpdate: (order: any) => {
      // Check if order is approved and ready for production
      if (order.status === 'onaylandi') {
        toast.info('SİPARİŞ ONAYLANDI', {
          description: `Sipariş ${order.order_number} onaylandı ve üretime hazır!`,
          duration: 5000,
          action: {
            label: 'Sipariş Detayı',
            onClick: () => {
              window.location.href = '/uretim/siparisler';
            },
          },
        });
      }
    },
  };

  useRealtimeStore(handlers);
};

// Main hook that combines all critical notifications
export const useAllCriticalNotifications = () => {
  useCriticalNotifications();
  useCriticalStockNotifications();
  useProductionAlerts();
};
