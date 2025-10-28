import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { useAuthStore } from './auth-store';

// Types
export interface RawMaterial {
  id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  min_level: number;
  max_level: number;
  critical_level: number;
  unit_price: number;
  supplier: string;
  created_at: string;
  updated_at: string;
}

export interface SemiFinishedProduct {
  id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  min_level: number;
  max_level: number;
  critical_level: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface FinishedProduct {
  id: string;
  name: string;
  code: string;
  unit: string;
  quantity: number;
  min_level: number;
  max_level: number;
  critical_level: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  material_type: 'raw' | 'semi' | 'finished';
  material_id: string;
  movement_type: 'giris' | 'cikis';
  quantity: number;
  user_id: string;
  description: string;
  movement_source?: string;
  before_quantity?: number;
  after_quantity?: number;
  created_at: string;
  material_name?: string;
  material_code?: string;
  user_name?: string;
}

export interface StockStats {
  totalRawMaterials: number;
  totalSemiFinished: number;
  totalFinished: number;
  totalStockValue: number;
  criticalItems: number;
  lowStockItems: number;
}

export interface StockFilters {
  materialType?: 'raw' | 'semi' | 'finished';
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  page?: number;
  limit?: number;
}

// Store State
interface StockStore {
  // Data
  rawMaterials: RawMaterial[];
  semiFinishedProducts: SemiFinishedProduct[];
  finishedProducts: FinishedProduct[];
  stockMovements: StockMovement[];
  stats: StockStats;
  
  // Loading states
  loading: {
    rawMaterials: boolean;
    semiFinishedProducts: boolean;
    finishedProducts: boolean;
    stockMovements: boolean;
    stats: boolean;
  };
  
  // Error states
  errors: {
    rawMaterials: string | null;
    semiFinishedProducts: string | null;
    finishedProducts: string | null;
    stockMovements: string | null;
    stats: string | null;
  };
  
  // Pagination
  pagination: {
    rawMaterials: { page: number; total: number; limit: number };
    semiFinishedProducts: { page: number; total: number; limit: number };
    finishedProducts: { page: number; total: number; limit: number };
    stockMovements: { page: number; total: number; limit: number };
  };
  
  // Filters
  filters: {
    rawMaterials: StockFilters;
    semiFinishedProducts: StockFilters;
    finishedProducts: StockFilters;
    stockMovements: StockFilters;
  };
  
  // Actions
  actions: {
    // Fetch data
    fetchRawMaterials: (filters?: StockFilters) => Promise<void>;
    fetchSemiFinishedProducts: (filters?: StockFilters) => Promise<void>;
    fetchFinishedProducts: (filters?: StockFilters) => Promise<void>;
    fetchStockMovements: (filters?: StockFilters) => Promise<void>;
    fetchStats: () => Promise<void>;
    
    // Real-time updates
    updateRawMaterial: (material: RawMaterial) => void;
    updateSemiFinishedProduct: (product: SemiFinishedProduct) => void;
    updateFinishedProduct: (product: FinishedProduct) => void;
    addStockMovement: (movement: StockMovement) => void;
    updateStats: (newStats: Partial<StockStats>) => void;
    
    // Optimistic updates
    optimisticUpdateRawMaterial: (id: string, updates: Partial<RawMaterial>) => void;
    optimisticUpdateSemiFinishedProduct: (id: string, updates: Partial<SemiFinishedProduct>) => void;
    optimisticUpdateFinishedProduct: (id: string, updates: Partial<FinishedProduct>) => void;
    optimisticAddStockMovement: (movement: Omit<StockMovement, 'id'>) => void;
    
    // Filters
    setRawMaterialsFilter: (filters: StockFilters) => void;
    setSemiFinishedProductsFilter: (filters: StockFilters) => void;
    setFinishedProductsFilter: (filters: StockFilters) => void;
    setStockMovementsFilter: (filters: StockFilters) => void;
    
    // Reset
    reset: () => void;
  };
}

// Initial state
const initialState = {
  rawMaterials: [],
  semiFinishedProducts: [],
  finishedProducts: [],
  stockMovements: [],
  stats: {
    totalRawMaterials: 0,
    totalSemiFinished: 0,
    totalFinished: 0,
    totalStockValue: 0,
    criticalItems: 0,
    lowStockItems: 0,
  },
  loading: {
    rawMaterials: false,
    semiFinishedProducts: false,
    finishedProducts: false,
    stockMovements: false,
    stats: false,
  },
  errors: {
    rawMaterials: null,
    semiFinishedProducts: null,
    finishedProducts: null,
    stockMovements: null,
    stats: null,
  },
  pagination: {
    rawMaterials: { page: 1, total: 0, limit: 50 },
    semiFinishedProducts: { page: 1, total: 0, limit: 50 },
    finishedProducts: { page: 1, total: 0, limit: 50 },
    stockMovements: { page: 1, total: 0, limit: 50 },
  },
  filters: {
    rawMaterials: { page: 1, limit: 50, sortBy: 'code', sortOrder: 'asc' as const },
    semiFinishedProducts: { page: 1, limit: 50, sortBy: 'code', sortOrder: 'asc' as const },
    finishedProducts: { page: 1, limit: 50, sortBy: 'code', sortOrder: 'asc' as const },
    stockMovements: { page: 1, limit: 50, sortBy: 'created_at', sortOrder: 'desc' as const },
  },
};

// Helper function to build query params
const buildQueryParams = (filters: StockFilters): string => {
  const params = new URLSearchParams();
  
  if (filters.materialType) params.set('materialType', filters.materialType);
  if (filters.search) params.set('search', filters.search);
  if (filters.sortBy) params.set('sort', filters.sortBy);
  if (filters.sortOrder) params.set('order', filters.sortOrder);
  if (filters.page) params.set('page', filters.page.toString());
  if (filters.limit) params.set('limit', filters.limit.toString());
  
  return params.toString();
};

// Store implementation
export const useStockStore = create<StockStore>()(
  devtools(
    (set, get) => ({
      ...initialState,
      
      actions: {
        // Fetch Raw Materials
        fetchRawMaterials: async (filters?: StockFilters) => {
          const currentFilters = { ...get().filters.rawMaterials, ...filters };
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, rawMaterials: true },
            errors: { ...state.errors, rawMaterials: null },
            filters: { ...state.filters, rawMaterials: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error('Kullanıcı kimlik doğrulaması gerekli');
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/stock/raw?${params}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              }
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              rawMaterials: result.data || [],
              loading: { ...state.loading, rawMaterials: false },
              pagination: {
                ...state.pagination,
                rawMaterials: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, rawMaterials: false },
              errors: { ...state.errors, rawMaterials: error instanceof Error ? error.message : 'Unknown error' },
            }));
          }
        },
        
