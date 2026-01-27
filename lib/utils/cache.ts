/**
 * In-Memory Cache Utility
 * API response caching için basit in-memory cache implementasyonu
 */

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

class SimpleCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private maxSize: number;
  private defaultTTL: number; // milliseconds

  constructor(maxSize: number = 1000, defaultTTL: number = 5 * 60 * 1000) {
    // Default: 1000 entries, 5 minutes TTL
    this.maxSize = maxSize;
    this.defaultTTL = defaultTTL;
  }

  /**
   * Get value from cache
   */
  get<T>(key: string): T | null {
    const entry = this.cache.get(key);

    if (!entry) {
      return null;
    }

    // Check if expired
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Set value in cache
   */
  set<T>(key: string, value: T, ttl?: number): void {
    // If cache is full, remove oldest entry
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) {
        this.cache.delete(firstKey);
      }
    }

    const now = Date.now();
    const expiresAt = now + (ttl || this.defaultTTL);

    this.cache.set(key, {
      data: value,
      timestamp: now,
      expiresAt,
    });
  }

  /**
   * Delete value from cache
   */
  delete(key: string): void {
    this.cache.delete(key);
  }

  /**
   * Clear all cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Clear expired entries
   */
  cleanup(): number {
    const now = Date.now();
    let cleaned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key);
        cleaned++;
      }
    }

    return cleaned;
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    hitRate?: number;
    totalHits?: number;
    totalMisses?: number;
  } {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
    };
  }

  /**
   * Check if key exists and is not expired
   */
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) {
      return false;
    }

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Get all keys
   */
  keys(): string[] {
    return Array.from(this.cache.keys());
  }
}

// Global cache instance
export const apiCache = new SimpleCache(1000, 5 * 60 * 1000); // 1000 entries, 5 minutes TTL

// Cache key generators
export const cacheKeys = {
  orders: (filters?: { status?: string; page?: number; limit?: number }) => {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `orders:${filterStr}`;
  },
  order: (id: string) => `order:${id}`,
  productionPlans: (filters?: { orderId?: string; status?: string }) => {
    const filterStr = filters ? JSON.stringify(filters) : 'all';
    return `production_plans:${filterStr}`;
  },
  productionPlan: (id: string) => `production_plan:${id}`,
  stock: (materialType: string, materialId: string) => `stock:${materialType}:${materialId}`,
  bom: (productId: string) => `bom:${productId}`,
  customer: (id: string) => `customer:${id}`,
  product: (id: string) => `product:${id}`,
};

// Cache helper functions
export async function getCachedOrFetch<T>(
  key: string,
  fetchFn: () => Promise<T>,
  ttl?: number
): Promise<T> {
  // Try to get from cache
  const cached = apiCache.get<T>(key);
  if (cached !== null) {
    return cached;
  }

  // Fetch and cache
  const data = await fetchFn();
  apiCache.set(key, data, ttl);
  return data;
}

// Auto cleanup expired entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    apiCache.cleanup();
  }, 5 * 60 * 1000); // 5 minutes
}

