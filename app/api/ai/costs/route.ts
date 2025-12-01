/**
 * AI Costs API
 * AI maliyetlerini görüntüleme (sadece admin)
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { createClient } from '@/lib/supabase/server';
import { costTracker } from '@/lib/ai/utils/cost-tracker';
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

    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'day'; // day, week, month
    const agent = searchParams.get('agent');

    // Get cost stats from cost tracker
    const stats = costTracker.getStats();

    // Get database costs
    let query = supabase
      .from('agent_costs')
      .select('*')
      .order('created_at', { ascending: false });

    if (agent) {
      query = query.eq('agent', agent);
    }

    // Period filter
    const now = new Date();
    let startDate: Date;
    
    switch (period) {
      case 'day':
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
        break;
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    }

    query = query.gte('created_at', startDate.toISOString());

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
          dailyUsage: stats.dailyTotal,
          weeklyUsage: stats.weeklyTotal
        },
        byAgent: {},
        byModel: {},
        dailySummary: [],
        recentCosts: [],
        error: error.message
      });
    }
    
    logger.log(`📊 Costs API: ${costs?.length || 0} cost kaydı bulundu (period: ${period})`);
    
    // Debug: Agent isimlerini logla
    if (costs && costs.length > 0) {
      const agentNames = [...new Set(costs.map(c => c.agent))];
      logger.log(`📊 Agent isimleri: ${agentNames.join(', ')}`);
      const developerCosts = costs.filter(c => c.agent && (c.agent.includes('Developer') || c.agent.includes('developer')));
      logger.log(`📊 Developer Agent maliyetleri: ${developerCosts.length} kayıt`);
      if (developerCosts.length > 0) {
        logger.log(`📊 Developer Agent örnek kayıt:`, JSON.stringify(developerCosts[0], null, 2));
      }
    }

    // Calculate totals
    const totalCost = costs?.reduce((sum, cost) => sum + parseFloat(cost.cost_usd.toString()), 0) || 0;
    const totalTokens = costs?.reduce((sum, cost) => sum + cost.tokens_used, 0) || 0;
    const totalRequests = costs?.length || 0;

    // Group by agent
    const byAgent: Record<string, { cost: number; tokens: number; requests: number }> = {};
    costs?.forEach(cost => {
      if (!byAgent[cost.agent]) {
        byAgent[cost.agent] = { cost: 0, tokens: 0, requests: 0 };
      }
      byAgent[cost.agent].cost += parseFloat(cost.cost_usd.toString());
      byAgent[cost.agent].tokens += cost.tokens_used;
      byAgent[cost.agent].requests += 1;
    });
    
    // Debug: byAgent sonuçlarını logla
    logger.log(`📊 byAgent sonuçları:`, JSON.stringify(Object.keys(byAgent), null, 2));

    // Group by model
    const byModel: Record<string, { cost: number; tokens: number; requests: number }> = {};
    costs?.forEach(cost => {
      if (!byModel[cost.model]) {
        byModel[cost.model] = { cost: 0, tokens: 0, requests: 0 };
      }
      byModel[cost.model].cost += parseFloat(cost.cost_usd.toString());
      byModel[cost.model].tokens += cost.tokens_used;
      byModel[cost.model].requests += 1;
    });

    // Daily summary
    let dailySummaryData: any[] = [];
    try {
      const { data: dailySummary, error: dailySummaryError } = await supabase
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
        dailyUsage: stats.dailyTotal,
        weeklyUsage: stats.weeklyTotal
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

