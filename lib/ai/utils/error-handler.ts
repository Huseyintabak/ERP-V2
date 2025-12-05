/**
 * AI Error Handler Utility
 * OpenAI API hatalarını kategorize eder ve graceful degradation stratejileri uygular
 */

import { agentLogger } from './logger';

export enum AIErrorType {
  QUOTA_EXCEEDED = 'QUOTA_EXCEEDED',           // 429 - Graceful degradation
  UNAUTHORIZED = 'UNAUTHORIZED',               // 401 - Warning, continue
  RATE_LIMIT = 'RATE_LIMIT',                   // 429 - Retry with backoff
  NETWORK_ERROR = 'NETWORK_ERROR',             // Timeout - Retry
  TIMEOUT = 'TIMEOUT',                         // Timeout - Retry
  INVALID_RESPONSE = 'INVALID_RESPONSE',       // Parse error - Log, continue
  VALIDATION_ERROR = 'VALIDATION_ERROR',       // Agent validation - Normal reject
  UNKNOWN = 'UNKNOWN'                          // Unknown - Log, fail safe
}

export interface ErrorHandlingStrategy {
  type: AIErrorType;
  shouldRetry: boolean;
  maxRetries: number;
  backoffStrategy: 'exponential' | 'linear' | 'none';
  gracefulDegradation: boolean;
  defaultDecision: 'approve' | 'reject' | 'conditional';
  logLevel: 'error' | 'warn' | 'info';
}

export interface ErrorHandlingResult {
  decision: 'approve' | 'reject' | 'conditional';
  reasoning: string;
  confidence: number;
  shouldRetry: boolean;
  retryAfter?: number;
}

const ERROR_STRATEGIES: Record<AIErrorType, ErrorHandlingStrategy> = {
  [AIErrorType.QUOTA_EXCEEDED]: {
    type: AIErrorType.QUOTA_EXCEEDED,
    shouldRetry: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.UNAUTHORIZED]: {
    type: AIErrorType.UNAUTHORIZED,
    shouldRetry: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.RATE_LIMIT]: {
    type: AIErrorType.RATE_LIMIT,
    shouldRetry: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.NETWORK_ERROR]: {
    type: AIErrorType.NETWORK_ERROR,
    shouldRetry: true,
    maxRetries: 3,
    backoffStrategy: 'exponential',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.TIMEOUT]: {
    type: AIErrorType.TIMEOUT,
    shouldRetry: true,
    maxRetries: 2,
    backoffStrategy: 'linear',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.INVALID_RESPONSE]: {
    type: AIErrorType.INVALID_RESPONSE,
    shouldRetry: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'warn'
  },
  [AIErrorType.VALIDATION_ERROR]: {
    type: AIErrorType.VALIDATION_ERROR,
    shouldRetry: false,
    maxRetries: 0,
    backoffStrategy: 'none',
    gracefulDegradation: false,
    defaultDecision: 'reject',
    logLevel: 'error'
  },
  [AIErrorType.UNKNOWN]: {
    type: AIErrorType.UNKNOWN,
    shouldRetry: false,
    maxRetries: 1,
    backoffStrategy: 'none',
    gracefulDegradation: true,
    defaultDecision: 'approve',
    logLevel: 'error'
  }
};

export class AIErrorHandler {
  /**
   * Hata tipini sınıflandır
   */
  static classifyError(error: any): AIErrorType {
    const message = error?.message?.toLowerCase() || '';
    const status = error?.status || error?.response?.status;

    if (status === 429 || message.includes('quota') || message.includes('exceeded')) {
      return message.includes('rate limit') ? AIErrorType.RATE_LIMIT : AIErrorType.QUOTA_EXCEEDED;
    }
    if (status === 401 || message.includes('unauthorized') || message.includes('invalid api key')) {
      return AIErrorType.UNAUTHORIZED;
    }
    if (message.includes('timeout') || message.includes('timed out')) {
      return AIErrorType.TIMEOUT;
    }
    if (message.includes('network') || message.includes('fetch failed') || message.includes('enotfound')) {
      return AIErrorType.NETWORK_ERROR;
    }
    if (message.includes('parse') || message.includes('invalid json') || message.includes('unexpected token')) {
      return AIErrorType.INVALID_RESPONSE;
    }

    return AIErrorType.UNKNOWN;
  }

  /**
   * Hata handling stratejisini uygula
   */
  static async handleError(
    error: any,
    requestType: 'validation' | 'request' | 'query' | 'analysis',
    context?: Record<string, any>
  ): Promise<ErrorHandlingResult> {
    const errorType = this.classifyError(error);
    const strategy = ERROR_STRATEGIES[errorType];

    // Log error
    await this.logError(errorType, error, context, strategy.logLevel);

    // Retry logic
    const retryCount = context?.retryCount || 0;
    if (strategy.shouldRetry && retryCount < strategy.maxRetries) {
      const retryAfter = this.calculateBackoff(strategy.backoffStrategy, retryCount);
      return {
        decision: 'conditional',
        reasoning: `${errorType} hatası. ${retryAfter}ms sonra tekrar deneniyor...`,
        confidence: 0.3,
        shouldRetry: true,
        retryAfter
      };
    }

    // Graceful degradation
    if (strategy.gracefulDegradation) {
      return {
        decision: strategy.defaultDecision,
        reasoning: `OpenAI API hatası (${errorType}). Graceful degradation: ${strategy.defaultDecision} kararı uygulanıyor.`,
        confidence: 0.5,
        shouldRetry: false
      };
    }

    // Normal rejection
    return {
      decision: 'reject',
      reasoning: `Hata: ${error.message || 'Bilinmeyen hata'}`,
      confidence: 0.0,
      shouldRetry: false
    };
  }

  /**
   * Backoff süresini hesapla
   */
  private static calculateBackoff(
    strategy: 'exponential' | 'linear' | 'none',
    retryCount: number
  ): number {
    switch (strategy) {
      case 'exponential':
        // Exponential backoff: 1s, 2s, 4s, 8s...
        return Math.min(1000 * Math.pow(2, retryCount), 10000); // Max 10 saniye
      case 'linear':
        // Linear backoff: 1s, 2s, 3s, 4s...
        return Math.min(1000 * (retryCount + 1), 5000); // Max 5 saniye
      case 'none':
      default:
        return 0;
    }
  }

  /**
   * Hata loglama
   */
  private static async logError(
    errorType: AIErrorType,
    error: any,
    context?: Record<string, any>,
    logLevel: 'error' | 'warn' | 'info' = 'error'
  ): Promise<void> {
    const logData = {
      action: 'ai_error',
      errorType,
      error: error?.message || 'Unknown error',
      status: error?.status || error?.response?.status,
      context: {
        agent: context?.agent,
        requestId: context?.requestId,
        requestType: context?.requestType,
        retryCount: context?.retryCount || 0
      }
    };

    switch (logLevel) {
      case 'error':
        await agentLogger.error(logData);
        break;
      case 'warn':
        await agentLogger.warn(logData);
        break;
      case 'info':
        await agentLogger.log(logData);
        break;
    }
  }
}

