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
import { createAdminClient } from '@/lib/supabase/server';
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

    // Admin client kullan (RLS bypass için) - Yetki kontrolü zaten yapıldı
    const adminSupabase = createAdminClient();

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

      // Per-agent rate limit kapasitesi (env'den veya varsayılan 100/dk)
      const perAgentLimit = parseInt(process.env.GPT_RATE_LIMIT_PER_AGENT || '100');
      
      agents = orchestrator.getAllAgents().map(agent => {
        const info = agent.getInfo();
        const rateLimitStats = rateLimiter.getStats();
        return {
          name: info.name,
          role: info.role,
          responsibilities: info.responsibilities,
          defaultModel: info.defaultModel,
          rateLimit: {
            // total: konfigüre edilen limit (dakika başına)
            total: perAgentLimit,
            // byAgent: son 60 sn'de bu agent için kullanılan istek sayısı
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

    // Get conversation stats - hem in-memory hem database'den
    let conversations: any[] = [];
    
    // 1. In-memory conversations'dan al (mevcut session)
    try {
      const inMemoryConversations = orchestrator.getAllConversations();
      logger.log(`📊 Dashboard: ${inMemoryConversations.length} in-memory konuşma bulundu`);
      conversations = inMemoryConversations;
    } catch (error: any) {
      logger.error('❌ Failed to get in-memory conversations:', error);
    }

    // 2. Database'den conversation'ları al (agent_logs'tan conversation_started action'larından)
    try {
      // conversation_started action'larından conversation'ları bul
      const { data: conversationLogs, error: logError } = await adminSupabase
        .from('agent_logs')
        .select('*')
        .eq('action', 'conversation_started')
        .order('created_at', { ascending: false })
        .limit(100);

      if (logError) {
        logger.warn('⚠️ Failed to get conversations from database:', logError.message);
      } else if (conversationLogs && conversationLogs.length > 0) {
        logger.log(`📊 Dashboard: ${conversationLogs.length} database conversation bulundu`);
        
        // Her conversation için status'ü belirle
        const dbConversations = await Promise.all(
          conversationLogs.map(async (log: any) => {
            const conversationId = log.conversation_id || 
                                 log.data?.conversationId || 
                                 log.data?.conversation_id || 
                                 log.data?.id || 
                                 `conv_${log.id}`;
            
            // Bu conversation'ın tamamlanma durumunu kontrol et
            const { data: completedLogs } = await adminSupabase
              .from('agent_logs')
              .select('*')
              .eq('conversation_id', conversationId)
              .in('action', ['conversation_completed', 'conversation_failed'])
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            // Agent response'ları var mı kontrol et
            const { data: responseLogs } = await adminSupabase
              .from('agent_logs')
              .select('id')
              .eq('conversation_id', conversationId)
              .in('action', ['agent_response', 'production_log_validation', 'order_validation', 'gpt_call'])
              .limit(1);

            let status: string;
            if (completedLogs) {
              status = completedLogs.action === 'conversation_completed' ? 'completed' : 'failed';
            } else if (!responseLogs || responseLogs.length === 0) {
              // Henüz hiç agent response'u yoksa pending
              status = 'pending';
            } else {
              // Agent response'ları var ama tamamlanmamışsa in_progress
              status = 'in_progress';
            }

            return {
              id: conversationId,
              status: status,
              startedAt: log.created_at,
              completedAt: completedLogs?.created_at || undefined
            };
          })
        );

        // In-memory ve database conversations'ları birleştir (duplicate'leri kaldır)
        const conversationMap = new Map<string, any>();
        
        // Önce in-memory conversations'ları ekle (daha güncel)
        conversations.forEach(conv => {
          conversationMap.set(conv.id, conv);
        });
        
        // Sonra database conversations'ları ekle (sadece yeni olanlar)
        dbConversations.forEach(conv => {
          if (!conversationMap.has(conv.id)) {
            conversationMap.set(conv.id, conv);
          }
        });
        
        conversations = Array.from(conversationMap.values());
        logger.log(`📊 Dashboard: Toplam ${conversations.length} conversation (merged)`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to get conversations from database:', error);
    }
    
    const conversationStats = {
      total: conversations.length,
      pending: conversations.filter(c => c.status === 'pending').length,
      inProgress: conversations.filter(c => c.status === 'in_progress').length,
      completed: conversations.filter(c => c.status === 'completed').length,
      failed: conversations.filter(c => c.status === 'failed').length
    };
    
    logger.log(`📊 Dashboard: Conversation stats:`, conversationStats);

    // Get approval stats - Admin client kullan
    const { data: approvals, error: approvalError } = await adminSupabase
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

    // Get cost stats - Bugünün başlangıcından itibaren (UTC timezone aware)
    const costStats = {
      dailyTotal: 0,
      totalTokens: 0,
      totalRequests: 0,
      byAgent: {} as Record<string, { cost: number; tokens: number; requests: number }>
    };
    
    try {
      // Bugünün başlangıcı (UTC): YYYY-MM-DD 00:00:00+00
      const now = new Date();
      const todayStartUTC = new Date(Date.UTC(
        now.getUTCFullYear(),
        now.getUTCMonth(),
        now.getUTCDate(),
        0, 0, 0, 0
      )).toISOString();
      
      logger.log(`📅 Dashboard cost stats: todayStart=${todayStartUTC}`);
      
      const { data: costs, error: costError } = await adminSupabase
        .from('agent_costs')
        .select('agent, cost_usd, tokens_used')
        .gte('created_at', todayStartUTC)
        .order('created_at', { ascending: false });
      
      if (costError) {
        logger.error('❌ Failed to get cost stats:', costError);
      } else if (costs && costs.length > 0) {
        costStats.totalRequests = costs.length;
        logger.log(`📊 Dashboard: ${costs.length} cost kaydı bulundu (bugünden itibaren)`);
        
        costs.forEach(cost => {
          if (!cost.agent) {
            logger.warn('⚠️ Cost kaydında agent yok:', cost);
            return;
          }
          
          costStats.dailyTotal += parseFloat(cost.cost_usd?.toString() || '0');
          costStats.totalTokens += cost.tokens_used || 0;
          
          if (!costStats.byAgent[cost.agent]) {
            costStats.byAgent[cost.agent] = { cost: 0, tokens: 0, requests: 0 };
          }
          costStats.byAgent[cost.agent].cost += parseFloat(cost.cost_usd?.toString() || '0');
          costStats.byAgent[cost.agent].tokens += cost.tokens_used || 0;
          costStats.byAgent[cost.agent].requests += 1;
        });
        
        logger.log(`💰 Dashboard cost stats: dailyTotal=$${costStats.dailyTotal.toFixed(6)}, agents=${Object.keys(costStats.byAgent).length}`);
      } else {
        logger.log(`📊 Dashboard: Bugünden itibaren hiç cost kaydı bulunamadı`);
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
      
      // Database'den de log çek (son 50 log) - Admin client kullan
      try {
        const { data: dbLogs, error: dbLogError } = await adminSupabase
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

    // Cache stats - hem in-memory hem database'den
    let cacheStats: { size: number; keys: string[]; hitRate: number; totalHits: number; totalMisses: number } = { 
      size: 0, 
      keys: [],
      hitRate: 0,
      totalHits: 0,
      totalMisses: 0
    };
    
    try {
      // In-memory cache stats
      const fullStats = agentCache.getStats();
      cacheStats = {
        size: fullStats.size,
        keys: fullStats.keys,
        hitRate: fullStats.hitRate,
        totalHits: fullStats.totalHits,
        totalMisses: fullStats.totalMisses
      };
      
      // Database'den cache istatistiklerini de al (gpt_call_cached action'larından)
      // Son 24 saatteki cache performansını göster
      try {
        const last24Hours = new Date();
        last24Hours.setHours(last24Hours.getHours() - 24);
        
        const { data: cachedCalls, error: cacheError } = await adminSupabase
          .from('agent_logs')
          .select('id')
          .eq('action', 'gpt_call_cached')
          .gte('created_at', last24Hours.toISOString());
        
        const { data: totalCalls, error: totalError } = await adminSupabase
          .from('agent_logs')
          .select('id')
          .in('action', ['gpt_call', 'gpt_call_cached'])
          .gte('created_at', last24Hours.toISOString());
        
        if (!cacheError && !totalError && cachedCalls && totalCalls) {
          const dbCacheHits = cachedCalls.length;
          const dbTotalCalls = totalCalls.length;
          const dbCacheMisses = dbTotalCalls - dbCacheHits;
          const dbHitRate = dbTotalCalls > 0 ? (dbCacheHits / dbTotalCalls) * 100 : 0;
          
          // Eğer in-memory cache boşsa (server restart sonrası), database stats'ı kullan
          if (cacheStats.size === 0 && cacheStats.totalHits === 0 && cacheStats.totalMisses === 0) {
            cacheStats.hitRate = Math.round(dbHitRate * 100) / 100;
            cacheStats.totalHits = dbCacheHits;
            cacheStats.totalMisses = dbCacheMisses;
            logger.log(`📊 Dashboard: Cache stats (from DB - last 24h, in-memory empty): ${dbCacheHits} hits, ${dbCacheMisses} misses, ${dbHitRate.toFixed(2)}% hit rate`);
          } else {
            // In-memory cache varsa, onu kullan ama database stats'ı da logla
            logger.log(`📊 Dashboard: Cache stats (in-memory): ${cacheStats.size} items, ${cacheStats.hitRate.toFixed(2)}% hit rate (${cacheStats.totalHits} hits, ${cacheStats.totalMisses} misses)`);
            logger.log(`📊 Dashboard: Cache stats (from DB - last 24h): ${dbCacheHits} hits, ${dbCacheMisses} misses, ${dbHitRate.toFixed(2)}% hit rate`);
          }
        }
      } catch (dbError: any) {
        logger.warn('⚠️ Failed to get cache stats from database:', dbError.message);
      }
      
      logger.log(`📊 Dashboard: Final cache stats: ${cacheStats.size} items, ${cacheStats.hitRate.toFixed(2)}% hit rate (${cacheStats.totalHits} hits, ${cacheStats.totalMisses} misses)`);
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
          keys: cacheStats.keys.length,
          hitRate: cacheStats.hitRate,
          totalHits: cacheStats.totalHits,
          totalMisses: cacheStats.totalMisses
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

