/**
 * AI Agent Test Endpoint
 * Agent'ların çalışıp çalışmadığını test eder
 */

import { NextRequest, NextResponse } from 'next/server';
import { AgentOrchestrator } from '@/lib/ai/orchestrator';
import { logger } from '@/lib/utils/logger';

export async function GET(request: NextRequest) {
  try {
    const envCheck = {
      AGENT_ENABLED: process.env.AGENT_ENABLED,
      OPENAI_API_KEY: process.env.OPENAI_API_KEY ? 'SET' : 'NOT SET',
      NODE_ENV: process.env.NODE_ENV,
    };

    logger.log('🔍 Environment check:', envCheck);

    if (process.env.AGENT_ENABLED !== 'true') {
      return NextResponse.json({
        success: false,
        message: 'AI Agents are disabled',
        envCheck,
        reason: `AGENT_ENABLED=${process.env.AGENT_ENABLED} (expected: 'true')`
      });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        success: false,
        message: 'OpenAI API Key is not set',
        envCheck
      });
    }

    // Test orchestrator initialization
    try {
      const orchestrator = AgentOrchestrator.getInstance();
      logger.log('✅ Orchestrator initialized successfully');

      // Test a simple conversation
      const testResult = await orchestrator.startConversation('planning', {
        id: `test_${Date.now()}`,
        prompt: 'Test: Bu bir test mesajıdır',
        type: 'query',
        context: { test: true },
        urgency: 'low',
        severity: 'low'
      });

      return NextResponse.json({
        success: true,
        message: 'AI Agents are working!',
        envCheck,
        testResult: {
          finalDecision: testResult.finalDecision,
          hasProtocolResult: !!testResult.protocolResult,
          conversationId: testResult.conversation.id
        }
      });
    } catch (error: any) {
      logger.error('❌ Orchestrator test failed:', error);
      return NextResponse.json({
        success: false,
        message: 'Orchestrator test failed',
        envCheck,
        error: error.message,
        stack: error.stack
      }, { status: 500 });
    }
  } catch (error: any) {
    logger.error('❌ Test endpoint error:', error);
    return NextResponse.json({
      success: false,
      message: 'Test endpoint error',
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}


