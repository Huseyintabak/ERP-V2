/**
 * Base Agent Class
 * Tüm agent'ların extend edeceği temel sınıf
 */

import OpenAI from 'openai';
import { AgentRequest, AgentResponse, ValidationResult, Vote, AgentDecision } from '../types/agent.types';
import { AgentMessage } from '../types/message.types';
import { selectModel } from '../utils/model-selector';
import { agentLogger } from '../utils/logger';
import { agentCache } from '../utils/cache';
import { rateLimiter } from '../utils/rate-limiter';
import { costTracker } from '../utils/cost-tracker';

export abstract class BaseAgent {
  protected name: string;
  protected role: string;
  protected responsibilities: string[];
  protected systemPrompt: string;
  protected openaiClient: OpenAI;
  protected defaultModel: string;
  
  constructor(
    name: string,
    role: string,
    responsibilities: string[],
    systemPrompt: string,
    defaultModel: string = 'gpt-4o'
  ) {
    this.name = name;
    this.role = role;
    this.responsibilities = responsibilities;
    this.systemPrompt = systemPrompt;
    this.defaultModel = process.env[`GPT_MODEL_${role.toUpperCase()}`] || defaultModel;
    
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn(`⚠️ OPENAI_API_KEY not found for ${name}. AI features will be disabled.`);
      // API key yoksa bile client oluştur, ama kullanılamaz
      this.openaiClient = new OpenAI({
        apiKey: 'dummy-key',
        baseURL: 'https://api.openai.com/v1',
        maxRetries: 0,
        timeout: 30000
      });
    } else {
      this.openaiClient = new OpenAI({
        apiKey,
        baseURL: 'https://api.openai.com/v1',
        maxRetries: 3,
        timeout: 30000
      });
    }
  }
  
  /**
   * İstek işle - Her agent kendi implementasyonunu yapacak
   */
  abstract processRequest(request: AgentRequest): Promise<AgentResponse>;
  
  /**
   * Diğer agent'larla doğrulama - Her agent kendi implementasyonunu yapacak
   */
  abstract validateWithOtherAgents(data: any): Promise<ValidationResult>;
  
  /**
   * GPT API çağrısı yap
   */
  protected async callGPT(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      taskComplexity?: 'simple' | 'medium' | 'complex' | 'critical';
      requestId?: string;
    }
  ) {
    // Rate limiting kontrolü
    const rateCheck = rateLimiter.checkLimit(this.name);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded for ${this.name}. Remaining: ${rateCheck.remaining}`);
    }
    
    // Model seçimi
    const model = options?.model || 
                  selectModel(this.role, options?.taskComplexity || 'medium') || 
                  this.defaultModel;
    
    // Cache kontrolü (basit prompt hash ile)
    const cacheKey = `gpt:${this.name}:${JSON.stringify(messages)}:${model}`;
    const cached = agentCache.get(cacheKey);
    if (cached) {
      await agentLogger.log({
        agent: this.name,
        action: 'gpt_call_cached',
        model,
        cacheHit: true
      });
      return cached;
    }
    
    const startTime = Date.now();
    
    try {
      const response = await this.openaiClient.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: this.systemPrompt },
          ...messages
        ],
        temperature: options?.temperature ?? 0.3,
        max_tokens: options?.maxTokens
      });
      
      const duration = Date.now() - startTime;
      const tokens = response.usage?.total_tokens || 0;
      const cost = costTracker.calculateCost(model, tokens);
      
      // Cost tracking
      const costCheck = await costTracker.trackUsage({
        agent: this.name,
        model,
        tokens,
        cost,
        requestId: options?.requestId,
        timestamp: new Date()
      });
      
      if (!costCheck.allowed) {
        throw new Error(`Cost limit exceeded: ${costCheck.reason}`);
      }
      
      // Cache'e kaydet (sadece başarılı response'lar)
      agentCache.set(cacheKey, response, 3600 * 1000); // 1 saat
      
      await agentLogger.log({
        agent: this.name,
        action: 'gpt_call',
        model,
        duration,
        tokens,
        cost,
        success: true
      });
      
      return response;
    } catch (error: any) {
      const duration = Date.now() - startTime;
      
      await agentLogger.error({
        agent: this.name,
        action: 'gpt_call',
        model,
        duration,
        error: error.message,
        success: false
      });
      
      throw error;
    }
  }
  
  /**
   * Oylama (consensus için)
   */
  async vote(decision: AgentDecision): Promise<Vote> {
    const prompt = `
      ${this.systemPrompt}
      
      Bu kararı değerlendir ve oy ver:
      ${JSON.stringify(decision, null, 2)}
      
      Oy seçenekleri:
      - approve: Tamamen onaylıyorum
      - reject: Reddediyorum (nedenini açıkla)
      - conditional: Koşullu onaylıyorum (koşulları belirt)
      
      JSON formatında yanıt ver:
      {
        "vote": "approve" | "reject" | "conditional",
        "confidence": 0.0-1.0,
        "reasoning": "Açıklama",
        "conditions": ["koşul1", "koşul2"] // conditional ise
      }
    `;
    
    const response = await this.callGPT([
      { role: 'user', content: prompt }
    ], { taskComplexity: 'medium' });
    
    const content = response.choices[0]?.message?.content || '{}';
    
    try {
      const parsed = JSON.parse(content);
      return {
        agent: this.name,
        vote: parsed.vote,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        conditions: parsed.conditions || []
      };
    } catch (error) {
      // JSON parse edilemezse, default olarak approve ver
      return {
        agent: this.name,
        vote: 'approve',
        confidence: 0.5,
        reasoning: 'JSON parse error, defaulting to approve',
        conditions: []
      };
    }
  }
  
  /**
   * Diğer agent'a soru sor
   */
  async askAgent(
    agentName: string,
    question: string,
    context?: any
  ): Promise<AgentResponse> {
    const { AgentEventBus } = await import('../event-bus');
    const eventBus = AgentEventBus.getInstance();
    
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      from: this.name,
      to: agentName,
      type: 'query',
      content: question,
      data: context,
      timestamp: new Date()
    };
    
    return await eventBus.sendMessage(this.name, agentName, message);
  }
  
  /**
   * Response'u parse et
   */
  protected parseResponse(response: any): AgentResponse {
    let content = response.choices[0]?.message?.content || '{}';
    
    // Markdown code block'ları temizle (```json ... ``` veya ``` ... ```)
    content = content.trim();
    
    // Regex ile markdown code block'ları kaldır
    content = content.replace(/^```(?:json)?\s*\n?/i, ''); // Başlangıç ```json veya ```
    content = content.replace(/\n?```\s*$/i, ''); // Bitiş ```
    content = content.trim();
    
    // Eğer hala markdown code block varsa, manuel temizle
    if (content.startsWith('```')) {
      const lines = content.split('\n');
      if (lines[0].startsWith('```')) {
        lines.shift(); // İlk satırı kaldır (```json veya ```)
      }
      if (lines.length > 0 && lines[lines.length - 1].trim() === '```') {
        lines.pop(); // Son satırı kaldır (```)
      }
      content = lines.join('\n').trim();
    }
    
    try {
      const parsed = JSON.parse(content);
      return {
        id: `resp_${Date.now()}`,
        agent: this.name,
        decision: parsed.decision || 'pending',
        action: parsed.action,
        data: parsed.data,
        reasoning: parsed.reasoning || '',
        confidence: parsed.confidence || 0.5,
        issues: parsed.issues || [],
        recommendations: parsed.recommendations || [],
        timestamp: new Date()
      };
    } catch (error) {
      // JSON parse edilemezse, text içinde JSON aramaya çalış
      // İlk { ile başlayan ve son } ile biten JSON objesini bul
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          const parsed = JSON.parse(jsonMatch[0]);
          return {
            id: `resp_${Date.now()}`,
            agent: this.name,
            decision: parsed.decision || 'pending',
            action: parsed.action,
            data: parsed.data,
            reasoning: parsed.reasoning || '',
            confidence: parsed.confidence || 0.5,
            issues: parsed.issues || [],
            recommendations: parsed.recommendations || [],
            timestamp: new Date()
          };
        } catch (e) {
          // JSON bulundu ama parse edilemedi
          console.warn(`[${this.name}] JSON parse error after extraction:`, e);
        }
      }
      
      // JSON parse edilemezse, text olarak döndür
      console.warn(`[${this.name}] Failed to parse JSON response:`, content.substring(0, 200));
      return {
        id: `resp_${Date.now()}`,
        agent: this.name,
        decision: 'pending',
        reasoning: content,
        confidence: 0.5,
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Agent bilgilerini al
   */
  getInfo(): {
    name: string;
    role: string;
    responsibilities: string[];
    defaultModel: string;
  } {
    return {
      name: this.name,
      role: this.role,
      responsibilities: this.responsibilities,
      defaultModel: this.defaultModel
    };
  }
}

