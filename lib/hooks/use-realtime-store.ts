import { useEffect, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useStockStore, type RawMaterial, type SemiFinishedProduct, type FinishedProduct, type StockMovement } from '@/stores/stock-store';
import { useOrderStore, type Order, type ProductionPlan } from '@/stores/order-store';
import { useDashboardStatsStore } from '@/stores/dashboard-stats-store';
import { useNotificationStore } from '@/stores/notification-store';

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
          console.log('Raw material updated:', payload.new);
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
          console.log('Raw material added:', payload.new);
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
      .subscribe();

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
          console.log('Semi finished product updated:', payload.new);
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
          console.log('Semi finished product added:', payload.new);
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
      .subscribe();

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
          console.log('Finished product updated:', payload.new);
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
          console.log('Finished product added:', payload.new);
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
      .subscribe();

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
          console.log('Stock movement added:', payload.new);
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
      .subscribe();

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
          console.log('Order updated:', payload.new);
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
          console.log('Order added:', payload.new);
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
      .subscribe();

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
          console.log('Production plan updated:', payload.new);
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
          console.log('Production plan added:', payload.new);
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
      .subscribe();

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
          console.log('Notification added:', payload.new);
          const notification = payload.new;
          notificationActions.addNotification(notification);
          
          handlers.onNotificationAdd?.(notification);
        }
      )
      .subscribe();

    subscriptions.push({ channel: notificationsChannel, table: 'notifications' });

    // Store subscriptions for cleanup
    subscriptionsRef.current = subscriptions;

    // Cleanup function
    return () => {
      subscriptions.forEach(({ channel, table }) => {
        console.log(`Unsubscribing from ${table} changes`);
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
      console.log('Yönetici: Raw material updated', material);
    };
    handlers.onOrderUpdate = (order) => {
      console.log('Yönetici: Order updated', order);
    };
  }

  if (userRole === 'planlama') {
    handlers.onProductionPlanUpdate = (plan) => {
      console.log('Planlama: Production plan updated', plan);
    };
    handlers.onOrderUpdate = (order) => {
      console.log('Planlama: Order updated', order);
    };
  }

  if (userRole === 'depo') {
    handlers.onRawMaterialUpdate = (material) => {
      console.log('Depo: Raw material updated', material);
    };
    handlers.onSemiFinishedUpdate = (product) => {
      console.log('Depo: Semi finished product updated', product);
    };
    handlers.onFinishedProductUpdate = (product) => {
      console.log('Depo: Finished product updated', product);
    };
    handlers.onStockMovementAdd = (movement) => {
      console.log('Depo: Stock movement added', movement);
    };
  }

  if (userRole === 'operator') {
    handlers.onProductionPlanUpdate = (plan) => {
      console.log('Operator: Production plan updated', plan);
    };
  }

  // All roles get notifications
  handlers.onNotificationAdd = (notification) => {
    console.log(`${userRole}: Notification received`, notification);
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, onUpdate, supabase]);
};

// Export types
export type { RealtimeHandlers };
