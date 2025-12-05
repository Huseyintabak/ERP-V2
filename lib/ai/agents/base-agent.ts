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
import { AIErrorHandler, AIErrorType } from '../utils/error-handler';

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
   * GPT API çağrısı yap - Retry logic ve error handling ile
   */
  protected async callGPT(
    messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
    options?: {
      model?: string;
      temperature?: number;
      maxTokens?: number;
      taskComplexity?: 'simple' | 'medium' | 'complex' | 'critical';
      requestId?: string;
      requestType?: 'validation' | 'request' | 'query' | 'analysis';
    }
  ) {
    // AI Validation kontrolü (environment variable)
    const { isAIValidationEnabled } = await import('../utils/quota-manager');
    if (!isAIValidationEnabled()) {
      const error: any = new Error('AI validation disabled (AGENT_ENABLED=false or OPENAI_API_KEY not set)');
      error.aiErrorType = 'AI_DISABLED';
      error.gracefulDegradation = true;
      throw error;
    }

    // Quota kontrolü (cache'den) - API çağrısından ÖNCE
    const { getQuotaManager } = await import('../utils/quota-manager');
    const quotaManager = getQuotaManager();
    quotaManager.cleanupExpiredCache(); // Süresi dolmuş cache'i temizle
    
    if (quotaManager.isQuotaExceeded()) {
      const quotaStatus = quotaManager.getQuotaStatus();
      const error: any = new Error(`OpenAI API quota exceeded (cached). Will retry after ${quotaStatus?.expiryTime?.toISOString() || '1 hour'}`);
      error.aiErrorType = 'QUOTA_EXCEEDED';
      error.status = 429;
      error.gracefulDegradation = true;
      error.quotaCached = true;
      error.quotaExpiry = quotaStatus?.expiryTime;
      throw error;
    }

    // Circuit breaker kontrolü (quota için özel)
    const { getCircuitBreakerManager } = await import('../utils/circuit-breaker');
    const circuitBreakerManager = getCircuitBreakerManager();
    const quotaBreaker = circuitBreakerManager.getBreaker('openai_quota');
    
    if (quotaBreaker.getState() === 'OPEN') {
      const error: any = new Error('OpenAI API quota circuit breaker is OPEN');
      error.aiErrorType = 'QUOTA_EXCEEDED';
      error.status = 429;
      error.gracefulDegradation = true;
      error.circuitBreakerOpen = true;
      throw error;
    }

    // Rate limiting kontrolü
    const rateCheck = rateLimiter.checkLimit(this.name);
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded for ${this.name}. Remaining: ${rateCheck.remaining}`);
    }
    
    // Model seçimi (Adaptive Learning ile optimize edilmiş)
    let model = options?.model;
    if (!model) {
      try {
        const { getAdaptiveLearner } = await import('../utils/adaptive-learner');
        const learner = getAdaptiveLearner();
        const optimizedModel = learner.getBestModel(options?.taskComplexity || 'medium');
        model = optimizedModel || selectModel(this.role, options?.taskComplexity || 'medium') || this.defaultModel;
      } catch (error) {
        // Fallback to default model selection
        model = selectModel(this.role, options?.taskComplexity || 'medium') || this.defaultModel;
      }
    }
    
    // Prompt optimization (Adaptive Learning)
    let optimizedMessages = messages;
    try {
      const { getAdaptiveLearner } = await import('../utils/adaptive-learner');
      const learner = getAdaptiveLearner();
      const userMessage = messages.find(m => m.role === 'user');
      if (userMessage) {
        const optimizedContent = learner.getOptimizedPrompt(
          userMessage.content,
          options?.taskComplexity || 'medium'
        );
        if (optimizedContent !== userMessage.content) {
          optimizedMessages = messages.map(m => 
            m.role === 'user' ? { ...m, content: optimizedContent } : m
          );
        }
      }
    } catch (error) {
      // Fallback to original messages
      optimizedMessages = messages;
    }
    
    // Cache kontrolü (basit prompt hash ile)
    const cacheKey = `gpt:${this.name}:${JSON.stringify(optimizedMessages)}:${model}`;
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
    const maxRetries = 3;
    let retryCount = 0;
    let lastError: any;
    
    // Retry loop
    while (retryCount < maxRetries) {
      try {
        const response = await this.openaiClient.chat.completions.create(
          {
            model,
            messages: [
              { role: 'system', content: this.systemPrompt },
              ...optimizedMessages
            ],
            temperature: options?.temperature ?? 0.3,
            max_tokens: options?.maxTokens
          },
          {
            timeout: 30000 // 30 saniye timeout
          }
        );
        
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
        
        // Başarılı istek sonrası quota durumunu güncelle
        try {
          const { getQuotaManager } = await import('../utils/quota-manager');
          const quotaManager = getQuotaManager();
          quotaManager.markQuotaAvailable(); // Quota tekrar kullanılabilir
        } catch (error) {
          // Silent fail - quota manager should not block requests
        }
        
        await agentLogger.log({
          agent: this.name,
          action: 'gpt_call',
          model,
          duration,
          tokens,
          cost,
          success: true
        });
        
        // Health monitoring - request kaydı (async, non-blocking)
        try {
          const { getHealthMonitor } = await import('../utils/health-monitor');
          const healthMonitor = getHealthMonitor();
          await healthMonitor.recordRequest(
            this.name,
            true, // success
            duration,
            tokens,
            undefined // no error
          );
        } catch (error) {
          // Silent fail - health monitoring should not block requests
        }
        
        // parseResponse artık async, ama response doğrudan döndürülüyor
        // parseResponse sadece AgentResponse için kullanılıyor
        return response;
      } catch (error: any) {
        lastError = error;
        const duration = Date.now() - startTime;
        
        // Error classification ve handling
        const errorHandler = AIErrorHandler;
        const aiErrorType = errorHandler.classifyError(error);
        
        // QUOTA_EXCEEDED hatası yakalandıysa, quota manager'ı güncelle
        if (aiErrorType === 'QUOTA_EXCEEDED' || error?.status === 429 || error?.aiErrorType === 'QUOTA_EXCEEDED') {
          const { getQuotaManager } = await import('../utils/quota-manager');
          const quotaManager = getQuotaManager();
          
          // Eğer quota hatası cache'den gelmediyse (yeni bir hata), cache'le
          if (!error?.quotaCached && !error?.circuitBreakerOpen) {
            const statusCode = error?.status || error?.response?.status || 429;
            const reason = error?.message || 'OpenAI API quota exceeded';
            quotaManager.markQuotaExceeded(reason, statusCode);
            
            console.warn(`[BaseAgent] Quota exceeded detected. Cached for 1 hour. Agent: ${this.name}`);
          }
        }
        
        const handling = await errorHandler.handleError(
          error,
          options?.requestType || 'query',
          {
            retryCount,
            agent: this.name,
            requestId: options?.requestId,
            requestType: options?.requestType
          }
        );
        
        // QUOTA_EXCEEDED için retry yapma (quota cache'liyse zaten retry yapmıyoruz)
        const isQuotaError = aiErrorType === 'QUOTA_EXCEEDED' || error?.status === 429 || error?.quotaCached || error?.circuitBreakerOpen;
        const shouldRetryForQuota = !isQuotaError && handling.shouldRetry;
        
        // Retry logic (quota hatası hariç)
        if (shouldRetryForQuota && retryCount < maxRetries - 1) {
          retryCount++;
          const retryAfter = handling.retryAfter || 1000 * retryCount;
          await this.sleep(retryAfter);
          continue;
        }
        
        // Error logging
        await agentLogger.error({
          agent: this.name,
          action: 'gpt_call',
          model,
          duration,
          error: error.message,
          success: false,
          retryCount,
          errorType: aiErrorType.toString(),
          quotaCached: error?.quotaCached || false,
          circuitBreakerOpen: error?.circuitBreakerOpen || false
        });
        
        // Health monitoring - error kaydı (async, non-blocking)
        try {
          const { getHealthMonitor } = await import('../utils/health-monitor');
          const healthMonitor = getHealthMonitor();
          await healthMonitor.recordRequest(
            this.name,
            false, // failure
            duration,
            0, // no tokens on error
            error.message
          );
        } catch (monitorError) {
          // Silent fail - health monitoring should not block error handling
        }
        
        // Başarılı istek sonrası quota durumunu güncelle (eğer retry yapmıyorsak)
        if (!shouldRetryForQuota && aiErrorType !== 'QUOTA_EXCEEDED') {
          // Bu bir quota hatası değilse ve retry yapmıyorsak, 
          // muhtemelen başka bir hata var - quota durumunu değiştirme
        }
        
        // Graceful degradation için error objesine metadata ekle
        const enhancedError = {
          ...error,
          aiErrorType,
          gracefulDegradation: handling.decision,
          reasoning: handling.reasoning,
          confidence: handling.confidence,
          retryCount,
          quotaCached: error?.quotaCached || false,
          circuitBreakerOpen: error?.circuitBreakerOpen || false
        };
        
        throw enhancedError;
      }
    }
    
    // Max retries exceeded
    throw lastError;
  }
  
  /**
   * Sleep helper - retry delay için
   */
  protected sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
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
   * Circuit Breaker pattern ile korumalı
   */
  async askAgent(
    agentName: string,
    question: string,
    context?: any
  ): Promise<AgentResponse> {
    const { AgentEventBus } = await import('../event-bus');
    const { getCircuitBreakerManager } = await import('../utils/circuit-breaker');
    const eventBus = AgentEventBus.getInstance();
    const circuitManager = getCircuitBreakerManager();
    
    // Circuit breaker key: "fromAgent_toAgent"
    const circuitKey = `${this.name.toLowerCase().replace(' agent', '')}_${agentName.toLowerCase().replace(' agent', '')}`;
    const circuitBreaker = circuitManager.getBreaker(circuitKey, {
      failureThreshold: 5,
      successThreshold: 2,
      timeout: 60000,        // 60 seconds
      monitoringPeriod: 60000 // 60 seconds
    });
    
    const message: AgentMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      from: this.name,
      to: agentName,
      type: 'query',
      content: question,
      data: context,
      timestamp: new Date()
    };
    
    // Execute with circuit breaker protection
    try {
      const response = await circuitBreaker.execute(
        async () => await eventBus.sendMessage(this.name, agentName, message),
        // Fallback: Return a default response if circuit is open
        async () => {
          const { agentLogger } = await import('../utils/logger');
          await agentLogger.warn({
            agent: this.name,
            action: 'ask_agent_circuit_open',
            targetAgent: agentName,
            circuitKey,
            message: 'Circuit breaker is OPEN, using fallback response'
          });
          
          return {
            id: `fallback_${Date.now()}`,
            agent: agentName,
            decision: 'pending',
            reasoning: `Circuit breaker is OPEN for ${agentName}. Request blocked to prevent cascading failures.`,
            confidence: 0.0,
            issues: [`Circuit breaker OPEN: ${agentName} is currently unavailable`],
            timestamp: new Date()
          };
        }
      );
      
      return response;
    } catch (error: any) {
      // If circuit breaker throws, log and return fallback
      const { agentLogger } = await import('../utils/logger');
      await agentLogger.error({
        agent: this.name,
        action: 'ask_agent_error',
        targetAgent: agentName,
        error: error.message,
        circuitKey
      });
      
      return {
        id: `error_${Date.now()}`,
        agent: agentName,
        decision: 'pending',
        reasoning: `Error communicating with ${agentName}: ${error.message}`,
        confidence: 0.0,
        issues: [error.message],
        timestamp: new Date()
      };
    }
  }
  
  /**
   * Response'u parse et
   */
  protected async parseResponse(response: any, messages?: Array<{ role: string; content: string }>): Promise<AgentResponse> {
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
      // Confidence calibration (Adaptive Learning)
      let calibratedConfidence = parsed.confidence || 0.5;
      try {
        const { getAdaptiveLearner } = await import('../utils/adaptive-learner');
        const learner = getAdaptiveLearner();
        calibratedConfidence = learner.calibrateConfidence(
          this.name,
          'medium', // Default complexity - will be overridden if options provided
          parsed.confidence || 0.5
        );
      } catch (error) {
        // Fallback to raw confidence
        calibratedConfidence = parsed.confidence || 0.5;
      }
      
      // Record decision pattern for learning (async, non-blocking)
      if (messages) {
        try {
          const { getAdaptiveLearner } = await import('../utils/adaptive-learner');
          const learner = getAdaptiveLearner();
          const promptHash = JSON.stringify(messages).substring(0, 100); // Simple hash
          
          await learner.recordDecision({
            prompt: JSON.stringify(messages),
            promptHash,
            model: 'gpt-4o-mini', // Default - will be actual model from response
            taskComplexity: 'medium',
            decision: parsed.decision || 'pending',
            confidence: calibratedConfidence,
            success: parsed.decision === 'approve' || parsed.decision === 'conditional', // Simplified
            timestamp: new Date()
          });
        } catch (error) {
          // Silent fail - learning should not block responses
        }
      }
      
      return {
        id: `resp_${Date.now()}`,
        agent: this.name,
        decision: parsed.decision || 'pending',
        action: parsed.action,
        data: parsed.data,
        reasoning: parsed.reasoning || '',
        confidence: calibratedConfidence,
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

