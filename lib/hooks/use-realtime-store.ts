import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStockStore, type RawMaterial, type SemiFinishedProduct, type FinishedProduct, type StockMovement } from '@/stores/stock-store';
import { useOrderStore, type Order, type ProductionPlan } from '@/stores/order-store';
import { useDashboardStatsStore } from '@/stores/dashboard-stats-store';
import { useNotificationStore } from '@/stores/notification-store';
import { logger } from '@/lib/utils/logger';

// Real-time event handlers
interface RealtimeHandlers {
  onRawMaterialUpdate?: (material: RawMaterial) => void;
  onSemiFinishedUpdate?: (product: SemiFinishedProduct) => void;
  onFinishedProductUpdate?: (product: FinishedProduct) => void;
  onStockMovementAdd?: (movement: StockMovement) => void;
  onOrderUpdate?: (order: Order) => void;
  onProductionPlanUpdate?: (plan: ProductionPlan) => void;
  onNotificationAdd?: (notification: any) => void;
}

// Real-time subscription manager
export const useRealtimeStore = (handlers: RealtimeHandlers = {}) => {
  const stockActions = useStockStore((state) => state.actions);
  const orderActions = useOrderStore((state) => state.actions);
  const dashboardActions = useDashboardStatsStore((state) => state.actions);
  const notificationActions = useNotificationStore((state) => state.actions);
  
  const subscriptionsRef = useRef<Array<{ channel: any; table: string }>>([]);
  const supabaseRef = useRef(createClient());

  useEffect(() => {
    const supabase = supabaseRef.current;
    const subscriptions: Array<{ channel: any; table: string }> = [];

    // Raw Materials real-time subscription
    const rawMaterialsChannel = supabase
      .channel('raw-materials-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'raw_materials',
        },
        (payload) => {
          logger.log('Raw material updated:', payload.new);
          const material = payload.new as RawMaterial;
          stockActions.updateRawMaterial(material);
          
          // Update dashboard stats for relevant roles
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalRawMaterials: 0, // Will be recalculated
            criticalStockItems: 0, // Will be recalculated
            lowStockItems: 0, // Will be recalculated
          });
          
          handlers.onRawMaterialUpdate?.(material);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'raw_materials',
        },
        (payload) => {
          logger.log('Raw material added:', payload.new);
          const material = payload.new as RawMaterial;
          stockActions.updateRawMaterial(material);
          
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalRawMaterials: 0, // Will be recalculated
          });
          
          handlers.onRawMaterialUpdate?.(material);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          // Silently handle WebSocket connection errors - Supabase will auto-reconnect
          if (process.env.NODE_ENV === 'development') {
            logger.log('Raw materials channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Raw materials channel subscribed');
        }
      });

    subscriptions.push({ channel: rawMaterialsChannel, table: 'raw_materials' });

    // Semi Finished Products real-time subscription
    const semiFinishedChannel = supabase
      .channel('semi-finished-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'semi_finished_products',
        },
        (payload) => {
          logger.log('Semi finished product updated:', payload.new);
          const product = payload.new as SemiFinishedProduct;
          stockActions.updateSemiFinishedProduct(product);
          
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalSemiFinished: 0, // Will be recalculated
            criticalStockItems: 0, // Will be recalculated
            lowStockItems: 0, // Will be recalculated
          });
          
          handlers.onSemiFinishedUpdate?.(product);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'semi_finished_products',
        },
        (payload) => {
          logger.log('Semi finished product added:', payload.new);
          const product = payload.new as SemiFinishedProduct;
          stockActions.updateSemiFinishedProduct(product);
          
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalSemiFinished: 0, // Will be recalculated
          });
          
          handlers.onSemiFinishedUpdate?.(product);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Semi finished channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Semi finished channel subscribed');
        }
      });

    subscriptions.push({ channel: semiFinishedChannel, table: 'semi_finished_products' });

    // Finished Products real-time subscription
    const finishedProductsChannel = supabase
      .channel('finished-products-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'finished_products',
        },
        (payload) => {
          logger.log('Finished product updated:', payload.new);
          const product = payload.new as FinishedProduct;
          stockActions.updateFinishedProduct(product);
          
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalFinished: 0, // Will be recalculated
            criticalStockItems: 0, // Will be recalculated
            lowStockItems: 0, // Will be recalculated
          });
          
          handlers.onFinishedProductUpdate?.(product);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'finished_products',
        },
        (payload) => {
          logger.log('Finished product added:', payload.new);
          const product = payload.new as FinishedProduct;
          stockActions.updateFinishedProduct(product);
          
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalFinished: 0, // Will be recalculated
          });
          
          handlers.onFinishedProductUpdate?.(product);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Finished products channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Finished products channel subscribed');
        }
      });

    subscriptions.push({ channel: finishedProductsChannel, table: 'finished_products' });

    // Stock Movements real-time subscription
    const stockMovementsChannel = supabase
      .channel('stock-movements-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'stock_movements',
        },
        (payload) => {
          logger.log('Stock movement added:', payload.new);
          const movement = payload.new as StockMovement;
          stockActions.addStockMovement(movement);
          
          // Update dashboard stats for all roles
          dashboardActions.updateStats('yonetici', {
            totalStockValue: 0, // Will be recalculated
          });
          dashboardActions.updateStats('depo', {
            totalRawMaterials: 0, // Will be recalculated
            totalSemiFinished: 0, // Will be recalculated
            totalFinished: 0, // Will be recalculated
          });
          
          handlers.onStockMovementAdd?.(movement);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Stock movements channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Stock movements channel subscribed');
        }
      });

    subscriptions.push({ channel: stockMovementsChannel, table: 'stock_movements' });

    // Orders real-time subscription
    const ordersChannel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          logger.log('Order updated:', payload.new);
          const order = payload.new as Order;
          orderActions.updateOrder(order);
          
          // Update dashboard stats for relevant roles
          dashboardActions.updateStats('yonetici', {
            totalOrders: 0, // Will be recalculated
            totalRevenue: 0, // Will be recalculated
            monthlyRevenue: 0, // Will be recalculated
            averageOrderValue: 0, // Will be recalculated
            pendingOrders: 0, // Will be recalculated
            inProductionOrders: 0, // Will be recalculated
            completedOrders: 0, // Will be recalculated
          });
          dashboardActions.updateStats('planlama', {
            totalOrders: 0, // Will be recalculated
            pendingOrders: 0, // Will be recalculated
            inProductionOrders: 0, // Will be recalculated
            completedOrders: 0, // Will be recalculated
          });
          
          handlers.onOrderUpdate?.(order);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        (payload) => {
          logger.log('Order added:', payload.new);
          const order = payload.new as Order;
          orderActions.addOrder(order);
          
          dashboardActions.updateStats('yonetici', {
            totalOrders: 0, // Will be recalculated
            totalRevenue: 0, // Will be recalculated
            monthlyRevenue: 0, // Will be recalculated
            averageOrderValue: 0, // Will be recalculated
            pendingOrders: 0, // Will be recalculated
          });
          dashboardActions.updateStats('planlama', {
            totalOrders: 0, // Will be recalculated
            pendingOrders: 0, // Will be recalculated
          });
          
          handlers.onOrderUpdate?.(order);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Orders channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Orders channel subscribed');
        }
      });

    subscriptions.push({ channel: ordersChannel, table: 'orders' });

    // Production Plans real-time subscription
    const productionPlansChannel = supabase
      .channel('production-plans-changes')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'production_plans',
        },
        (payload) => {
          logger.log('Production plan updated:', payload.new);
          const plan = payload.new as ProductionPlan;
          orderActions.updateProductionPlan(plan);
          
          // Update dashboard stats for relevant roles
          dashboardActions.updateStats('yonetici', {
            activeProductionPlans: 0, // Will be recalculated
            productionEfficiency: 0, // Will be recalculated
            onTimeDelivery: 0, // Will be recalculated
          });
          dashboardActions.updateStats('planlama', {
            activeProductionPlans: 0, // Will be recalculated
            productionEfficiency: 0, // Will be recalculated
            onTimeDelivery: 0, // Will be recalculated
          });
          dashboardActions.updateStats('operator', {
            activeProductionPlans: 0, // Will be recalculated
          });
          
          handlers.onProductionPlanUpdate?.(plan);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'production_plans',
        },
        (payload) => {
          logger.log('Production plan added:', payload.new);
          const plan = payload.new as ProductionPlan;
          orderActions.addProductionPlan(plan);
          
          dashboardActions.updateStats('yonetici', {
            activeProductionPlans: 0, // Will be recalculated
          });
          dashboardActions.updateStats('planlama', {
            activeProductionPlans: 0, // Will be recalculated
          });
          dashboardActions.updateStats('operator', {
            activeProductionPlans: 0, // Will be recalculated
          });
          
          handlers.onProductionPlanUpdate?.(plan);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Production plans channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Production plans channel subscribed');
        }
      });

    subscriptions.push({ channel: productionPlansChannel, table: 'production_plans' });

    // Notifications real-time subscription
    const notificationsChannel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
        },
        (payload) => {
          logger.log('Notification added:', payload.new);
          const notification = payload.new;
          notificationActions.addNotification(notification);
          
          handlers.onNotificationAdd?.(notification);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log('Notifications channel subscription error (will auto-reconnect):', err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log('Notifications channel subscribed');
        }
      });

    subscriptions.push({ channel: notificationsChannel, table: 'notifications' });

    // Store subscriptions for cleanup
    subscriptionsRef.current = subscriptions;

    // Cleanup function
    return () => {
      subscriptions.forEach(({ channel, table }) => {
        // Only log in development
        if (process.env.NODE_ENV === 'development') {
          logger.log(`Unsubscribing from ${table} changes`);
        }
        supabase.removeChannel(channel);
      });
      subscriptionsRef.current = [];
    };
  }, [stockActions, orderActions, dashboardActions, notificationActions, handlers]);

  // Return subscription info for debugging
  return {
    subscriptions: subscriptionsRef.current,
    isConnected: subscriptionsRef.current.length > 0,
  };
};

