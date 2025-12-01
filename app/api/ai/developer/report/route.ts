/**
 * Developer Agent Report API
 * Developer Agent'tan sistem analizi ve iyileştirme raporu al
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { logger } from '@/lib/utils/logger';

export async function POST(request: NextRequest) {
  try {
    const token = request.cookies.get('thunder_token')?.value;
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Only yonetici and planlama can request developer reports
    if (!['yonetici', 'planlama'].includes(payload.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const body = await request.json();
    const { 
      action = 'generate_improvement_report',
      focusArea = 'all', // 'performance' | 'security' | 'feature' | 'code_quality' | 'technical_debt' | 'all'
      scope = {} // Analysis scope
    } = body;

    const orchestrator = AgentOrchestrator.getInstance();
    
    const conversationId = `dev_report_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    logger.log(`🤖 Developer Agent rapor isteği: ${action} - ${focusArea}`);

    const result = await orchestrator.startConversation('developer', {
      id: conversationId,
      prompt: `Sistem analizi yap ve iyileştirme raporu oluştur. Focus area: ${focusArea}`,
      type: 'analysis',
      context: {
        action,
        focusArea,
        scope,
        requestedBy: payload.userId,
        requestedByRole: payload.role
      },
      urgency: 'medium',
      severity: 'medium'
    });

    // Extract report data from agent response
    const agentResponse = result.conversation.responses[0];
    const responseData = agentResponse?.data || {};
    
    // Findings can be in data.findings or directly in data
    const findings = responseData.findings || 
                     (Array.isArray(responseData) ? responseData : []) ||
                     [];
    
    // Summary can be in data.summary or directly in data
    let summary = responseData.summary;
    
    // If summary doesn't exist or is incomplete, calculate it from findings
    if (!summary || !summary.totalIssues) {
      const totalIssues = findings.length;
      const critical = findings.filter((f: any) => f.severity === 'critical').length;
      const high = findings.filter((f: any) => f.severity === 'high').length;
      const medium = findings.filter((f: any) => f.severity === 'medium').length;
      const low = findings.filter((f: any) => f.severity === 'low').length;
      
      // Calculate estimated total effort (handle formats like "4-8 hours", "6 hours", "3-6 hours")
      let totalHours = 0;
      findings.forEach((f: any) => {
        const effort = f.estimatedEffort || '0 hours';
        const effortStr = effort.toString();
        // Try to extract hours from formats like "4-8 hours", "6 hours", "3-6 hours"
        const match = effortStr.match(/(\d+)\s*-\s*(\d+)\s*hours?/i) || effortStr.match(/(\d+)\s*hours?/i);
        if (match) {
          if (match[2]) {
            // Range format: take average (e.g., "4-8 hours" -> 6 hours)
            totalHours += (parseInt(match[1]) + parseInt(match[2])) / 2;
          } else {
            // Single number format
            totalHours += parseInt(match[1]);
          }
        }
      });
      
      summary = {
        totalIssues,
        critical,
        high,
        medium,
        low,
        estimatedTotalEffort: totalHours > 0 ? `${Math.round(totalHours)}-${Math.round(totalHours * 1.2)} hours` : '0 hours'
      };
    }
    
    // Recommendations can be in recommendations array or in data.recommendations
    const recommendations = agentResponse?.recommendations || 
                           responseData.recommendations || 
                           [];
    
    logger.log(`✅ Developer Agent report hazırlandı: ${findings.length} finding, ${recommendations.length} recommendation`);

    return NextResponse.json({
      success: true,
      report: {
        id: conversationId,
        finalDecision: result.finalDecision || agentResponse?.decision || 'approved',
        findings: findings,
        summary: summary,
        recommendations: recommendations,
        reasoning: agentResponse?.reasoning || responseData.reasoning || '',
        confidence: agentResponse?.confidence || responseData.confidence || 0,
        protocolResult: result.protocolResult,
        generatedAt: new Date().toISOString()
      },
      conversation: {
        id: result.conversation.id,
        status: result.conversation.status,
        startedAt: result.conversation.startedAt instanceof Date 
          ? result.conversation.startedAt.toISOString() 
          : result.conversation.startedAt,
        completedAt: result.conversation.completedAt 
          ? (result.conversation.completedAt instanceof Date 
            ? result.conversation.completedAt.toISOString() 
            : result.conversation.completedAt)
          : undefined
      }
    });
  } catch (error: any) {
    logger.error('Developer Agent report API error:', error);
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

