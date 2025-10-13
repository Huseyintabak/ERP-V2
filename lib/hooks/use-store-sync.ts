import { useEffect, useRef, useState } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import { useDashboardStats } from '@/stores/dashboard-stats-store';
import { useStockActions } from '@/stores/stock-store';
import { useOrderActions } from '@/stores/order-store';

interface StoreSyncStatus {
  isSyncing: boolean;
  lastSyncTime: number | null;
  syncErrors: string[];
  storesStatus: {
    auth: boolean;
    dashboard: boolean;
    stock: boolean;
    orders: boolean;
    production: boolean;
  };
}

interface StoreSyncOptions {
  autoSync: boolean;
  syncInterval: number; // milliseconds
  retryAttempts: number;
  retryDelay: number; // milliseconds
}

export const useStoreSync = (options: StoreSyncOptions = {
  autoSync: true,
  syncInterval: 30000, // 30 seconds
  retryAttempts: 3,
  retryDelay: 1000,
}) => {
  const [syncStatus, setSyncStatus] = useState<StoreSyncStatus>({
    isSyncing: false,
    lastSyncTime: null,
    syncErrors: [],
    storesStatus: {
      auth: false,
      dashboard: false,
      stock: false,
      orders: false,
      production: false,
    },
  });

  const { user } = useAuthStore();
  const dashboardActions = useDashboardStats().actions;
  const stockActions = useStockActions();
  const orderActions = useOrderActions();

  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef<number>(0);

  // Sync individual store
  const syncStore = async (storeName: string, syncAction: () => Promise<any>) => {
    try {
      await syncAction();
      
      setSyncStatus(prev => ({
        ...prev,
        storesStatus: {
          ...prev.storesStatus,
          [storeName]: true,
        },
        syncErrors: prev.syncErrors.filter(error => !error.includes(storeName)),
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Store Sync] ${storeName} synced successfully`);
      }

      return true;
    } catch (error: any) {
      const errorMessage = `${storeName} sync failed: ${error.message}`;
      
      setSyncStatus(prev => ({
        ...prev,
        storesStatus: {
          ...prev.storesStatus,
          [storeName]: false,
        },
        syncErrors: [...prev.syncErrors.filter(err => !err.includes(storeName)), errorMessage],
      }));

      console.error(`[Store Sync Error] ${errorMessage}`, error);
      return false;
    }
  };

  // Sync all stores
  const syncAllStores = async () => {
    if (!user) {
      if (process.env.NODE_ENV === 'development') {
        console.log('[Store Sync] Skipping sync - no authenticated user');
      }
      return;
    }

    setSyncStatus(prev => ({
      ...prev,
      isSyncing: true,
      syncErrors: [],
    }));

    if (process.env.NODE_ENV === 'development') {
      console.log('[Store Sync] Starting full store sync...');
    }

    const syncPromises = [
      syncStore('auth', async () => {
        // Auth store doesn't need syncing as it's managed by login/logout
        return Promise.resolve();
      }),
      syncStore('dashboard', async () => {
        await dashboardActions.fetchStats(user.role);
      }),
      syncStore('stock', async () => {
        await Promise.all([
          stockActions.fetchRawMaterials(),
          stockActions.fetchSemiFinished(),
          stockActions.fetchFinishedProducts(),
        ]);
      }),
      syncStore('orders', async () => {
        await Promise.all([
          orderActions.fetchOrders(),
          orderActions.fetchProductionPlans(),
        ]);
      }),
      syncStore('production', async () => {
        // Production store is simple, no API calls needed
        return Promise.resolve();
      }),
    ];

    try {
      const results = await Promise.allSettled(syncPromises);
      const successCount = results.filter(result => result.status === 'fulfilled').length;
      
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        lastSyncTime: Date.now(),
      }));

      if (process.env.NODE_ENV === 'development') {
        console.log(`[Store Sync] Completed: ${successCount}/${syncPromises.length} stores synced successfully`);
      }

      // Reset retry count on successful sync
      retryCountRef.current = 0;

    } catch (error) {
      setSyncStatus(prev => ({
        ...prev,
        isSyncing: false,
        syncErrors: [...prev.syncErrors, `Full sync failed: ${error}`],
      }));

      // Retry logic
      if (retryCountRef.current < options.retryAttempts) {
        retryCountRef.current += 1;
        
        if (process.env.NODE_ENV === 'development') {
          console.log(`[Store Sync] Retrying in ${options.retryDelay}ms (attempt ${retryCountRef.current}/${options.retryAttempts})`);
        }

        setTimeout(() => {
          syncAllStores();
        }, options.retryDelay);
      } else {
        console.error('[Store Sync] Max retry attempts reached. Manual sync required.');
      }
    }
  };

  // Auto-sync setup
  useEffect(() => {
    if (!options.autoSync || !user) return;

    // Initial sync
    syncAllStores();

    // Set up interval sync
    syncTimeoutRef.current = setInterval(() => {
      syncAllStores();
    }, options.syncInterval);

    return () => {
      if (syncTimeoutRef.current) {
        clearInterval(syncTimeoutRef.current);
      }
    };
  }, [user, options.autoSync, options.syncInterval]);

  // Manual sync function
  const manualSync = async () => {
    await syncAllStores();
  };

  // Clear sync errors
  const clearSyncErrors = () => {
    setSyncStatus(prev => ({
      ...prev,
      syncErrors: [],
    }));
  };

  // Check if any store is in error state
  const hasSyncErrors = syncStatus.syncErrors.length > 0;
  
  // Check if all stores are synced
  const allStoresSynced = Object.values(syncStatus.storesStatus).every(status => status);

  // Get sync health score
  const getSyncHealthScore = () => {
    const totalStores = Object.keys(syncStatus.storesStatus).length;
    const syncedStores = Object.values(syncStatus.storesStatus).filter(status => status).length;
    const errorPenalty = syncStatus.syncErrors.length * 10;
    
    return Math.max(0, ((syncedStores / totalStores) * 100) - errorPenalty);
  };

  return {
    syncStatus,
    manualSync,
    clearSyncErrors,
    hasSyncErrors,
    allStoresSynced,
    getSyncHealthScore,
  };
};

// Store conflict detection and resolution
export const useStoreConflictDetector = () => {
  const [conflicts, setConflicts] = useState<Array<{
    store: string;
    field: string;
    localValue: any;
    serverValue: any;
    timestamp: number;
  }>>([]);

  // Detect conflicts when data changes
  const detectConflict = (store: string, field: string, localValue: any, serverValue: any) => {
    if (JSON.stringify(localValue) !== JSON.stringify(serverValue)) {
      const conflict = {
        store,
        field,
        localValue,
        serverValue,
        timestamp: Date.now(),
      };

      setConflicts(prev => [
        ...prev.filter(c => !(c.store === store && c.field === field)),
        conflict,
      ]);

      if (process.env.NODE_ENV === 'development') {
        console.warn(`[Store Conflict] ${store}.${field}:`, {
          local: localValue,
          server: serverValue,
        });
      }

      return conflict;
    }

    return null;
  };

  // Resolve conflict by choosing server value
  const resolveConflict = (store: string, field: string, useServerValue: boolean = true) => {
    setConflicts(prev => prev.filter(c => !(c.store === store && c.field === field)));
    
    if (process.env.NODE_ENV === 'development') {
      console.log(`[Store Conflict Resolved] ${store}.${field} - using ${useServerValue ? 'server' : 'local'} value`);
    }
  };

  // Clear all conflicts
  const clearAllConflicts = () => {
    setConflicts([]);
  };

  return {
    conflicts,
    detectConflict,
    resolveConflict,
    clearAllConflicts,
  };
};
