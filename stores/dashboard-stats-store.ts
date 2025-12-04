import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

// Types
export interface DashboardStats {
  // Financial KPIs (Yönetici only)
  totalRevenue: number;
  monthlyRevenue: number;
  dailyRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  totalStockValue: number;
  stockValueBreakdown: {
    rawMaterials: { count: number; quantity: number; value: number };
    semiFinished: { count: number; quantity: number; value: number };
    finishedProducts: { count: number; quantity: number; value: number };
  };
  
  // Operational KPIs (All roles)
  pendingOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  activeProductionPlans: number;
  
  // Stock KPIs (Depo & Yönetici)
  totalRawMaterials: number;
  totalSemiFinished: number;
  totalFinished: number;
  criticalStockItems: number;
  lowStockItems: number;
  
  // Production KPIs (Planlama & Yönetici)
  productionEfficiency: number;
  onTimeDelivery: number;
  operatorUtilization: number;
  
  // Recent activity
  recentOrders: Array<{
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    created_at: string;
  }>;
  
  recentProductionPlans: Array<{
    id: string;
    order_number: string;
    product_name: string;
    status: string;
    created_at: string;
  }>;
  
  recentStockMovements: Array<{
    id: string;
    material_name: string;
    movement_type: string;
    quantity: number;
    created_at: string;
  }>;
  
  // Chart data
  revenueChart: Array<{
    month: string;
    revenue: number;
    orders: number;
  }>;
  
  productionChart: Array<{
    date: string;
    planned: number;
    completed: number;
  }>;
  
  stockLevelsChart: Array<{
    material_type: string;
    current: number;
    min_level: number;
    max_level: number;
  }>;
}

export interface RoleBasedStats {
  yonetici: DashboardStats;
  planlama: DashboardStats;
  depo: DashboardStats;
  operator: DashboardStats;
}

// Store State
interface DashboardStatsStore {
  // Data
  stats: Partial<RoleBasedStats>;
  
  // Loading states
  loading: {
    yonetici: boolean;
    planlama: boolean;
    depo: boolean;
    operator: boolean;
  };
  
  // Error states
  errors: {
    yonetici: string | null;
    planlama: string | null;
    depo: string | null;
    operator: string | null;
  };
  
  // Last updated timestamps
  lastUpdated: {
    yonetici: number | null;
    planlama: number | null;
    depo: number | null;
    operator: number | null;
  };
  
  // Actions
  actions: {
    // Fetch stats for specific role
    fetchStats: (role: keyof RoleBasedStats) => Promise<void>;
    fetchAllStats: () => Promise<void>;
    
    // Real-time updates
    updateStats: (role: keyof RoleBasedStats, newStats: Partial<DashboardStats>) => void;
    
    // Refresh specific stats
    refreshFinancialStats: () => Promise<void>;
    refreshOperationalStats: () => Promise<void>;
    refreshStockStats: () => Promise<void>;
    refreshProductionStats: () => Promise<void>;
    
    // Reset
    reset: () => void;
  };
}

// Initial state
const initialDashboardStats: DashboardStats = {
  // Financial KPIs
  totalRevenue: 0,
  monthlyRevenue: 0,
  dailyRevenue: 0,
  totalOrders: 0,
  averageOrderValue: 0,
  totalStockValue: 0,
  stockValueBreakdown: {
    rawMaterials: { count: 0, quantity: 0, value: 0 },
    semiFinished: { count: 0, quantity: 0, value: 0 },
    finishedProducts: { count: 0, quantity: 0, value: 0 }
  },
  
  // Operational KPIs
  pendingOrders: 0,
  inProductionOrders: 0,
  completedOrders: 0,
  activeProductionPlans: 0,
  
  // Stock KPIs
  totalRawMaterials: 0,
  totalSemiFinished: 0,
  totalFinished: 0,
  criticalStockItems: 0,
  lowStockItems: 0,
  
  // Production KPIs
  productionEfficiency: 0,
  onTimeDelivery: 0,
  operatorUtilization: 0,
  
  // Recent activity
  recentOrders: [],
  recentProductionPlans: [],
  recentStockMovements: [],
  
  // Chart data
  revenueChart: [],
  productionChart: [],
  stockLevelsChart: [],
};

