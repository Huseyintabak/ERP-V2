/**
 * Manager Agent Stats API
 * Manager Agent için risk analizi, bütçe etkisi ve stratejik uyumluluk istatistikleri
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

    // Only yonetici can view manager stats
    if (payload.role !== 'yonetici') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const adminSupabase = createAdminClient();

    // Get agent logs for Manager Agent
    const { data: managerLogs, error: logsError } = await adminSupabase
      .from('agent_logs')
      .select('*')
      .eq('agent', 'Manager Agent')
      .order('created_at', { ascending: false })
      .limit(100);

    if (logsError) {
      logger.error('Error fetching manager logs:', logsError);
    }

    // Parse risk analyses from logs
    const riskAnalyses = (managerLogs || [])
      .filter((log) => log.data?.totalRiskScore !== undefined)
      .map((log) => ({
        totalRiskScore: log.data.totalRiskScore || 0,
        financialRisk: log.data.financialRisk || 0,
        operationalRisk: log.data.operationalRisk || 0,
        strategicRisk: log.data.strategicRisk || 0,
        riskLevel:
          log.data.totalRiskScore < 40
            ? 'low'
            : log.data.totalRiskScore < 70
            ? 'medium'
            : log.data.totalRiskScore < 90
            ? 'high'
            : 'critical',
        recommendations: log.data.recommendations || [],
      }));

    // Parse budget impacts
    const budgetImpacts = (managerLogs || [])
      .filter((log) => log.data?.budgetImpact !== undefined)
      .map((log) => ({
        impact: log.data.budgetImpact || 'neutral',
        amount: log.data.amount || 0,
        percentage: log.data.percentage || 0,
        projectedSavings: log.data.projectedSavings,
        projectedCosts: log.data.projectedCosts,
      }));

    // Parse strategic alignments
    const strategicAlignments = (managerLogs || [])
      .filter((log) => log.data?.strategicAlignment !== undefined)
      .map((log) => ({
        aligned: log.data.strategicAlignment || false,
        score: log.data.strategicAlignmentScore || 0,
        factors: {
          longTermGoals: log.data.factors?.longTermGoals || false,
          customerSatisfaction: log.data.factors?.customerSatisfaction || false,
          businessContinuity: log.data.factors?.businessContinuity || false,
          competitiveAdvantage: log.data.factors?.competitiveAdvantage || false,
        },
      }));

    // Recent decisions
    const recentDecisions = (managerLogs || [])
      .filter((log) => log.final_decision)
      .slice(0, 20)
      .map((log) => ({
        id: log.id,
        operation: log.data?.operation || log.action || 'Unknown',
        decision: log.final_decision as 'approve' | 'reject' | 'conditional',
        riskScore: log.data?.totalRiskScore || 0,
        budgetImpact: log.data?.budgetImpact || 'neutral',
        strategicAlignment: log.data?.strategicAlignment || false,
        timestamp: log.created_at,
      }));

    // Calculate summary
    const totalDecisions = recentDecisions.length;
    const approved = recentDecisions.filter((d) => d.decision === 'approve').length;
    const rejected = recentDecisions.filter((d) => d.decision === 'reject').length;
    const conditional = recentDecisions.filter((d) => d.decision === 'conditional').length;
    const averageRiskScore =
      riskAnalyses.length > 0
        ? riskAnalyses.reduce((sum, r) => sum + r.totalRiskScore, 0) / riskAnalyses.length
        : 0;
    const totalBudgetImpact = budgetImpacts.reduce((sum, b) => sum + b.amount, 0);
    const strategicAlignmentRate =
      strategicAlignments.length > 0
        ? strategicAlignments.filter((s) => s.aligned).length / strategicAlignments.length
        : 0;

    return NextResponse.json({
      success: true,
      riskAnalyses: riskAnalyses.slice(0, 50), // Son 50 risk analizi
      budgetImpacts: budgetImpacts.slice(0, 50), // Son 50 bütçe etkisi
      strategicAlignments: strategicAlignments.slice(0, 50), // Son 50 stratejik uyumluluk
      recentDecisions,
      summary: {
        totalDecisions,
        approved,
        rejected,
        conditional,
        averageRiskScore,
        totalBudgetImpact,
        strategicAlignmentRate,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    logger.error('Error fetching manager stats:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || 'Unknown error',
      },
      { status: 500 }
    );
  }
}

