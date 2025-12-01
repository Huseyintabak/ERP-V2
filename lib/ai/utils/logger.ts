/**
 * Agent Logger
 * Agent işlemlerini loglar (memory + opsiyonel database)
 */

interface LogEntry {
  agent?: string;
  action: string;
  level?: 'info' | 'warn' | 'error';
  conversation_id?: string;
  request_id?: string;
  orderId?: string;
  order_id?: string;
  planId?: string;
  plan_id?: string;
  materialId?: string;
  material_id?: string;
  finalDecision?: string;
  final_decision?: string;
  protocolResult?: any;
  [key: string]: any;
}

class AgentLogger {
  private logs: LogEntry[] = [];
  private maxMemoryLogs = 1000;
  
  async log(entry: LogEntry) {
    const logEntry = {
      ...entry,
      timestamp: new Date().toISOString(),
      level: entry.level || 'info'
    };
    
    // Memory'e ekle
    this.logs.push(logEntry);
    
    // Memory'de çok log birikirse temizle
    if (this.logs.length > this.maxMemoryLogs) {
      this.logs = this.logs.slice(-this.maxMemoryLogs);
    }
    
    // Console'a yazdır (development için)
    if (process.env.NODE_ENV === 'development') {
      const prefix = entry.agent ? `[${entry.agent}]` : '[AI]';
      console.log(`${prefix} ${entry.action}`, entry);
    }
    
    // Database'e kaydet (opsiyonel - AGENT_ENABLED veya AGENT_LOGGING_ENABLED kontrolü ile)
    const isTestEnv = process.env.NODE_ENV === 'test' || process.env.JEST_WORKER_ID !== undefined;
    
    if (process.env.AGENT_ENABLED === 'true' || process.env.AGENT_LOGGING_ENABLED === 'true') {
      try {
        // AI agent'lar server-side çalıştığı için service role client kullan (RLS bypass)
        // Test ortamında test client kullan, production'da admin client
        let supabase;
        if (isTestEnv) {
          const { createTestClient } = await import('@/lib/supabase/test-client');
          supabase = createTestClient(true); // Service role key kullan (RLS bypass)
        } else {
          const { createAdminClient } = await import('@/lib/supabase/server');
          supabase = createAdminClient(); // Service role key kullan (RLS bypass)
        }
        
        // Extract database fields from entry
        // agent kolonu NOT NULL olduğu için null olduğunda default değer kullan
        const dbEntry: any = {
          agent: entry.agent || 'system', // NOT NULL constraint için default değer
          action: entry.action,
          level: logEntry.level,
          data: entry, // Tüm entry'yi JSONB olarak kaydet
          conversation_id: entry.conversation_id || entry.conversationId || null,
          request_id: entry.request_id || entry.requestId || null,
          order_id: entry.order_id || entry.orderId || null,
          plan_id: entry.plan_id || entry.planId || null,
          material_id: entry.material_id || entry.materialId || null,
          final_decision: entry.final_decision || entry.finalDecision || null,
          created_at: new Date().toISOString()
        };
        
        // Null değerleri temizle (agent hariç - NOT NULL)
        Object.keys(dbEntry).forEach(key => {
          if (key !== 'agent' && (dbEntry[key] === null || dbEntry[key] === undefined)) {
            delete dbEntry[key];
          }
        });
        
        const { error } = await supabase.from('agent_logs').insert(dbEntry);
        
        if (error) {
          console.error('Failed to save agent log to database:', error);
          // Database hatası olsa bile memory log devam eder
        }
      } catch (error) {
        console.error('Failed to save agent log:', error);
        // Hata olsa bile memory log devam eder
      }
    }
  }
  
  async error(entry: LogEntry) {
    await this.log({ ...entry, level: 'error' });
  }
  
  async warn(entry: LogEntry) {
    await this.log({ ...entry, level: 'warn' });
  }
  
  getLogs(agent?: string, limit = 100): LogEntry[] {
    let filtered = this.logs;
    if (agent) {
      filtered = filtered.filter(l => l.agent === agent);
    }
    return filtered.slice(-limit);
  }
  
  clear(): void {
    this.logs = [];
  }
}

export const agentLogger = new AgentLogger();