        // Fetch Semi Finished Products
        fetchSemiFinishedProducts: async (filters?: StockFilters) => {
          const currentFilters = filters || get().filters.semiFinishedProducts;
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, semiFinishedProducts: true },
            errors: { ...state.errors, semiFinishedProducts: null },
            filters: { ...state.filters, semiFinishedProducts: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error('Kullanıcı kimlik doğrulaması gerekli');
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/stock/semi?${params}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              }
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              semiFinishedProducts: result.data || [],
              loading: { ...state.loading, semiFinishedProducts: false },
              pagination: {
                ...state.pagination,
                semiFinishedProducts: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, semiFinishedProducts: false },
              errors: { ...state.errors, semiFinishedProducts: error instanceof Error ? error.message : 'Unknown error' },
            }));
          }
        },
        
        // Fetch Finished Products
        fetchFinishedProducts: async (filters?: StockFilters) => {
          const currentFilters = filters || get().filters.finishedProducts;
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, finishedProducts: true },
            errors: { ...state.errors, finishedProducts: null },
            filters: { ...state.filters, finishedProducts: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error('Kullanıcı kimlik doğrulaması gerekli');
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/stock/finished?${params}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              }
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              finishedProducts: result.data || [],
              loading: { ...state.loading, finishedProducts: false },
              pagination: {
                ...state.pagination,
                finishedProducts: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, finishedProducts: false },
              errors: { ...state.errors, finishedProducts: error instanceof Error ? error.message : 'Unknown error' },
            }));
          }
        },
        
        // Fetch Stock Movements
        fetchStockMovements: async (filters?: StockFilters) => {
          const currentFilters = filters || get().filters.stockMovements;
          const { user } = useAuthStore.getState();

          set((state) => ({
            loading: { ...state.loading, stockMovements: true },
            errors: { ...state.errors, stockMovements: null },
            filters: { ...state.filters, stockMovements: currentFilters },
          }));

          try {
            if (!user?.id) {
              throw new Error('Kullanıcı kimlik doğrulaması gerekli');
            }
            const params = buildQueryParams(currentFilters);
            const response = await fetch(`/api/stock/movements?${params}`, {
              headers: {
                'Content-Type': 'application/json',
                'x-user-id': user.id
              }
            });

            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }

            const result = await response.json();

            set((state) => ({
              stockMovements: result.data || [],
              loading: { ...state.loading, stockMovements: false },
              pagination: {
                ...state.pagination,
                stockMovements: {
                  page: result.pagination?.page || 1,
                  total: result.pagination?.total || 0,
                  limit: result.pagination?.limit || 50,
                },
              },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, stockMovements: false },
              errors: { ...state.errors, stockMovements: error instanceof Error ? error.message : 'Unknown error' },
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
              throw new Error('Kullanıcı kimlik doğrulaması gerekli');
            }
            // Fetch all stock counts in parallel
            const [rawResponse, semiResponse, finishedResponse] = await Promise.all([
              fetch('/api/stock/raw?limit=1', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': user.id
                }
              }),
              fetch('/api/stock/semi?limit=1', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': user.id
                }
              }),
              fetch('/api/stock/finished?limit=1', {
                headers: {
                  'Content-Type': 'application/json',
                  'x-user-id': user.id
                }
              }),
            ]);

            const [rawResult, semiResult, finishedResult] = await Promise.all([
              rawResponse.json(),
              semiResponse.json(),
              finishedResponse.json(),
            ]);

            // Calculate stats
            const rawTotal = rawResult.pagination?.total || 0;
            const semiTotal = semiResult.pagination?.total || 0;
            const finishedTotal = finishedResult.pagination?.total || 0;

            // Calculate total stock value (simplified - using unit prices)
            const totalStockValue = 0; // This would need to be calculated from actual data

            // Count critical and low stock items
            const criticalItems = 0; // This would need to be calculated from actual data
            const lowStockItems = 0; // This would need to be calculated from actual data

            set((state) => ({
              stats: {
                totalRawMaterials: rawTotal,
                totalSemiFinished: semiTotal,
                totalFinished: finishedTotal,
                totalStockValue,
                criticalItems,
                lowStockItems,
              },
              loading: { ...state.loading, stats: false },
            }));
          } catch (error) {
            set((state) => ({
              loading: { ...state.loading, stats: false },
              errors: { ...state.errors, stats: error instanceof Error ? error.message : 'Unknown error' },
            }));
          }
        },
        
        // Real-time updates
        updateRawMaterial: (material: RawMaterial) => {
          set((state) => ({
            rawMaterials: state.rawMaterials.map((m) =>
              m.id === material.id ? material : m
            ),
          }));
        },
        
        updateSemiFinishedProduct: (product: SemiFinishedProduct) => {
          set((state) => ({
            semiFinishedProducts: state.semiFinishedProducts.map((p) =>
              p.id === product.id ? product : p
            ),
          }));
        },
        
        updateFinishedProduct: (product: FinishedProduct) => {
          set((state) => ({
            finishedProducts: state.finishedProducts.map((p) =>
              p.id === product.id ? product : p
            ),
          }));
        },
        
        addStockMovement: (movement: StockMovement) => {
          set((state) => ({
            stockMovements: [movement, ...state.stockMovements],
          }));
        },
        
        updateStats: (newStats: Partial<StockStats>) => {
          set((state) => ({
            stats: { ...state.stats, ...newStats },
          }));
        },
        
        // Optimistic updates
        optimisticUpdateRawMaterial: (id: string, updates: Partial<RawMaterial>) => {
          set((state) => ({
            rawMaterials: state.rawMaterials.map((m) =>
              m.id === id ? { ...m, ...updates } : m
            ),
          }));
        },
        
        optimisticUpdateSemiFinishedProduct: (id: string, updates: Partial<SemiFinishedProduct>) => {
          set((state) => ({
            semiFinishedProducts: state.semiFinishedProducts.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          }));
        },
        
        optimisticUpdateFinishedProduct: (id: string, updates: Partial<FinishedProduct>) => {
          set((state) => ({
            finishedProducts: state.finishedProducts.map((p) =>
              p.id === id ? { ...p, ...updates } : p
            ),
          }));
        },
        
        optimisticAddStockMovement: (movement: Omit<StockMovement, 'id'>) => {
          const tempMovement: StockMovement = {
            ...movement,
            id: `temp-${Date.now()}`, // Temporary ID
          };
          
          set((state) => ({
            stockMovements: [tempMovement, ...state.stockMovements],
          }));
        },
        
        // Filters
        setRawMaterialsFilter: (filters: StockFilters) => {
          set((state) => ({
            filters: { ...state.filters, rawMaterials: { ...state.filters.rawMaterials, ...filters } },
          }));
        },
        
        setSemiFinishedProductsFilter: (filters: StockFilters) => {
          set((state) => ({
            filters: { ...state.filters, semiFinishedProducts: { ...state.filters.semiFinishedProducts, ...filters } },
          }));
        },
        
        setFinishedProductsFilter: (filters: StockFilters) => {
          set((state) => ({
            filters: { ...state.filters, finishedProducts: { ...state.filters.finishedProducts, ...filters } },
          }));
        },
        
        setStockMovementsFilter: (filters: StockFilters) => {
          set((state) => ({
            filters: { ...state.filters, stockMovements: { ...state.filters.stockMovements, ...filters } },
          }));
        },
        
        // Reset
        reset: () => {
          set(initialState);
        },
      },
    }),
    {
      name: 'stock-store',
    }
  )
);

// Selectors for easier access
export const useRawMaterials = () => useStockStore((state) => state.rawMaterials);
export const useSemiFinishedProducts = () => useStockStore((state) => state.semiFinishedProducts);
export const useFinishedProducts = () => useStockStore((state) => state.finishedProducts);
export const useStockMovements = () => useStockStore((state) => state.stockMovements);
export const useStockStats = () => useStockStore((state) => state.stats);
export const useStockLoading = () => useStockStore((state) => state.loading);
export const useStockErrors = () => useStockStore((state) => state.errors);
export const useStockActions = () => useStockStore((state) => state.actions);
