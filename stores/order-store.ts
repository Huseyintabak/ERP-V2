import { create } from "zustand";
import { devtools } from "zustand/middleware";
import { useAuthStore } from "./auth-store";

// Types
export interface Order {
  id: string;
  order_number: string;
  customer_id: string;
  product_id: string;
  quantity: number;
  unit_price: number;
  total_price: number;
  status: "beklemede" | "onaylandi" | "uretimde" | "tamamlandi" | "iptal";
  priority: "dusuk" | "normal" | "yuksek" | "acil";
  order_date: string;
  delivery_date: string;
  notes: string;
  created_at: string;
  updated_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
  };
}

export interface ProductionPlan {
  id: string;
  order_id: string;
  product_id: string;
  target_quantity: number;
  produced_quantity: number;
  status: "planlandi" | "devam_ediyor" | "tamamlandi" | "iptal";
  start_date: string;
  end_date: string;
  assigned_operator_id: string;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    order_number: string;
    customer_id: string;
  };
  product?: {
    id: string;
    name: string;
    code: string;
  };
  operator?: {
    id: string;
    name: string;
    series: string;
  };
}

export interface OrderStats {
  totalOrders: number;
  pendingOrders: number;
  approvedOrders: number;
  inProductionOrders: number;
  completedOrders: number;
  totalOrderValue: number;
  averageOrderValue: number;
  ordersThisMonth: number;
  ordersLastMonth: number;
}

export interface OrderFilters {
  status?: string;
  priority?: string;
  customerId?: string;
  productId?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

export interface ProductionFilters {
  status?: string;
  operatorId?: string;
  productId?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  page?: number;
  limit?: number;
  dateFrom?: string;
  dateTo?: string;
}

// Store State
interface OrderStore {
  // Data
  orders: Order[];
  productionPlans: ProductionPlan[];
  stats: OrderStats;

  // Loading states
  loading: {
    orders: boolean;
    productionPlans: boolean;
    stats: boolean;
  };

  // Error states
  errors: {
    orders: string | null;
    productionPlans: string | null;
    stats: string | null;
  };

  // Pagination
  pagination: {
    orders: { page: number; total: number; limit: number };
    productionPlans: { page: number; total: number; limit: number };
  };

  // Filters
  filters: {
    orders: OrderFilters;
    productionPlans: ProductionFilters;
  };

  // Actions
  actions: {
    // Fetch data
    fetchOrders: (filters?: OrderFilters) => Promise<void>;
    fetchProductionPlans: (filters?: ProductionFilters) => Promise<void>;
    fetchStats: () => Promise<void>;

    // Real-time updates
    updateOrder: (order: Order) => void;
    updateProductionPlan: (plan: ProductionPlan) => void;
    addOrder: (order: Order) => void;
    addProductionPlan: (plan: ProductionPlan) => void;
    updateStats: (newStats: Partial<OrderStats>) => void;

    // Optimistic updates
    optimisticUpdateOrder: (id: string, updates: Partial<Order>) => void;
    optimisticUpdateProductionPlan: (
      id: string,
      updates: Partial<ProductionPlan>,
    ) => void;
    optimisticAddOrder: (order: Omit<Order, "id">) => void;
    optimisticAddProductionPlan: (plan: Omit<ProductionPlan, "id">) => void;

    // Business logic
    approveOrder: (orderId: string) => Promise<void>;
    startProduction: (orderId: string, planId: string) => Promise<void>;
    completeProduction: (
      planId: string,
      producedQuantity: number,
    ) => Promise<void>;
    cancelOrder: (orderId: string, reason: string) => Promise<void>;

    // Filters
    setOrdersFilter: (filters: OrderFilters) => void;
    setProductionPlansFilter: (filters: ProductionFilters) => void;

    // Reset
    reset: () => void;
  };
}

// Initial state
const initialState = {
  orders: [],
  productionPlans: [],
  stats: {
    totalOrders: 0,
    pendingOrders: 0,
    approvedOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    totalOrderValue: 0,
    averageOrderValue: 0,
    ordersThisMonth: 0,
    ordersLastMonth: 0,
  },
  loading: {
    orders: false,
    productionPlans: false,
    stats: false,
  },
  errors: {
    orders: null,
    productionPlans: null,
    stats: null,
  },
  pagination: {
    orders: { page: 1, total: 0, limit: 50 },
    productionPlans: { page: 1, total: 0, limit: 50 },
  },
  filters: {
    orders: {
      page: 1,
      limit: 50,
      sortBy: "created_at",
      sortOrder: "desc" as const,
    },
    productionPlans: {
      page: 1,
      limit: 50,
      sortBy: "created_at",
      sortOrder: "desc" as const,
    },
  },
};

// Helper function to build query params
const buildQueryParams = (
  filters: OrderFilters | ProductionFilters,
): string => {
  const params = new URLSearchParams();

  Object.entries(filters).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.set(key, value.toString());
    }
  });

  return params.toString();
};

