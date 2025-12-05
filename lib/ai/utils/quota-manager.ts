/**
 * OpenAI Quota Manager
 * Quota durumunu cache'ler ve gereksiz API çağrılarını önler
 */

import { getCircuitBreakerManager } from './circuit-breaker';
import { CircuitState } from './circuit-breaker';

interface QuotaStatus {
  isQuotaExceeded: boolean;
  lastCheck: Date;
  expiryTime: Date;
  reason?: string;
  statusCode?: number;
}

class QuotaManager {
  private quotaCache: Map<string, QuotaStatus> = new Map();
  private readonly DEFAULT_CACHE_DURATION = 60 * 60 * 1000; // 1 saat
  private readonly QUOTA_CACHE_KEY = 'openai_quota_status';

  /**
   * Quota durumunu kontrol et (cache'den)
   */
  isQuotaExceeded(): boolean {
    const cached = this.quotaCache.get(this.QUOTA_CACHE_KEY);
    
    if (!cached) {
      return false; // Cache yok, henüz quota aşılmamış varsay
    }

    // Cache süresi dolmuş mu kontrol et
    if (new Date() > cached.expiryTime) {
      this.quotaCache.delete(this.QUOTA_CACHE_KEY);
      return false; // Cache süresi doldu, tekrar deneyebiliriz
    }

    return cached.isQuotaExceeded;
  }

  /**
   * Quota aşıldığını kaydet ve cache'le
   */
  markQuotaExceeded(reason?: string, statusCode?: number, cacheDuration?: number): void {
    const duration = cacheDuration || this.DEFAULT_CACHE_DURATION;
    const expiryTime = new Date(Date.now() + duration);

    const status: QuotaStatus = {
      isQuotaExceeded: true,
      lastCheck: new Date(),
      expiryTime,
      reason: reason || 'OpenAI API quota exceeded',
      statusCode: statusCode || 429
    };

    this.quotaCache.set(this.QUOTA_CACHE_KEY, status);

    // Circuit breaker'ı da otomatik aç (quota için özel breaker)
    const circuitBreakerManager = getCircuitBreakerManager();
    const quotaBreaker = circuitBreakerManager.getBreaker('openai_quota', {
      failureThreshold: 1, // Tek quota hatası yeterli
      timeout: duration, // Cache süresi kadar bekle
      monitoringPeriod: duration
    });
    quotaBreaker.open();

    console.warn(`[QuotaManager] Quota exceeded marked. Will retry after ${new Date(expiryTime).toISOString()}`);
  }

  /**
   * Quota durumunu temizle (manuel reset için)
   */
  resetQuotaStatus(): void {
    this.quotaCache.delete(this.QUOTA_CACHE_KEY);
    
    // Circuit breaker'ı da sıfırla
    const circuitBreakerManager = getCircuitBreakerManager();
    const quotaBreaker = circuitBreakerManager.getBreaker('openai_quota');
    quotaBreaker.reset();

    console.info('[QuotaManager] Quota status reset');
  }

  /**
   * Quota durumunu güncelle (başarılı istek sonrası)
   */
  markQuotaAvailable(): void {
    // Başarılı istek yapıldıysa, quota tekrar kullanılabilir
    // Ama cache'i hemen silme, çünkü geçici bir başarı olabilir
    // Sadece circuit breaker'ı kapat
    const circuitBreakerManager = getCircuitBreakerManager();
    const quotaBreaker = circuitBreakerManager.getBreaker('openai_quota');
    
    // Eğer circuit açıksa, yarım açık moda geç (test için)
    if (quotaBreaker.getState() === CircuitState.OPEN) {
      quotaBreaker.reset();
    }
  }

  /**
   * Quota cache durumunu al
   */
  getQuotaStatus(): QuotaStatus | null {
    return this.quotaCache.get(this.QUOTA_CACHE_KEY) || null;
  }

  /**
   * Cache süresini kontrol et ve gerekiyorsa temizle
   */
  cleanupExpiredCache(): void {
    const cached = this.quotaCache.get(this.QUOTA_CACHE_KEY);
    if (cached && new Date() > cached.expiryTime) {
      this.quotaCache.delete(this.QUOTA_CACHE_KEY);
      console.info('[QuotaManager] Expired quota cache cleared');
    }
  }
}

// Singleton instance
let quotaManagerInstance: QuotaManager | null = null;

/**
 * Get the global quota manager instance
 */
export function getQuotaManager(): QuotaManager {
  if (!quotaManagerInstance) {
    quotaManagerInstance = new QuotaManager();
  }
  return quotaManagerInstance;
}

/**
 * Environment variable kontrolü: AI validation aktif mi?
 */
export function isAIValidationEnabled(): boolean {
  const enabled = process.env.AGENT_ENABLED !== 'false';
  const apiKey = process.env.OPENAI_API_KEY;
  
  // API key yoksa AI validation kapalı
  if (!apiKey) {
    return false;
  }
  
  return enabled;
}

