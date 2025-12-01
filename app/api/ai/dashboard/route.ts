/**
 * AI Agent Dashboard API
 * Agent performans metrikleri ve istatistikleri
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { agentLogger } from '@/lib/ai/utils/logger';
import { rateLimiter } from '@/lib/ai/utils/rate-limiter';
import { agentCache } from '@/lib/ai/utils/cache';
import { createClient } from '@/lib/supabase/server';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    // Authentication check
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only planlama and yonetici can view dashboard
    if (!['planlama', 'yonetici'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    let orchestrator: AgentOrchestrator;
    try {
      orchestrator = AgentOrchestrator.getInstance();
    } catch (error: any) {
      logger.error('Failed to initialize orchestrator:', error);
      return NextResponse.json(
        { 
          error: 'Failed to initialize AI system',
          details: error.message 
        },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // Get agent info
    let agents: any[] = [];
    try {
      const allAgents = orchestrator.getAllAgents();
      logger.log(`📊 Dashboard: ${allAgents.length} agent bulundu`);
      
      if (allAgents.length === 0) {
        logger.warn('⚠️ Dashboard: Hiç agent bulunamadı, orchestrator agent\'ları başlatıyor olabilir');
        // Agent'ları manuel başlatmayı dene (eğer public ise)
        try {
          orchestrator.initializeAgents();
          const retryAgents = orchestrator.getAllAgents();
          logger.log(`📊 Dashboard: Retry sonrası ${retryAgents.length} agent bulundu`);
        } catch (retryError: any) {
          logger.warn('⚠️ Agent\'ları manuel başlatma başarısız:', retryError.message);
        }
      }
      
      agents = orchestrator.getAllAgents().map(agent => {
        const info = agent.getInfo();
        const rateLimitStats = rateLimiter.getStats();
        return {
          name: info.name,
          role: info.role,
          responsibilities: info.responsibilities,
          defaultModel: info.defaultModel,
          rateLimit: {
            total: rateLimitStats.total,
            byAgent: rateLimitStats.byAgent[info.name.toLowerCase().replace(' agent', '')] || 
                     rateLimitStats.byAgent[info.name.toLowerCase()] || 0
          }
        };
      });
      
      logger.log(`✅ Dashboard: ${agents.length} agent bilgisi hazırlandı`);
    } catch (error: any) {
      logger.error('❌ Failed to get agents:', error);
      // Agent'lar yüklenemezse boş array döndür
      agents = [];
    }

    // Get conversation stats
    let conversations: any[] = [];
    try {
      conversations = orchestrator.getAllConversations();
      logger.log(`📊 Dashboard: ${conversations.length} konuşma bulundu`);
    } catch (error: any) {
      logger.error('❌ Failed to get conversations:', error);
      conversations = [];
    }
    
    const conversationStats = {
      total: conversations.length,
      pending: conversations.filter(c => c.status === 'pending').length,
      inProgress: conversations.filter(c => c.status === 'in_progress').length,
      completed: conversations.filter(c => c.status === 'completed').length,
      failed: conversations.filter(c => c.status === 'failed').length
    };
    
    logger.log(`📊 Dashboard: Conversation stats:`, conversationStats);

    // Get approval stats
    const { data: approvals, error: approvalError } = await supabase
      .from('human_approvals')
      .select('status');
    
    const approvalStats = {
      pending: 0,
      approved: 0,
      rejected: 0,
      expired: 0
    };
    
    if (approvals) {
      approvals.forEach(approval => {
        if (approval.status in approvalStats) {
          approvalStats[approval.status as keyof typeof approvalStats]++;
        }
      });
    }

    // Get cost stats
    const costStats = {
      dailyTotal: 0,
      totalTokens: 0,
      totalRequests: 0,
      byAgent: {} as Record<string, { cost: number; tokens: number; requests: number }>
    };
    
    try {
      const { data: costs, error: costError } = await supabase
        .from('agent_costs')
        .select('agent, cost_usd, tokens_used')
        .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());
      
      if (costError) {
        logger.warn('⚠️ Failed to get cost stats:', costError.message);
      } else if (costs) {
        costStats.totalRequests = costs.length;
        logger.log(`📊 Dashboard: ${costs.length} cost kaydı bulundu`);
        
        costs.forEach(cost => {
          costStats.dailyTotal += parseFloat(cost.cost_usd?.toString() || '0');
          costStats.totalTokens += cost.tokens_used || 0;
          
          if (!costStats.byAgent[cost.agent]) {
            costStats.byAgent[cost.agent] = { cost: 0, tokens: 0, requests: 0 };
          }
          costStats.byAgent[cost.agent].cost += parseFloat(cost.cost_usd?.toString() || '0');
          costStats.byAgent[cost.agent].tokens += cost.tokens_used || 0;
          costStats.byAgent[cost.agent].requests += 1;
        });
      }
    } catch (error: any) {
      logger.error('❌ Failed to get cost stats:', error);
    }

    // Get recent logs - hem memory'den hem database'den
    let recentLogs: any[] = [];
    try {
      // Önce memory'den log al
      const memoryLogs = agentLogger.getLogs(undefined, 50);
      logger.log(`📊 Dashboard: ${memoryLogs.length} memory log bulundu`);
      
      // Database'den de log çek (son 50 log)
      try {
        const { data: dbLogs, error: dbLogError } = await supabase
          .from('agent_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(50);
        
        if (dbLogError) {
          logger.warn('⚠️ Failed to get logs from database:', dbLogError.message);
        } else if (dbLogs && dbLogs.length > 0) {
          logger.log(`📊 Dashboard: ${dbLogs.length} database log bulundu`);
          
          // Database log'larını formatla
          const formattedDbLogs = dbLogs.map(log => ({
            agent: log.agent,
            action: log.action,
            level: log.level,
            timestamp: log.created_at,
            data: log.data,
            finalDecision: log.final_decision
          }));
          
          // Memory ve database log'larını birleştir (duplicate'leri temizle)
          const allLogs = [...memoryLogs, ...formattedDbLogs];
          const uniqueLogs = allLogs.filter((log, index, self) => 
            index === self.findIndex(l => 
              l.timestamp === log.timestamp && 
              l.agent === log.agent && 
              l.action === log.action
            )
          );
          
          // Tarihe göre sırala (en yeni önce)
          recentLogs = uniqueLogs.sort((a, b) => {
            const timeA = new Date(a.timestamp || 0).getTime();
            const timeB = new Date(b.timestamp || 0).getTime();
            return timeB - timeA;
          }).slice(0, 50);
          
          logger.log(`📊 Dashboard: Toplam ${recentLogs.length} unique log hazırlandı`);
        } else {
          // Database'de log yoksa sadece memory log'ları kullan
          recentLogs = memoryLogs;
        }
      } catch (dbError: any) {
        logger.warn('⚠️ Database log çekme hatası, sadece memory log kullanılıyor:', dbError.message);
        recentLogs = memoryLogs;
      }
    } catch (error: any) {
      logger.error('❌ Failed to get logs:', error);
      recentLogs = [];
    }

    // Cache stats
    let cacheStats: { size: number; keys: string[] } = { size: 0, keys: [] };
    try {
      cacheStats = agentCache.getStats();
      logger.log(`📊 Dashboard: Cache stats: ${cacheStats.size} items, ${cacheStats.keys.length} keys`);
    } catch (error: any) {
      logger.error('❌ Failed to get cache stats:', error);
    }

    // Rate limiting stats
    let rateLimitStats: any = { total: 0, byAgent: {} };
    try {
      rateLimitStats = rateLimiter.getStats();
      logger.log(`📊 Dashboard: Rate limit stats:`, rateLimitStats);
    } catch (error: any) {
      logger.error('❌ Failed to get rate limit stats:', error);
    }

    const response = {
      success: true,
      agents,
      stats: {
        conversations: conversationStats,
        approvals: approvalStats,
        costs: costStats,
        cache: {
          size: cacheStats.size,
          keys: cacheStats.keys.length
        },
        rateLimiting: rateLimitStats
      },
      recentLogs: recentLogs.slice(-20),
      timestamp: new Date().toISOString()
    };
    
    logger.log(`✅ Dashboard: Response hazırlandı, ${agents.length} agent, ${conversations.length} konuşma`);
    
    return NextResponse.json(response);
  } catch (error: any) {
    logger.error('AI dashboard API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

