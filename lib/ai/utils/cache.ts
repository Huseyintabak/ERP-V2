/**
 * In-Memory Cache
 * Localhost için optimize edilmiş cache sistemi
 */

interface CacheItem {
  value: any;
  expiry: number;
  ttl: number; // Original TTL in ms
  createdAt: number;
  accessCount: number;
  lastAccessed: number;
}

class InMemoryCache {
  private cache: Map<string, CacheItem> = new Map();
  private defaultTTL = 3600 * 1000; // 1 saat (ms)
  private hitCount = 0;
  private missCount = 0;
  
  get(key: string): any | null {
    const item = this.cache.get(key);
    if (!item) {
      this.missCount++;
      return null;
    }
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key);
      this.missCount++;
      return null;
    }
    
    // Update access stats
    item.accessCount++;
    item.lastAccessed = Date.now();
    this.hitCount++;
    
    return item.value;
  }
  
  set(key: string, value: any, ttl = this.defaultTTL): void {
    const now = Date.now();
    this.cache.set(key, {
      value,
      expiry: now + ttl,
      ttl,
      createdAt: now,
      accessCount: 0,
      lastAccessed: now
    });
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
    this.hitCount = 0;
    this.missCount = 0;
  }
  
  // Expired items'ı temizle (periodic cleanup)
  cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.cache.entries());
    for (const [key, item] of entries) {
      if (now > item.expiry) {
        this.cache.delete(key);
      }
    }
  }
  
  // Cache istatistikleri
  getStats(): { 
    size: number; 
    keys: string[];
    hitRate: number;
    totalHits: number;
    totalMisses: number;
    avgTTL: number;
    items: Array<{ key: string; ttl: number; age: number; accessCount: number }>;
  } {
    const items = Array.from(this.cache.entries()).map(([key, item]) => ({
      key,
      ttl: item.ttl,
      age: Date.now() - item.createdAt,
      accessCount: item.accessCount
    }));
    
    const totalRequests = this.hitCount + this.missCount;
    const hitRate = totalRequests > 0 ? (this.hitCount / totalRequests) * 100 : 0;
    
    const avgTTL = items.length > 0
      ? items.reduce((sum, item) => sum + item.ttl, 0) / items.length
      : this.defaultTTL;
    
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      hitRate: Math.round(hitRate * 100) / 100,
      totalHits: this.hitCount,
      totalMisses: this.missCount,
      avgTTL: Math.round(avgTTL / 1000 / 60), // Convert to minutes
      items: items.slice(0, 20) // First 20 items for analysis
    };
  }
}

export const agentCache = new InMemoryCache();

// Her 5 dakikada bir cleanup (sadece Node.js environment'ında)
if (typeof setInterval !== 'undefined') {
  setInterval(() => agentCache.cleanup(), 5 * 60 * 1000);
}

