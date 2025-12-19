import { NextRequest, NextResponse } from 'next/server';
import { getN8nWorkflowGenerator } from '@/lib/ai/n8n-workflow-generator';
import { getN8nApiClient } from '@/lib/ai/n8n-api-client';
import { agentLogger } from '@/lib/ai/utils/logger';

/**
 * GET /api/ai/n8n-workflows
 * Mevcut workflow'ları listele ve analiz et
 */
export async function GET(request: NextRequest) {
  try {
    const generator = getN8nWorkflowGenerator();
    const analysis = await generator.analyzeWorkflows();

    return NextResponse.json({
      success: true,
      ...analysis,
      message: 'Workflows retrieved successfully',
    });
  } catch (error: any) {
    agentLogger.error('❌ Failed to list workflows:', error);
    return NextResponse.json(
      {
        error: 'Failed to list workflows',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/ai/n8n-workflows
 * Yeni workflow oluştur
 * Body: { 
 *   type: 'basic-planning' | 'import',
 *   workflowJson?: string (for import),
 *   filePath?: string (for import from file)
 * }
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, workflowJson, filePath } = body;

    const generator = getN8nWorkflowGenerator();
    let workflowId: string;

    switch (type) {
      case 'basic-planning':
        workflowId = await generator.createBasicPlanningWorkflow();
        break;

      case 'import':
        if (filePath) {
          workflowId = await generator.importWorkflowFromFile(filePath);
        } else if (workflowJson) {
          const apiClient = getN8nApiClient();
          const result = await apiClient.importWorkflow(workflowJson);
          workflowId = result.id;
        } else {
          return NextResponse.json(
            { error: 'workflowJson or filePath is required for import' },
            { status: 400 }
          );
        }
        break;

      default:
        return NextResponse.json(
          { error: `Unknown workflow type: ${type}` },
          { status: 400 }
        );
    }

    return NextResponse.json({
      success: true,
      workflowId,
      message: `Workflow created successfully: ${workflowId}`,
    });
  } catch (error: any) {
    agentLogger.error('❌ Failed to create workflow:', error);
    return NextResponse.json(
      {
        error: 'Failed to create workflow',
        message: error.message,
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