const initialState = {
  stats: {},
  loading: {
    yonetici: false,
    planlama: false,
    depo: false,
    operator: false,
  },
  errors: {
    yonetici: null,
    planlama: null,
    depo: null,
    operator: null,
  },
  lastUpdated: {
    yonetici: null,
    planlama: null,
    depo: null,
    operator: null,
  },
};

// Helper function to calculate role-specific stats
const calculateRoleStats = async (role: keyof RoleBasedStats): Promise<DashboardStats> => {
  const stats = { ...initialDashboardStats };
  
  try {
    // Fetch all necessary data in parallel
    const [ordersResponse, productionResponse, stockResponse, movementsResponse] = await Promise.all([
      fetch('/api/orders?limit=1000'),
      fetch('/api/production/plans?limit=1000'),
      Promise.all([
        fetch('/api/stock/raw?limit=1000'),
        fetch('/api/stock/semi?limit=1000'),
        fetch('/api/stock/finished?limit=1000'),
      ]),
      fetch('/api/stock/movements?limit=100'),
    ]);
    
    const [ordersResult, productionResult, stockResults, movementsResult] = await Promise.all([
      ordersResponse.json(),
      productionResponse.json(),
      Promise.all(stockResponse.map(r => r.json())),
      movementsResponse.json(),
    ]);
    
    const orders = ordersResult.data || [];
    const productionPlans = productionResult.data || [];
    const [rawMaterials, semiFinished, finishedProducts] = stockResults.map(r => r.data || []);
    const stockMovements = movementsResult.data || [];
    
    // Calculate financial KPIs (only for yonetici)
    if (role === 'yonetici') {
      // Calculate order revenue from order_items and finished_products
      // First, get all finished products with prices (fallback if product info not in order_items)
      const productPriceMap = new Map<string, number>();
      finishedProducts.forEach((product: any) => {
        productPriceMap.set(product.id, product.sale_price || product.unit_price || 0);
      });
      
      // Calculate total revenue from orders
      const calculateOrderRevenue = (order: any): number => {
        if (!order.items || !Array.isArray(order.items)) return 0;
        return order.items.reduce((sum: number, item: any) => {
          // Try to get price from product in order_items first, then fallback to productPriceMap
          const price = item.product?.sale_price || 
                       item.product?.unit_price || 
                       productPriceMap.get(item.product_id) || 
                       0;
          return sum + ((item.quantity || 0) * price);
        }, 0);
      };
      
      stats.totalRevenue = orders.reduce((sum: number, order: any) => sum + calculateOrderRevenue(order), 0);
      
      // Monthly revenue (current month)
      const now = new Date();
      stats.monthlyRevenue = orders
        .filter((order: any) => {
          const orderDate = new Date(order.created_at);
          return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
        })
        .reduce((sum: number, order: any) => sum + calculateOrderRevenue(order), 0);
      
      // Daily revenue (today's completed orders)
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      stats.dailyRevenue = orders
        .filter((order: any) => {
          if (order.status !== 'tamamlandi') return false;
          const completedDate = new Date(order.updated_at);
          completedDate.setHours(0, 0, 0, 0);
          return completedDate.getTime() === today.getTime();
        })
        .reduce((sum: number, order: any) => sum + calculateOrderRevenue(order), 0);
      
      stats.averageOrderValue = orders.length > 0 ? stats.totalRevenue / orders.length : 0;
      
      // Calculate stock value using COST prices (not sale prices)
      // Raw materials: unit_price (cost) - maliyet fiyatı
      // Semi-finished: unit_cost (cost) - maliyet fiyatı  
      // Finished products: cost_price (if available) - BOM bazlı maliyet, yoksa 0 (sale_price kullanma!)
      // EXCLUDE: "iscilik" related items (not physical inventory - labor costs)
      const stockValueCalculation = [
        ...rawMaterials
          .filter((item: any) => {
            // Exclude labor/cost items that shouldn't be in inventory
            const code = (item.code || '').toLowerCase();
            const name = (item.name || '').toLowerCase();
            return !code.includes('iscilik') && !name.includes('iscilik');
          })
          .map((item: any) => ({
            type: 'raw',
            code: item.code,
            name: item.name,
            quantity: item.quantity || 0,
            cost: item.unit_price || 0,
            value: (item.quantity || 0) * (item.unit_price || 0)
          })),
        ...semiFinished.map((item: any) => ({
          type: 'semi',
          code: item.code,
          name: item.name,
          quantity: item.quantity || 0,
          cost: item.unit_cost || 0,
          value: (item.quantity || 0) * (item.unit_cost || 0)
        })),
        ...finishedProducts.map((item: any) => ({
          type: 'finished',
          code: item.code,
          name: item.name,
          quantity: item.quantity || 0,
          cost: item.cost_price || 0, // Use cost_price, not sale_price for inventory value
          value: (item.quantity || 0) * (item.cost_price || 0)
        }))
      ];
      
      stats.totalStockValue = stockValueCalculation.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      
      // Calculate breakdown by type
      const rawItems = stockValueCalculation.filter(i => i.type === 'raw');
      const semiItems = stockValueCalculation.filter(i => i.type === 'semi');
      const finishedItems = stockValueCalculation.filter(i => i.type === 'finished');
      
      stats.stockValueBreakdown = {
        rawMaterials: {
          count: rawItems.length,
          quantity: rawItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          value: rawItems.reduce((sum, i) => sum + (i.value || 0), 0)
        },
        semiFinished: {
          count: semiItems.length,
          quantity: semiItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          value: semiItems.reduce((sum, i) => sum + (i.value || 0), 0)
        },
        finishedProducts: {
          count: finishedItems.length,
          quantity: finishedItems.reduce((sum, i) => sum + (i.quantity || 0), 0),
          value: finishedItems.reduce((sum, i) => sum + (i.value || 0), 0)
        }
      };
      
      // Debug: Log large values (optional, can be removed later)
      if (stats.totalStockValue > 1000000) {
        console.warn('⚠️ High stock value detected:', {
          total: stats.totalStockValue,
          breakdown: stats.stockValueBreakdown,
          topItems: stockValueCalculation
            .filter(i => i.value > 10000)
            .sort((a, b) => b.value - a.value)
            .slice(0, 10)
            .map(i => ({ type: i.type, code: i.code, name: i.name, qty: i.quantity, cost: i.cost, value: i.value }))
        });
      }
    }
    
    // Calculate operational KPIs
    stats.totalOrders = orders.length;
    
    // Pending orders - daily (today's pending orders)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    stats.pendingOrders = orders.filter((order: any) => {
      if (order.status !== 'beklemede') return false;
      const orderDate = new Date(order.created_at);
      orderDate.setHours(0, 0, 0, 0);
      return orderDate.getTime() === today.getTime();
    }).length;
    
    stats.inProductionOrders = orders.filter((order: any) => order.status === 'uretimde').length;
    
    // Completed orders - daily (today's completed orders)
    stats.completedOrders = orders.filter((order: any) => {
      if (order.status !== 'tamamlandi') return false;
      const completedDate = new Date(order.updated_at);
      completedDate.setHours(0, 0, 0, 0);
      return completedDate.getTime() === today.getTime();
    }).length;
    stats.activeProductionPlans = productionPlans.filter((plan: any) => 
      plan.status === 'devam_ediyor' || plan.status === 'planlandi'
    ).length;
    
    // Calculate stock KPIs
    stats.totalRawMaterials = rawMaterials.length;
    stats.totalSemiFinished = semiFinished.length;
    stats.totalFinished = finishedProducts.length;
    
    // Calculate critical and low stock items
    const allStockItems = [...rawMaterials, ...semiFinished, ...finishedProducts];
    stats.criticalStockItems = allStockItems.filter((item: any) => 
      item.quantity <= (item.critical_level || 0)
    ).length;
    stats.lowStockItems = allStockItems.filter((item: any) => 
      item.quantity <= (item.min_level || 0) && item.quantity > (item.critical_level || 0)
    ).length;
    
    // Calculate production KPIs (for planlama and yonetici)
    if (role === 'planlama' || role === 'yonetici') {
      const completedPlans = productionPlans.filter((plan: any) => plan.status === 'tamamlandi');
      const totalPlanned = productionPlans.reduce((sum: number, plan: any) => sum + (plan.target_quantity || 0), 0);
      const totalProduced = completedPlans.reduce((sum: number, plan: any) => sum + (plan.produced_quantity || 0), 0);
      
      stats.productionEfficiency = totalPlanned > 0 ? (totalProduced / totalPlanned) * 100 : 0;
      
      // Calculate on-time delivery (simplified)
      const onTimeOrders = orders.filter((order: any) => {
        if (order.status !== 'tamamlandi') return false;
        const deliveryDate = new Date(order.delivery_date);
        const completedDate = new Date(order.updated_at);
        return completedDate <= deliveryDate;
      });
      stats.onTimeDelivery = orders.length > 0 ? (onTimeOrders.length / orders.length) * 100 : 0;
      
      // Operator utilization (gerçek hesaplama)
      const operatorsResponse = await fetch('/api/operators');
      const operators = operatorsResponse.ok ? await operatorsResponse.json() : [];
      const totalOperators = Array.isArray(operators) ? operators.length : 0;
      const activeOperators = productionPlans
        .filter((p: any) => p.status === 'devam_ediyor' && p.assigned_operator_id)
        .reduce((acc: Set<string>, p: any) => {
          acc.add(p.assigned_operator_id);
          return acc;
        }, new Set()).size;
      stats.operatorUtilization = totalOperators > 0 ? (activeOperators / totalOperators) * 100 : 0;
    }
    
    // Recent activity
    stats.recentOrders = orders
      .slice(0, 5)
      .map((order: any) => ({
        id: order.id,
        order_number: order.order_number,
        customer_name: order.customer?.name || 'Unknown',
        status: order.status,
        created_at: order.created_at,
      }));
    
    stats.recentProductionPlans = productionPlans
      .slice(0, 5)
      .map((plan: any) => ({
        id: plan.id,
        order_number: plan.order?.order_number || 'Unknown',
        product_name: plan.product?.name || 'Unknown',
        status: plan.status,
        created_at: plan.created_at,
      }));
    
    stats.recentStockMovements = stockMovements
      .slice(0, 5)
      .map((movement: any) => ({
        id: movement.id,
        material_name: movement.material_name || 'Unknown',
        movement_type: movement.movement_type,
        quantity: movement.quantity,
        created_at: movement.created_at,
      }));
    
    // Chart data
    // Revenue chart (last 6 months)
    const now = new Date();
    stats.revenueChart = Array.from({ length: 6 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthStr = month.toLocaleDateString('tr-TR', { month: 'short', year: '2-digit' });
      
      const monthOrders = orders.filter((order: any) => {
        const orderDate = new Date(order.created_at);
        return orderDate.getMonth() === month.getMonth() && orderDate.getFullYear() === month.getFullYear();
      });
      
      return {
        month: monthStr,
        revenue: monthOrders.reduce((sum: number, order: any) => sum + (order.total_price || 0), 0),
        orders: monthOrders.length,
      };
    }).reverse();
    
    // Production chart (last 7 days)
    stats.productionChart = Array.from({ length: 7 }, (_, i) => {
      const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
      const dateStr = date.toLocaleDateString('tr-TR', { day: '2-digit', month: '2-digit' });
      
      const dayPlans = productionPlans.filter((plan: any) => {
        const planDate = new Date(plan.created_at);
        return planDate.toDateString() === date.toDateString();
      });
      
      return {
        date: dateStr,
        planned: dayPlans.reduce((sum: number, plan: any) => sum + (plan.target_quantity || 0), 0),
        completed: dayPlans
          .filter((plan: any) => plan.status === 'tamamlandi')
          .reduce((sum: number, plan: any) => sum + (plan.produced_quantity || 0), 0),
      };
    }).reverse();
    
    // Stock levels chart
    stats.stockLevelsChart = [
      {
        material_type: 'Hammaddeler',
        current: rawMaterials.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
        min_level: rawMaterials.reduce((sum: number, item: any) => sum + (item.min_level || 0), 0),
        max_level: rawMaterials.reduce((sum: number, item: any) => sum + (item.max_level || 0), 0),
      },
      {
        material_type: 'Yarı Mamuller',
        current: semiFinished.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
        min_level: semiFinished.reduce((sum: number, item: any) => sum + (item.min_level || 0), 0),
        max_level: semiFinished.reduce((sum: number, item: any) => sum + (item.max_level || 0), 0),
      },
      {
        material_type: 'Nihai Ürünler',
        current: finishedProducts.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
        min_level: finishedProducts.reduce((sum: number, item: any) => sum + (item.min_level || 0), 0),
        max_level: finishedProducts.reduce((sum: number, item: any) => sum + (item.max_level || 0), 0),
      },
    ];
    
  } catch (error) {
    console.error('Error calculating dashboard stats:', error);
  }
  
  return stats;
};

