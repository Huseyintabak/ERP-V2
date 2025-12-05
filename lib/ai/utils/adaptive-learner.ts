/**
 * Adaptive Learning System
 * Learns from past agent decisions to optimize prompts, confidence calibration, and model selection
 */

import { agentLogger } from './logger';
import { createAdminClient } from '@/lib/supabase/server';

export interface DecisionPattern {
  prompt: string;
  promptHash: string;
  model: string;
  taskComplexity: 'simple' | 'medium' | 'complex' | 'critical';
  decision: 'approve' | 'reject' | 'conditional' | 'pending';
  confidence: number;
  actualOutcome?: 'success' | 'failure' | 'unknown'; // Feedback from system
  success: boolean;
  timestamp: Date;
}

export interface PromptOptimization {
  promptHash: string;
  originalPrompt: string;
  optimizedPrompt: string;
  improvementScore: number;
  confidenceGain: number;
  successRateGain: number;
}

export interface ModelPerformance {
  model: string;
  taskComplexity: string;
  averageConfidence: number;
  successRate: number;
  averageLatency: number;
  averageTokens: number;
  usageCount: number;
}

/**
 * Adaptive Learner Class
 * Analyzes patterns and optimizes agent behavior
 */
export class AdaptiveLearner {
  private patterns: DecisionPattern[] = [];
  private readonly MAX_PATTERNS = 10000; // Keep last N patterns
  private promptOptimizations: Map<string, PromptOptimization> = new Map();
  private modelPerformances: Map<string, ModelPerformance> = new Map();