// Hook for role-specific real-time updates
export const useRoleBasedRealtime = (userRole: string) => {
  const handlers: RealtimeHandlers = {};

  // Add role-specific handlers
  if (userRole === 'yonetici') {
    handlers.onRawMaterialUpdate = (material) => {
      logger.log('Yönetici: Raw material updated', material);
    };
    handlers.onOrderUpdate = (order) => {
      logger.log('Yönetici: Order updated', order);
    };
  }

  if (userRole === 'planlama') {
    handlers.onProductionPlanUpdate = (plan) => {
      logger.log('Planlama: Production plan updated', plan);
    };
    handlers.onOrderUpdate = (order) => {
      logger.log('Planlama: Order updated', order);
    };
  }

  if (userRole === 'depo') {
    handlers.onRawMaterialUpdate = (material) => {
      logger.log('Depo: Raw material updated', material);
    };
    handlers.onSemiFinishedUpdate = (product) => {
      logger.log('Depo: Semi finished product updated', product);
    };
    handlers.onFinishedProductUpdate = (product) => {
      logger.log('Depo: Finished product updated', product);
    };
    handlers.onStockMovementAdd = (movement) => {
      logger.log('Depo: Stock movement added', movement);
    };
  }

  if (userRole === 'operator') {
    handlers.onProductionPlanUpdate = (plan) => {
      logger.log('Operator: Production plan updated', plan);
    };
  }

  // All roles get notifications
  handlers.onNotificationAdd = (notification) => {
    logger.log(`${userRole}: Notification received`, notification);
  };

  return useRealtimeStore(handlers);
};

// Hook for specific table real-time updates
export const useTableRealtime = (table: string, onUpdate: (payload: any) => void) => {
  const supabase = createClient();

  useEffect(() => {
    const channel = supabase
      .channel(`${table}-realtime`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
        },
        onUpdate
      )
      .subscribe((status, err) => {
        if (err) {
          if (process.env.NODE_ENV === 'development') {
            logger.log(`${table} channel subscription error (will auto-reconnect):`, err);
          }
          return;
        }
        if (process.env.NODE_ENV === 'development' && status === 'SUBSCRIBED') {
          logger.log(`${table} channel subscribed`);
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate, supabase]);
};

// Export types
export type { RealtimeHandlers };