// Store implementation
export const useDashboardStatsStore = create<DashboardStatsStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      actions: {
        // Fetch stats for specific role
        fetchStats: async (role: keyof RoleBasedStats) => {
          set((state) => ({
            loading: { ...state.loading, [role]: true },
            errors: { ...state.errors, [role]: null },
          }));
          
          try {
            const stats = await calculateRoleStats(role);
            
            set((state) => ({
              stats: { ...state.stats, [role]: stats },
              loading: { ...state.loading, [role]: false },
              lastUpdated: { ...state.lastUpdated, [role]: Date.now() },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, [role]: false },
              errors: { ...state.errors, [role]: error instanceof Error ? error.message : 'Unknown error' },
            }));
          }
        },
        
        // Fetch all stats
        fetchAllStats: async () => {
          const roles: Array<keyof RoleBasedStats> = ['yonetici', 'planlama', 'depo', 'operator'];
          
          // Set all loading states to true
          set((state) => ({
            loading: Object.fromEntries(
              roles.map(role => [role, true])
            ) as typeof state.loading,
            errors: Object.fromEntries(
              roles.map(role => [role, null])
            ) as typeof state.errors,
          }));
          
          try {
            // Fetch all stats in parallel
            const statsPromises = roles.map(role => calculateRoleStats(role));
            const statsResults = await Promise.all(statsPromises);
            
            const newStats = Object.fromEntries(
              roles.map((role, index) => [role, statsResults[index]])
            ) as RoleBasedStats;
            
            set((state) => ({
              stats: newStats,
              loading: Object.fromEntries(
                roles.map(role => [role, false])
              ) as typeof state.loading,
              lastUpdated: Object.fromEntries(
                roles.map(role => [role, Date.now()])
              ) as typeof state.lastUpdated,
            }));
          } catch (error) {
            set((state) => ({
              loading: Object.fromEntries(
                roles.map(role => [role, false])
              ) as typeof state.loading,
              errors: Object.fromEntries(
                roles.map(role => [role, error instanceof Error ? error.message : 'Unknown error'])
              ) as typeof state.errors,
            }));
          }
        },
        
        // Real-time updates
        updateStats: (role: keyof RoleBasedStats, newStats: Partial<DashboardStats>) => {
          set((state) => ({
            stats: {
              ...state.stats,
              [role]: { ...state.stats[role], ...newStats },
            },
            lastUpdated: { ...state.lastUpdated, [role]: Date.now() },
          }));
        },
        
        // Refresh specific stats
        refreshFinancialStats: async () => {
          // This would trigger a refresh of financial data
          await get().actions.fetchStats('yonetici');
        },
        
        refreshOperationalStats: async () => {
          // This would trigger a refresh of operational data
          const roles: Array<keyof RoleBasedStats> = ['yonetici', 'planlama', 'depo', 'operator'];
          await Promise.all(roles.map(role => get().actions.fetchStats(role)));
        },
        
        refreshStockStats: async () => {
          // This would trigger a refresh of stock data
          const roles: Array<keyof RoleBasedStats> = ['yonetici', 'depo'];
          await Promise.all(roles.map(role => get().actions.fetchStats(role)));
        },
        
        refreshProductionStats: async () => {
          // This would trigger a refresh of production data
          const roles: Array<keyof RoleBasedStats> = ['yonetici', 'planlama'];
          await Promise.all(roles.map(role => get().actions.fetchStats(role)));
        },
        
        // Reset
        reset: () => {
          set(initialState);
        },
      },
    }),
    {
      name: 'dashboard-stats-store',
    }
  )
);

// Selectors for easier access
export const useDashboardStats = (role: keyof RoleBasedStats) => 
  useDashboardStatsStore((state) => state.stats[role]);

export const useDashboardLoading = (role: keyof RoleBasedStats) => 
  useDashboardStatsStore((state) => state.loading[role]);

export const useDashboardErrors = (role: keyof RoleBasedStats) => 
  useDashboardStatsStore((state) => state.errors[role]);

export const useDashboardActions = () => 
  useDashboardStatsStore((state) => state.actions);
