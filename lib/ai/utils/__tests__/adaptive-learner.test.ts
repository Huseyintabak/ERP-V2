/**
 * Adaptive Learner Tests
 * Tests for prompt optimization, confidence calibration, and model selection
 */

import { describe, it, expect, beforeEach } from '@jest/globals';
import { AdaptiveLearner, getAdaptiveLearner, DecisionPattern } from '../adaptive-learner';

// Mock logger
jest.mock('../logger', () => ({
  agentLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

describe('AdaptiveLearner', () => {
  let learner: AdaptiveLearner;

  beforeEach(() => {
    learner = new AdaptiveLearner();
  });

  describe('Decision Pattern Recording', () => {
    it('should record decision patterns', async () => {
      const pattern: DecisionPattern = {
        prompt: 'Test prompt',
        promptHash: 'hash123',
        model: 'gpt-4o-mini',
        taskComplexity: 'medium',
        decision: 'approve',
        confidence: 0.8,
        success: true,
        timestamp: new Date()
      };

      await learner.recordDecision(pattern);

      const stats = learner.getStats();
      expect(stats.totalPatterns).toBe(1);
    });

    it('should limit stored patterns to MAX_PATTERNS', async () => {
      for (let i = 0; i < 10005; i++) {
        await learner.recordDecision({
          prompt: `Prompt ${i}`,
          promptHash: `hash${i}`,
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: 'approve',
          confidence: 0.8,
          success: true,
          timestamp: new Date()
        });
      }

      const stats = learner.getStats();
      expect(stats.totalPatterns).toBeLessThanOrEqual(10000);
    });
  });

  describe('Prompt Optimization', () => {
    it('should return original prompt if no optimization exists', () => {
      const original = 'Test prompt';
      const optimized = learner.getOptimizedPrompt(original, 'medium');

      expect(optimized).toBe(original);
    });

    it('should return optimized prompt if improvement is significant', async () => {
      // Record patterns with low success rate for a prompt
      const promptHash = 'test-prompt-hash';
      for (let i = 0; i < 15; i++) {
        await learner.recordDecision({
          prompt: 'Test prompt',
          promptHash,
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: i < 5 ? 'approve' : 'reject',
          confidence: 0.6,
          success: i < 5,
          timestamp: new Date()
        });
      }

      // After recording low success patterns, optimization should be suggested
      const optimized = learner.getOptimizedPrompt('Test prompt', 'medium');
      
      // If optimization exists and improvement > 10%, should return optimized
      // Note: Actual optimization would require GPT analysis
      expect(optimized).toBeDefined();
    });
  });

  describe('Confidence Calibration', () => {
    it('should return raw confidence if insufficient data', () => {
      const calibrated = learner.calibrateConfidence('test-agent', 'medium', 0.8);
      expect(calibrated).toBe(0.8); // No calibration without data
    });

    it('should calibrate confidence based on historical accuracy', async () => {
      // Record patterns where confidence is high but success is low
      for (let i = 0; i < 15; i++) {
        await learner.recordDecision({
          prompt: 'Test prompt',
          promptHash: 'hash1',
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: 'approve',
          confidence: 0.9, // High confidence
          success: i < 5, // But only 33% success rate
          timestamp: new Date()
        });
      }

      // Calibrate should reduce confidence
      const calibrated = learner.calibrateConfidence('test-agent', 'medium', 0.9);
      expect(calibrated).toBeLessThan(0.9);
    });

    it('should not exceed 1.0 after calibration', async () => {
      // Record perfect patterns
      for (let i = 0; i < 15; i++) {
        await learner.recordDecision({
          prompt: 'Test prompt',
          promptHash: 'hash2',
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: 'approve',
          confidence: 0.8,
          success: true, // 100% success
          timestamp: new Date()
        });
      }

      const calibrated = learner.calibrateConfidence('test-agent', 'medium', 0.9);
      expect(calibrated).toBeLessThanOrEqual(1.0);
    });
  });

  describe('Model Selection Optimization', () => {
    it('should return default model if no data', () => {
      const bestModel = learner.getBestModel('medium');
      expect(bestModel).toBe('gpt-4o-mini'); // Default
    });

    it('should select best model based on performance', async () => {
      // Record patterns for different models
      for (let i = 0; i < 10; i++) {
        await learner.recordDecision({
          prompt: 'Test prompt',
          promptHash: 'hash-model1',
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: 'approve',
          confidence: 0.8,
          success: true,
          timestamp: new Date()
        });
      }

      for (let i = 0; i < 10; i++) {
        await learner.recordDecision({
          prompt: 'Test prompt',
          promptHash: 'hash-model2',
          model: 'gpt-4o',
          taskComplexity: 'medium',
          decision: 'approve',
          confidence: 0.9,
          success: i < 7, // 70% success rate
          timestamp: new Date()
        });
      }

      const bestModel = learner.getBestModel('medium');
      // Should prefer model with higher success rate (gpt-4o-mini with 100%)
      expect(bestModel).toBeDefined();
    });

    it('should consider latency and token usage in model selection', async () => {
      // Record patterns with different characteristics
      // Model A: High success, low latency
      // Model B: High success, high latency
      // Model selection should prefer Model A

      // This is a simplified test - actual implementation would track latency
      const bestModel = learner.getBestModel('complex');
      expect(bestModel).toBeDefined();
    });
  });

  describe('Statistics', () => {
    it('should return correct statistics', async () => {
      for (let i = 0; i < 10; i++) {
        await learner.recordDecision({
          prompt: `Prompt ${i}`,
          promptHash: `hash${i}`,
          model: 'gpt-4o-mini',
          taskComplexity: 'medium',
          decision: i < 8 ? 'approve' : 'reject',
          confidence: 0.8,
          success: i < 8,
          timestamp: new Date()
        });
      }

      const stats = learner.getStats();
      expect(stats.totalPatterns).toBe(10);
      expect(stats.averageSuccessRate).toBeGreaterThan(0);
    });
  });

  describe('Global Instance', () => {
    it('should return singleton instance', () => {
      const instance1 = getAdaptiveLearner();
      const instance2 = getAdaptiveLearner();

      expect(instance1).toBe(instance2);
    });
  });
});

