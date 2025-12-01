/**
 * Cost Tracker
 * OpenAI API maliyetlerini takip eder
 * Localhost için basit versiyon (database entegrasyonu sonra eklenecek)
 */

interface CostEntry {
  agent: string;
  model: string;
  tokens: number;
  cost: number;
  requestId?: string;
  timestamp: Date;
}

class CostTracker {
  private dailyLimit: number;
  private weeklyLimit: number;
  private costs: CostEntry[] = [];
  private maxMemoryEntries = 10000;
  
  constructor() {
    this.dailyLimit = parseFloat(process.env.AGENT_DAILY_COST_LIMIT || '50');
    this.weeklyLimit = parseFloat(process.env.AGENT_WEEKLY_COST_LIMIT || '300');
  }
  
  async trackUsage(entry: CostEntry): Promise<{ allowed: boolean; reason?: string }> {
    // Memory'e ekle
    this.costs.push(entry);
    
    // Memory'de çok entry birikirse temizle
    if (this.costs.length > this.maxMemoryEntries) {
      this.costs = this.costs.slice(-this.maxMemoryEntries);
    }
    
    // Database'e kaydet (her zaman - AGENT_ENABLED kontrolü ile)
    if (process.env.AGENT_ENABLED === 'true' || process.env.AGENT_COST_TRACKING_ENABLED === 'true') {
      try {
        // AI agent'lar server-side çalıştığı için service role client kullan (RLS bypass)
        // Test ortamında test client kullan, production'da admin client
        const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
        let supabase;
        
        if (isTestEnv) {
          const { createTestClient } = await import('@/lib/supabase/test-client');
          supabase = createTestClient(true); // Service role key kullan (RLS bypass)
        } else {
          const { createAdminClient } = await import('@/lib/supabase/server');
          supabase = createAdminClient(); // Service role key kullan (RLS bypass)
        }
        
        const costEntry = {
          agent: entry.agent,
          model: entry.model,
          tokens_used: entry.tokens,
          cost_usd: entry.cost,
          request_id: entry.requestId || null,
          created_at: entry.timestamp.toISOString()
        };
        
        const { error: insertError, data: insertedData } = await supabase
          .from('agent_costs')
          .insert(costEntry)
          .select();
        
        if (insertError) {
          console.error('❌ Failed to save cost entry to database:', insertError);
          console.error('❌ Cost entry data:', JSON.stringify(costEntry, null, 2));
          // Database hatası olsa bile memory tracking devam eder
        } else {
          console.log(`✅ Cost saved: ${entry.agent} - $${entry.cost.toFixed(6)} (${entry.tokens} tokens, model: ${entry.model})`);
          if (insertedData && insertedData.length > 0) {
            console.log(`✅ Cost entry ID: ${insertedData[0].id}`);
          }
        }
      } catch (error: any) {
        console.error('Failed to save cost entry:', error.message);
        // Hata olsa bile memory tracking devam eder
      }
    }
    
    // Günlük limit kontrolü
    const dailyTotal = this.getDailyTotal();
    if (dailyTotal >= this.dailyLimit) {
      await this.sendAlert('daily', dailyTotal);
      return { 
        allowed: false, 
        reason: `Daily limit exceeded: $${dailyTotal.toFixed(2)} / $${this.dailyLimit.toFixed(2)}` 
      };
    }
    
    // Haftalık limit kontrolü
    const weeklyTotal = this.getWeeklyTotal();
    if (weeklyTotal >= this.weeklyLimit) {
      await this.sendAlert('weekly', weeklyTotal);
      return { 
        allowed: false, 
        reason: `Weekly limit exceeded: $${weeklyTotal.toFixed(2)} / $${this.weeklyLimit.toFixed(2)}` 
      };
    }
    
    return { allowed: true };
  }
  
  private getDailyTotal(): number {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return this.costs
      .filter(entry => entry.timestamp >= today)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }
  
  private getWeeklyTotal(): number {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    return this.costs
      .filter(entry => entry.timestamp >= weekAgo)
      .reduce((sum, entry) => sum + entry.cost, 0);
  }
  
  private async sendAlert(type: 'daily' | 'weekly', total: number): Promise<void> {
    // Console'a yazdır
    console.error(`🚨 Cost Limit Exceeded: ${type} limit reached: $${total.toFixed(2)}`);
    
    // Database notification (opsiyonel)
    if (process.env.AGENT_COST_ALERT_ENABLED === 'true') {
      try {
        const { createClient } = await import('@/lib/supabase/server');
        const supabase = await createClient();
        
        // Admin'lere notification gönder
        const { data: admins } = await supabase
          .from('users')
          .select('id')
          .eq('role', 'yonetici');
        
        if (admins && admins.length > 0) {
          const notifications = admins.map(admin => ({
            type: 'cost_limit_exceeded',
            title: `💰 AI Maliyet Limiti Aşıldı`,
            message: `${type === 'daily' ? 'Günlük' : 'Haftalık'} limit aşıldı: $${total.toFixed(2)}`,
            severity: 'critical',
            user_id: admin.id,
            data: { 
              type, 
              total, 
              limit: type === 'daily' ? this.dailyLimit : this.weeklyLimit 
            }
          }));
          
          await supabase.from('notifications').insert(notifications);
        }
      } catch (error) {
        console.error('Failed to send cost alert:', error);
      }
    }
  }
  
  calculateCost(model: string, tokens: number): number {
    const prices: Record<string, { input: number; output: number }> = {
      'gpt-4o': { input: 0.005, output: 0.015 }, // per 1K tokens
      'gpt-4o-mini': { input: 0.00015, output: 0.0006 },
      'gpt-4-turbo': { input: 0.01, output: 0.03 }
    };
    
    const price = prices[model] || prices['gpt-4o'];
    
    // Basit hesaplama: %80 input, %20 output varsayımı
    const inputTokens = tokens * 0.8;
    const outputTokens = tokens * 0.2;
    
    return (inputTokens / 1000) * price.input + (outputTokens / 1000) * price.output;
  }
  
  getStats(): {
    dailyTotal: number;
    weeklyTotal: number;
    dailyLimit: number;
    weeklyLimit: number;
    totalEntries: number;
  } {
    return {
      dailyTotal: this.getDailyTotal(),
      weeklyTotal: this.getWeeklyTotal(),
      dailyLimit: this.dailyLimit,
      weeklyLimit: this.weeklyLimit,
      totalEntries: this.costs.length
    };
  }
}

export const costTracker = new CostTracker();

