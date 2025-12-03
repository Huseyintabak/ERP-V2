/**
 * AI Costs API
 * AI maliyetlerini görüntüleme (sadece admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
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

    // Only yonetici can view costs
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Admin client kullan (RLS bypass için) - Yönetici kontrolü zaten yapıldı
    const adminSupabase = createAdminClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month'; // Default month - daha fazla veri göster
    const agent = searchParams.get('agent');

    // Get database costs - Admin client kullan (RLS bypass)
    let query = adminSupabase
      .from('agent_costs')
      .select('*')
      .order('created_at', { ascending: false });

    if (agent) {
      query = query.eq('agent', agent);
    }

    // Period filter - UTC kullan (database UTC kullanıyor)
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        // Son 24 saat
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        // Son 7 gün
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        // Son 30 gün
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // Default month
    }
    
    // UTC olarak ISO string'e çevir
    const startDateISO = startDate.toISOString();
    logger.log(`📅 Period filter: period=${period}, startDate=${startDateISO}, now=${now.toISOString()}`);

    query = query.gte('created_at', startDateISO);

    const { data: costs, error } = await query.limit(1000);

    if (error) {
      logger.error('❌ Error fetching costs:', error);
      // Hata olsa bile boş data döndür (fallback)
      return NextResponse.json({
        success: true,
        period,
        summary: {
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          dailyLimit: parseFloat(process.env.AGENT_DAILY_COST_LIMIT || '50'),
          weeklyLimit: parseFloat(process.env.AGENT_WEEKLY_COST_LIMIT || '300'),
          dailyUsage: 0, // Hata durumunda 0
          weeklyUsage: 0 // Hata durumunda 0
        },
        byAgent: {},
        byModel: {},
        dailySummary: [],
        recentCosts: [],
        error: error.message
      });
    }
    
    logger.log(`📊 Costs API: ${costs?.length || 0} cost kaydı bulundu (period: ${period})`);
    logger.log(`📊 Period filter: startDate=${startDate.toISOString()}, now=${now.toISOString()}`);
    
    // Debug: Agent isimlerini logla
    if (costs && costs.length > 0) {
      const agentNames = [...new Set(costs.map(c => c.agent))];
      logger.log(`📊 Agent isimleri (${agentNames.length} unique):`, agentNames.join(', '));
      logger.log(`📊 İlk kayıt örneği:`, JSON.stringify(costs[0], null, 2));
    } else {
      logger.warn(`⚠️ Costs API: Hiç kayıt bulunamadı. Period: ${period}, startDate: ${startDate.toISOString()}`);
      // Period filter çok kısıtlayıcı olabilir, tüm kayıtları kontrol et (admin client ile)
      const { data: allCosts } = await adminSupabase
        .from('agent_costs')
        .select('id, agent, model, created_at')
        .order('created_at', { ascending: false })
        .limit(5);
      logger.log(`📊 Son 5 kayıt (filter olmadan):`, allCosts?.map(c => ({
        id: c.id,
        agent: c.agent,
        model: c.model,
        created_at: c.created_at
      })));
    }

    // Calculate totals
    const totalCost = costs?.reduce((sum, cost) => sum + parseFloat(cost.cost_usd?.toString() || '0'), 0) || 0;
    const totalTokens = costs?.reduce((sum, cost) => sum + (cost.tokens_used || 0), 0) || 0;
    const totalRequests = costs?.length || 0;

    // Calculate daily and weekly usage from database (UTC timezone aware)
    // Bugünün başlangıcı (UTC): YYYY-MM-DD 00:00:00+00
    // Note: `now` değişkeni yukarıda zaten tanımlı (period filter için)
    const todayStartUTC = new Date(Date.UTC(
      now.getUTCFullYear(),
      now.getUTCMonth(),
      now.getUTCDate(),
      0, 0, 0, 0
    )).toISOString();
    
    // Son 7 gün (UTC)
    const weekAgoUTC = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
    
    logger.log(`📅 Daily/Weekly calculation: todayStart=${todayStartUTC}, weekAgo=${weekAgoUTC}`);
    
    // Daily usage (bugün başlangıcından itibaren - UTC)
    const { data: dailyCosts, error: dailyError } = await adminSupabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', todayStartUTC);
    
    const dailyUsage = dailyCosts?.reduce((sum, cost) => sum + parseFloat(cost.cost_usd?.toString() || '0'), 0) || 0;
    
    if (dailyError) {
      logger.error('❌ Daily usage calculation error:', dailyError);
    } else {
      logger.log(`💰 Daily usage calculated: ${dailyCosts?.length || 0} records, total: $${dailyUsage.toFixed(6)}`);
    }
    
    // Weekly usage (son 7 gün - UTC)
    const { data: weeklyCosts, error: weeklyError } = await adminSupabase
      .from('agent_costs')
      .select('cost_usd')
      .gte('created_at', weekAgoUTC);
    
    const weeklyUsage = weeklyCosts?.reduce((sum, cost) => sum + parseFloat(cost.cost_usd?.toString() || '0'), 0) || 0;
    
    if (weeklyError) {
      logger.error('❌ Weekly usage calculation error:', weeklyError);
    } else {
      logger.log(`💰 Weekly usage calculated: ${weeklyCosts?.length || 0} records, total: $${weeklyUsage.toFixed(6)}`);
    }

    // Group by agent
    const byAgent: Record<string, { cost: number; tokens: number; requests: number }> = {};
    costs?.forEach(cost => {
      if (!cost.agent) {
        logger.warn('⚠️ Cost kaydında agent yok:', cost.id);
        return;
      }
      if (!byAgent[cost.agent]) {
        byAgent[cost.agent] = { cost: 0, tokens: 0, requests: 0 };
      }
      byAgent[cost.agent].cost += parseFloat(cost.cost_usd?.toString() || '0');
      byAgent[cost.agent].tokens += cost.tokens_used || 0;
      byAgent[cost.agent].requests += 1;
    });
    
    // Debug: byAgent sonuçlarını logla
    logger.log(`📊 byAgent sonuçları (${Object.keys(byAgent).length} agent):`, JSON.stringify(Object.keys(byAgent), null, 2));
    logger.log(`📊 byAgent detayları:`, JSON.stringify(byAgent, null, 2));

    // Group by model
    const byModel: Record<string, { cost: number; tokens: number; requests: number }> = {};
    costs?.forEach(cost => {
      if (!cost.model) {
        logger.warn('⚠️ Cost kaydında model yok:', cost.id);
        return;
      }
      if (!byModel[cost.model]) {
        byModel[cost.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      byModel[cost.model].cost += parseFloat(cost.cost_usd?.toString() || '0');
      byModel[cost.model].tokens += cost.tokens_used || 0;
      byModel[cost.model].requests += 1;
    });
    
    // Debug: byModel sonuçlarını logla
    logger.log(`📊 byModel sonuçları (${Object.keys(byModel).length} model):`, JSON.stringify(Object.keys(byModel), null, 2));
    logger.log(`📊 byModel detayları:`, JSON.stringify(byModel, null, 2));

    // Daily summary - Admin client kullan
    let dailySummaryData: any[] = [];
    try {
      const { data: dailySummary, error: dailySummaryError } = await adminSupabase
        .from('agent_cost_summary')
        .select('*')
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });
      
      if (dailySummaryError) {
        logger.warn('⚠️ Failed to get daily summary:', dailySummaryError.message);
      } else {
        dailySummaryData = dailySummary || [];
        logger.log(`📊 Costs API: ${dailySummaryData.length} daily summary kaydı bulundu`);
      }
    } catch (error: any) {
      logger.error('❌ Failed to get daily summary:', error);
    }

    return NextResponse.json({
      success: true,
      period,
        summary: {
          totalCost: parseFloat(totalCost.toFixed(6)),
          totalTokens,
          totalRequests,
          dailyLimit: parseFloat(process.env.AGENT_DAILY_COST_LIMIT || '50'),
          weeklyLimit: parseFloat(process.env.AGENT_WEEKLY_COST_LIMIT || '300'),
          dailyUsage: parseFloat(dailyUsage.toFixed(6)),
          weeklyUsage: parseFloat(weeklyUsage.toFixed(6))
        },
      byAgent,
      byModel,
      dailySummary: dailySummaryData,
      recentCosts: costs?.slice(0, 50) || []
    });
    
    logger.log(`✅ Costs API: Response hazırlandı - Total: $${totalCost.toFixed(4)}, Requests: ${totalRequests}`);
  } catch (error: any) {
    logger.error('AI costs API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

