/**
 * Simple Rate Limiter
 * Localhost için in-memory rate limiting
 */

class SimpleRateLimiter {
  private requests: Map<string, number[]> = new Map();
  private maxRequests: number;
  private windowMs: number;
  
  constructor(maxRequests = 100, windowMs = 60 * 1000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }
  
  checkLimit(agent: string): { allowed: boolean; remaining: number } {
    const now = Date.now();
    const key = agent.toLowerCase();
    
    if (!this.requests.has(key)) {
      this.requests.set(key, []);
    }
    
    const agentRequests = this.requests.get(key)!;
    
    // Eski request'leri temizle (window dışındakiler)
    const validRequests = agentRequests.filter(time => now - time < this.windowMs);
    this.requests.set(key, validRequests);
    
    if (validRequests.length >= this.maxRequests) {
      return { allowed: false, remaining: 0 };
    }
    
    // Yeni request ekle
    validRequests.push(now);
    this.requests.set(key, validRequests);
    
    return { 
      allowed: true, 
      remaining: this.maxRequests - validRequests.length 
    };
  }
  
  reset(agent?: string): void {
    if (agent) {
      this.requests.delete(agent.toLowerCase());
    } else {
      this.requests.clear();
    }
  }
  
  getStats(agent?: string): { total: number; byAgent: Record<string, number> } {
    const now = Date.now();
    const byAgent: Record<string, number> = {};
    let total = 0;
    
    const entries = Array.from(this.requests.entries());
    for (const [key, times] of entries) {
      const valid = times.filter(time => now - time < this.windowMs).length;
      byAgent[key] = valid;
      total += valid;
      
      if (agent && key === agent.toLowerCase()) {
        return { total: valid, byAgent: { [key]: valid } };
      }
    }
    
    return { total, byAgent };
  }
}

export const rateLimiter = new SimpleRateLimiter(
  parseInt(process.env.GPT_RATE_LIMIT_PER_AGENT || '100'),
  60 * 1000 // 1 dakika
);

