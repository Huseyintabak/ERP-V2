/**
 * OpenAI Agent Builder API Client
 * Agent Builder UI'de oluşturulan assistant'ları çağırmak için
 */

import OpenAI from 'openai';
import { agentLogger } from './utils/logger';
import { costTracker } from './utils/cost-tracker';

// Lazy: modül import edilirken (örn. `next build` sayfa verisi toplarken) OPENAI_API_KEY
// yoksa hata fırlatmasın; client ilk gerçek çağrıda oluşturulur.
let openaiClient: OpenAI | null = null;
function getOpenAI(): OpenAI {
  if (!openaiClient) {
    openaiClient = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiClient;
}

export interface AgentBuilderRunResult {
  threadId: string;
  runId: string;
  response: string;
  assistantId: string;
  status: string;
  tokens?: {
    prompt: number;
    completion: number;
    total: number;
  };
  cost?: number;
  duration?: number;
}

export async function runAgentBuilderWorkflow(
  assistantId: string,
  prompt: string,
  context?: any
): Promise<AgentBuilderRunResult> {
  const startTime = Date.now();
  agentLogger.log(`🎨 Running Agent Builder workflow: ${assistantId}`);

  try {
    // 1. Thread oluştur
    const thread = await getOpenAI().beta.threads.create({
      messages: [
        {
          role: 'user',
          content: prompt,
        },
      ],
      metadata: {
        source: 'thunder-erp',
        context: JSON.stringify(context || {}),
        timestamp: new Date().toISOString(),
      },
    });

    agentLogger.log(`✅ Thread created: ${thread.id}`);

    // 2. Agent'ı çalıştır
    const run = await getOpenAI().beta.threads.runs.create(thread.id, {
      assistant_id: assistantId,
      instructions: 'Thunder ERP request. Respond in JSON format if possible.',
    });

    agentLogger.log(`🚀 Run started: ${run.id}`);

    // 3. Tamamlanmasını bekle (max 60 saniye)
    let runStatus = await getOpenAI().beta.threads.runs.retrieve(thread.id, run.id);
    let retries = 0;
    const maxRetries = 60;

    while (
      runStatus.status !== 'completed' &&
      runStatus.status !== 'failed' &&
      runStatus.status !== 'cancelled' &&
      retries < maxRetries
    ) {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      runStatus = await getOpenAI().beta.threads.runs.retrieve(thread.id, run.id);
      retries++;

      if (retries % 5 === 0) {
        agentLogger.log(`⏳ Run status: ${runStatus.status} (${retries}s)`);
      }
    }

    if (runStatus.status === 'failed') {
      throw new Error(
        `Agent run failed: ${runStatus.last_error?.message || 'Unknown error'}`
      );
    }

    if (runStatus.status === 'cancelled') {
      throw new Error('Agent run was cancelled');
    }

    if (retries >= maxRetries) {
      throw new Error('Agent run timed out after 60 seconds');
    }

    agentLogger.log(`✅ Run completed: ${runStatus.status}`);

    // 4. Mesajları al
    const messages = await getOpenAI().beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || lastMessage.role !== 'assistant') {
      throw new Error('No assistant response found');
    }

    // 5. Response parse et
    const content = lastMessage.content[0];
    const text = content.type === 'text' ? content.text.value : '';

    // 6. Token usage & cost tracking
    const duration = Date.now() - startTime;
    const tokens = {
      prompt: runStatus.usage?.prompt_tokens || 0,
      completion: runStatus.usage?.completion_tokens || 0,
      total: runStatus.usage?.total_tokens || 0,
    };

    // Cost calculation (GPT-4o pricing)
    const cost =
      (tokens.prompt / 1000) * 0.005 + (tokens.completion / 1000) * 0.015;

    // Track cost
    await costTracker.trackUsage({
      agent: assistantId,
      model: 'gpt-4o',
      tokens: tokens.total,
      cost,
      requestId: run.id,
      timestamp: new Date(),
    });

    agentLogger.log(
      `💰 Cost: $${cost.toFixed(4)} (${tokens.total} tokens, ${duration}ms)`
    );

    return {
      threadId: thread.id,
      runId: run.id,
      response: text,
      assistantId,
      status: runStatus.status,
      tokens,
      cost,
      duration,
    };
  } catch (error: any) {
    agentLogger.error(`❌ Agent Builder workflow failed:`, error);
    throw error;
  }
}

/**
 * Assistant'ı listele (debug için)
 */
export async function listAssistants() {
  try {
    const assistants = await getOpenAI().beta.assistants.list();
    return assistants.data;
  } catch (error: any) {
    agentLogger.error(`❌ Failed to list assistants:`, error);
    throw error;
  }
}

/**
 * Thread'i sil (cleanup)
 */
export async function deleteThread(threadId: string) {
  try {
    await getOpenAI().beta.threads.del(threadId);
    agentLogger.log(`🗑️ Thread deleted: ${threadId}`);
  } catch (error: any) {
    agentLogger.error(`❌ Failed to delete thread:`, error);
  }
}

