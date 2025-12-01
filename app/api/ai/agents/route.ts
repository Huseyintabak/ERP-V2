/**
 * AI Agents API
 * Agent listesi ve bilgileri
 */

import { NextRequest, NextResponse } from 'next/server';
import { verifyJWT } from '@/lib/auth/jwt';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';

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

    // All authenticated users can view agents
    const orchestrator = AgentOrchestrator.getInstance();
    const agents = orchestrator.getAllAgents().map(agent => {
      const info = agent.getInfo();
      return {
        name: info.name,
        role: info.role,
        responsibilities: info.responsibilities,
        defaultModel: info.defaultModel
      };
    });

    return NextResponse.json({
      success: true,
      agents,
      count: agents.length
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }
}