  /**
   * Record a decision pattern
   */
  async recordDecision(pattern: DecisionPattern): Promise<void> {
    // Add to patterns
    this.patterns.push(pattern);
    
    // Keep only last N patterns
    if (this.patterns.length > this.MAX_PATTERNS) {
      this.patterns = this.patterns.slice(-this.MAX_PATTERNS);
    }
    
    // Update model performance
    this.updateModelPerformance(pattern);
    
    // Analyze for prompt optimization (async, non-blocking)
    this.analyzeForPromptOptimization(pattern).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Prompt optimization analysis failed:', error);
      }
    });
  }

  /**
   * Get optimized prompt based on past performance
   */
  getOptimizedPrompt(originalPrompt: string, taskComplexity: string): string {
    const promptHash = this.hashPrompt(originalPrompt);
    const optimization = this.promptOptimizations.get(promptHash);
    
    if (optimization && optimization.improvementScore > 0.1) {
      // Use optimized prompt if improvement is significant (>10%)
      return optimization.optimizedPrompt;
    }
    
    return originalPrompt;
  }

  /**
   * Calibrate confidence score based on past accuracy
   */
  calibrateConfidence(
    agent: string,
    taskComplexity: string,
    rawConfidence: number
  ): number {
    // Get historical accuracy for this agent and task complexity
    const relevantPatterns = this.patterns.filter(
      p => p.taskComplexity === taskComplexity
    );
    
    if (relevantPatterns.length < 10) {
      // Not enough data, return raw confidence
      return rawConfidence;
    }
    
    // Calculate calibration factor
    const averageHistoricalConfidence = relevantPatterns.reduce(
      (sum, p) => sum + p.confidence,
      0
    ) / relevantPatterns.length;
    
    const averageActualSuccess = relevantPatterns.filter(p => p.success).length / relevantPatterns.length;
    
    // If historical confidence is too high compared to actual success, reduce it
    const calibrationFactor = averageActualSuccess / Math.max(averageHistoricalConfidence, 0.01);
    
    return Math.min(1.0, rawConfidence * calibrationFactor);
  }

  /**
   * Get best model for a task
   */
  getBestModel(taskComplexity: 'simple' | 'medium' | 'complex' | 'critical'): string {
    const complexityKey = taskComplexity;
    const performances = Array.from(this.modelPerformances.values())
      .filter(p => p.taskComplexity === complexityKey)
      .filter(p => p.usageCount >= 5); // Minimum usage threshold
    
    if (performances.length === 0) {
      // No data, return default
      return 'gpt-4o-mini'; // Default for simple/medium
    }
    
    // Score models: success rate * 0.5 + (1 - normalized_latency) * 0.3 + (1 - normalized_tokens) * 0.2
    const scored = performances.map(p => {
      const normalizedLatency = Math.min(1, p.averageLatency / 10000); // Normalize to 0-1
      const normalizedTokens = Math.min(1, p.averageTokens / 100000); // Normalize to 0-1
      
      const score = 
        (p.successRate / 100) * 0.5 +
        (1 - normalizedLatency) * 0.3 +
        (1 - normalizedTokens) * 0.2;
      
      return {
        model: p.model,
        score,
        performance: p
      };
    });
    
    // Sort by score (highest first)
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].model;
  }

  /**
   * Analyze pattern for prompt optimization
   */
  private async analyzeForPromptOptimization(pattern: DecisionPattern): Promise<void> {
    const promptHash = pattern.promptHash;
    
    // Get all patterns with same prompt hash
    const samePromptPatterns = this.patterns.filter(p => p.promptHash === promptHash);
    
    if (samePromptPatterns.length < 10) {
      // Not enough data for optimization
      return;
    }
    
    // Calculate success rate
    const successRate = samePromptPatterns.filter(p => p.success).length / samePromptPatterns.length;
    
    // If success rate is low (<80%), mark for optimization
    if (successRate < 0.8) {
      // Store optimization suggestion (actual optimization would require GPT analysis)
      const optimization: PromptOptimization = {
        promptHash,
        originalPrompt: pattern.prompt,
        optimizedPrompt: pattern.prompt, // Placeholder - would be optimized by GPT
        improvementScore: 1.0 - successRate, // Higher score = more improvement needed
        confidenceGain: 0, // Would be calculated after optimization
        successRateGain: 0.2 // Estimated gain
      };
      
      this.promptOptimizations.set(promptHash, optimization);
      
      // Log optimization opportunity
      await agentLogger.log({
        agent: 'Adaptive Learner',
        action: 'prompt_optimization_opportunity',
        data: {
          promptHash,
          currentSuccessRate: successRate,
          improvementScore: optimization.improvementScore
        }
      });
    }
  }

  /**
   * Update model performance metrics
   */
  private updateModelPerformance(pattern: DecisionPattern): void {
    const key = `${pattern.model}_${pattern.taskComplexity}`;
    const existing = this.modelPerformances.get(key) || {
      model: pattern.model,
      taskComplexity: pattern.taskComplexity,
      averageConfidence: 0,
      successRate: 0,
      averageLatency: 0,
      averageTokens: 0,
      usageCount: 0
    };
    
    // Update metrics (moving average)
    existing.usageCount++;
    existing.averageConfidence = 
      (existing.averageConfidence * (existing.usageCount - 1) + pattern.confidence) / 
      existing.usageCount;
    
    existing.successRate = 
      (existing.successRate * (existing.usageCount - 1) + (pattern.success ? 100 : 0)) / 
      existing.usageCount;
    
    this.modelPerformances.set(key, existing);
  }

  /**
   * Hash prompt for pattern matching
   */
  private hashPrompt(prompt: string): string {
    // Simple hash function
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
  }

  /**
   * Get learning statistics
   */
  getStats(): {
    totalPatterns: number;
    promptOptimizations: number;
    modelPerformances: number;
    averageConfidence: number;
    averageSuccessRate: number;
  } {
    const averageConfidence = this.patterns.length > 0
      ? this.patterns.reduce((sum, p) => sum + p.confidence, 0) / this.patterns.length
      : 0;
    
    const averageSuccessRate = this.patterns.length > 0
      ? (this.patterns.filter(p => p.success).length / this.patterns.length) * 100
      : 0;
    
    return {
      totalPatterns: this.patterns.length,
      promptOptimizations: this.promptOptimizations.size,
      modelPerformances: this.modelPerformances.size,
      averageConfidence,
      averageSuccessRate
    };
  }
}

// Global instance
let adaptiveLearnerInstance: AdaptiveLearner | null = null;

/**
 * Get global adaptive learner instance
 */
export function getAdaptiveLearner(): AdaptiveLearner {
  if (!adaptiveLearnerInstance) {
    adaptiveLearnerInstance = new AdaptiveLearner();
  }
  return adaptiveLearnerInstance;
}