// Store implementation
export const useOrderStore = create<OrderStore>()(
  devtools(
    (set, get) => ({
      ...initialState,

      actions: {
        // Fetch Orders
        fetchOrders: async (filters?: OrderFilters) => {
          const currentFilters = filters || get().filters.orders;
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, orders: true },
            errors: { ...state.errors, orders: null },
            filters: { ...state.filters, orders: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/orders?${params}`, {
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              orders: result.data || [],
              loading: { ...state.loading, orders: false },
              pagination: {
                ...state.pagination,
                orders: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, orders: false },
              errors: {
                ...state.errors,
                orders:
                  error instanceof Error ? error.message : "Unknown error",
              },
            }));
          }
        },

        // Fetch Production Plans
        fetchProductionPlans: async (filters?: ProductionFilters) => {
          const currentFilters = filters || get().filters.productionPlans;
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, productionPlans: true },
            errors: { ...state.errors, productionPlans: null },
            filters: { ...state.filters, productionPlans: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/production/plans?${params}`, {
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              productionPlans: result.data || [],
              loading: { ...state.loading, productionPlans: false },
              pagination: {
                ...state.pagination,
                productionPlans: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, productionPlans: false },
              errors: {
                ...state.errors,
                productionPlans:
                  error instanceof Error ? error.message : "Unknown error",
              },
            }));
          }
        },

        // Fetch Stats
        fetchStats: async () => {
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, stats: true },
            errors: { ...state.errors, stats: null },
          }));

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            // Fetch orders with different status filters
            const [
              allOrdersResponse,
              pendingResponse,
              approvedResponse,
              inProductionResponse,
              completedResponse,
            ] = await Promise.all([
              fetch("/api/orders?limit=1000", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": user.id,
                },
              }),
              fetch("/api/orders?status=beklemede&limit=1000", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": user.id,
                },
              }),
              fetch("/api/orders?status=onaylandi&limit=1000", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": user.id,
                },
              }),
              fetch("/api/orders?status=uretimde&limit=1000", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": user.id,
                },
              }),
              fetch("/api/orders?status=tamamlandi&limit=1000", {
                headers: {
                  "Content-Type": "application/json",
                  "x-user-id": user.id,
                },
              }),
            ]);

            const [
              allOrdersResult,
              pendingResult,
              approvedResult,
              inProductionResult,
              completedResult,
            ] = await Promise.all([
              allOrdersResponse.json(),
              pendingResponse.json(),
              approvedResponse.json(),
              inProductionResponse.json(),
              completedResponse.json(),
            ]);

            const allOrders = allOrdersResult.data || [];
            const pendingOrders = pendingResult.data || [];
            const approvedOrders = approvedResult.data || [];
            const inProductionOrders = inProductionResult.data || [];
            const completedOrders = completedResult.data || [];

            // Calculate stats
            const totalOrders = allOrders.length;
            const totalOrderValue = allOrders.reduce(
              (sum: number, order: Order) => sum + (order.total_price || 0),
              0,
            );
            const averageOrderValue =
              totalOrders > 0 ? totalOrderValue / totalOrders : 0;

            // Calculate monthly orders (simplified)
            const now = new Date();
            const thisMonth = now.getMonth();
            const lastMonth = thisMonth === 0 ? 11 : thisMonth - 1;

            const ordersThisMonth = allOrders.filter((order: Order) => {
              const orderDate = new Date(order.created_at);
              return orderDate.getMonth() === thisMonth;
            }).length;

            const ordersLastMonth = allOrders.filter((order: Order) => {
              const orderDate = new Date(order.created_at);
              return orderDate.getMonth() === lastMonth;
            }).length;

            set((state) => ({
              stats: {
                totalOrders,
                pendingOrders: pendingOrders.length,
                approvedOrders: approvedOrders.length,
                inProductionOrders: inProductionOrders.length,
                completedOrders: completedOrders.length,
                totalOrderValue,
                averageOrderValue,
                ordersThisMonth,
                ordersLastMonth,
              },
              loading: { ...state.loading, stats: false },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, stats: false },
              errors: {
                ...state.errors,
                stats: error instanceof Error ? error.message : "Unknown error",
              },
            }));
          }
        },

        // Real-time updates
        updateOrder: (order: Order) => {
          set((state) => ({
            orders: state.orders.map((o) => (o.id === order.id ? order : o)),
          }));
        },

        updateProductionPlan: (plan: ProductionPlan) => {
          set((state) => ({
            productionPlans: state.productionPlans.map((p) =>
              p.id === plan.id ? plan : p,
            ),
          }));
        },

        addOrder: (order: Order) => {
          set((state) => ({
            orders: [order, ...state.orders],
          }));
        },

        addProductionPlan: (plan: ProductionPlan) => {
          set((state) => ({
            productionPlans: [plan, ...state.productionPlans],
          }));
        },

        updateStats: (newStats: Partial<OrderStats>) => {
          set((state) => ({
            stats: { ...state.stats, ...newStats },
          }));
        },

        // Optimistic updates
        optimisticUpdateOrder: (id: string, updates: Partial<Order>) => {
          set((state) => ({
            orders: state.orders.map((o) =>
              o.id === id ? { ...o, ...updates } : o,
            ),
          }));
        },

        optimisticUpdateProductionPlan: (
          id: string,
          updates: Partial<ProductionPlan>,
        ) => {
          set((state) => ({
            productionPlans: state.productionPlans.map((p) =>
              p.id === id ? { ...p, ...updates } : p,
            ),
          }));
        },

        optimisticAddOrder: (order: Omit<Order, "id">) => {
          const tempOrder: Order = {
            ...order,
            id: `temp-${Date.now()}`, // Temporary ID
          };

          set((state) => ({
            orders: [tempOrder, ...state.orders],
          }));
        },

        optimisticAddProductionPlan: (plan: Omit<ProductionPlan, "id">) => {
          const tempPlan: ProductionPlan = {
            ...plan,
            id: `temp-${Date.now()}`, // Temporary ID
          };

          set((state) => ({
            productionPlans: [tempPlan, ...state.productionPlans],
          }));
        },

        // Business logic
        approveOrder: async (orderId: string) => {
          const { user } = useAuthStore.getState();

          // Optimistic update
          get().actions.optimisticUpdateOrder(orderId, { status: "uretimde" });

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const response = await fetch(`/api/orders/${orderId}/approve`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
              body: JSON.stringify({ notes: "" }),
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(
                errorData.error ||
                  errorData.message ||
                  "Failed to approve order",
              );
            }

            const result = await response.json();
            get().actions.updateOrder(result);

            // Refresh both orders and production plans (approval creates new production plans)
            await Promise.all([
              get().actions.fetchOrders(),
              get().actions.fetchProductionPlans(),
            ]);
          } catch (error: any) {
            // Revert optimistic update on error
            await get().actions.fetchOrders();
            throw error;
          }
        },

        startProduction: async (orderId: string, planId: string) => {
          const { user } = useAuthStore.getState();

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const response = await fetch(`/api/production/plans/${planId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
              body: JSON.stringify({
                status: "devam_ediyor",
                start_date: new Date().toISOString(),
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to start production");
            }

            const result = await response.json();
            get().actions.updateProductionPlan(result.data);
            get().actions.updateOrder({
              ...get().orders.find((o) => o.id === orderId)!,
              status: "uretimde",
            });
          } catch (error) {
            throw error;
          }
        },

        completeProduction: async (
          planId: string,
          producedQuantity: number,
        ) => {
          const { user } = useAuthStore.getState();

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const response = await fetch("/api/production/complete", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
              body: JSON.stringify({
                productionPlanId: planId,
                producedQuantity,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to complete production");
            }

            const result = await response.json();

            // Update production plan
            get().actions.updateProductionPlan({
              ...get().productionPlans.find((p) => p.id === planId)!,
              status: "tamamlandi",
              produced_quantity: producedQuantity,
            });

            // Update order status
            const plan = get().productionPlans.find((p) => p.id === planId);
            if (plan) {
              get().actions.updateOrder({
                ...get().orders.find((o) => o.id === plan.order_id)!,
                status: "tamamlandi",
              });
            }
          } catch (error) {
            throw error;
          }
        },

        cancelOrder: async (orderId: string, reason: string) => {
          const { user } = useAuthStore.getState();

          // Optimistic update
          get().actions.optimisticUpdateOrder(orderId, { status: "iptal" });

          try {
            if (!user?.id) {
              throw new Error("Kullanıcı kimlik doğrulaması gerekli");
            }
            const response = await fetch(`/api/orders/${orderId}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
                "x-user-id": user.id,
              },
              body: JSON.stringify({
                status: "iptal",
                notes: reason,
              }),
            });

            if (!response.ok) {
              throw new Error("Failed to cancel order");
            }

            const result = await response.json();
            get().actions.updateOrder(result.data);
          } catch (error) {
            // Revert optimistic update on error
            get().actions.fetchOrders();
            throw error;
          }
        },

        // Filters
        setOrdersFilter: (filters: OrderFilters) => {
          set((state) => ({
            filters: {
              ...state.filters,
              orders: { ...state.filters.orders, ...filters },
            },
          }));
        },

        setProductionPlansFilter: (filters: ProductionFilters) => {
          set((state) => ({
            filters: {
              ...state.filters,
              productionPlans: { ...state.filters.productionPlans, ...filters },
            },
          }));
        },

        // Reset
        reset: () => {
          set(initialState);
        },
      },
    }),
    {
      name: "order-store",
    },
  ),
);

// Selectors for easier access
export const useOrders = () => useOrderStore((state) => state.orders);
export const useProductionPlans = () =>
  useOrderStore((state) => state.productionPlans);
export const useOrderStats = () => useOrderStore((state) => state.stats);
export const useOrderLoading = () => useOrderStore((state) => state.loading);
export const useOrderErrors = () => useOrderStore((state) => state.errors);
export const useOrderActions = () => useOrderStore((state) => state.actions);
