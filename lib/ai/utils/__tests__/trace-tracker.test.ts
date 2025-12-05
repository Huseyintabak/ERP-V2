/**
 * Trace Tracker Tests
 * Tests for conversation flow tracking, decision path visualization, and performance bottleneck identification
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { TraceTracker, getTraceTracker } from '../trace-tracker';

// Mock logger
jest.mock('../logger', () => ({
  agentLogger: {
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn()
  }
}));

// Mock Supabase
jest.mock('@/lib/supabase/server', () => ({
  createAdminClient: jest.fn(() => ({
    from: jest.fn(() => ({
      select: jest.fn(() => ({
        eq: jest.fn(() => ({
          order: jest.fn(() => ({
            limit: jest.fn(() => ({
              single: jest.fn(() => Promise.resolve({ data: null, error: null }))
            }))
          }))
        })),
        insert: jest.fn(() => Promise.resolve({ data: null, error: null })),
        update: jest.fn(() => ({
          eq: jest.fn(() => Promise.resolve({ data: null, error: null }))
        }))
      }))
    }))
  }))
}));

describe('TraceTracker', () => {
  let tracker: TraceTracker;

  beforeEach(() => {
    tracker = new TraceTracker();
  });

  describe('Conversation Flow Tracking', () => {
    it('should start and end trace nodes', () => {
      tracker.startNode('conv1', 'node1', 'Planning Agent', 'validate_plan');
      
      const activeNodes = (tracker as any).activeNodes;
      expect(activeNodes.has('node1')).toBe(true);
      
      const completedNode = tracker.endNode('node1', 'approve', 0.9);
      expect(completedNode).toBeDefined();
      expect(completedNode?.decision).toBe('approve');
      expect(completedNode?.confidence).toBe(0.9);
      
      // Node is still in activeNodes until completeTrace is called
      const node = activeNodes.get('node1');
      expect(node).toBeDefined(); // Still active until trace is completed
      expect(node?.decision).toBe('approve');
      
      // Complete trace to clean up
      tracker.completeTrace('conv1', 'node1').then(() => {
        const nodeAfterComplete = activeNodes.get('node1');
        expect(nodeAfterComplete).toBeUndefined();
      });
    });

    it('should build conversation trace tree', async () => {
      const conversationId = 'conv1';
      const rootNodeId = 'root';
      
      tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start_conversation');
      
      // Create child nodes and add them to parent
      tracker.startNode(conversationId, 'node1', 'Planning Agent', 'validate_plan');
      tracker.endNode('node1', 'approve', 0.8);
      const node1 = (tracker as any).activeNodes.get('node1') || { id: 'node1', agent: 'Planning Agent', action: 'validate_plan', startTime: new Date(), endTime: new Date(), duration: 10, decision: 'approve', confidence: 0.8 };
      tracker.addChildNode(rootNodeId, node1);
      
      tracker.startNode(conversationId, 'node2', 'Warehouse Agent', 'check_stock');
      tracker.endNode('node2', 'approve', 0.9);
      const node2 = (tracker as any).activeNodes.get('node2') || { id: 'node2', agent: 'Warehouse Agent', action: 'check_stock', startTime: new Date(), endTime: new Date(), duration: 15, decision: 'approve', confidence: 0.9 };
      tracker.addChildNode(rootNodeId, node2);
      
      tracker.endNode(rootNodeId, 'approve', 0.85);
      
      const trace = await tracker.completeTrace(conversationId, rootNodeId);
      
      expect(trace).toBeDefined();
      expect(trace?.conversationId).toBe(conversationId);
      expect(trace?.root.id).toBe(rootNodeId);
      expect(trace?.root.children?.length).toBe(2);
    });

    it('should track decision path', async () => {
      const conversationId = 'conv1';
      const rootNodeId = 'root';
      
      tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start');
      tracker.startNode(conversationId, 'node1', 'Planning Agent', 'validate');
      const node1 = tracker.endNode('node1', 'approve', 0.8);
      if (node1) {
        tracker.addChildNode(rootNodeId, node1);
      }
      tracker.endNode(rootNodeId, 'approve', 0.85);
      
      const trace = await tracker.completeTrace(conversationId, rootNodeId);
      
      expect(trace).toBeDefined();
      expect(trace?.decisionPath).toContain('Planning Agent:approve');
      expect(trace?.decisionPath).toContain('Orchestrator:approve');
    });
  });

  describe('Performance Bottleneck Identification', () => {
    it('should identify slowest agent', async () => {
      const conversationId = 'conv1';
      const rootNodeId = 'root';
      
      tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start');
      
      // Fast agent
      tracker.startNode(conversationId, 'node1', 'Fast Agent', 'quick_task');
      await new Promise(resolve => setTimeout(resolve, 10));
      const node1 = tracker.endNode('node1', 'approve', 0.8);
      if (node1) {
        tracker.addChildNode(rootNodeId, node1);
      }
      
      // Slow agent (bottleneck)
      tracker.startNode(conversationId, 'node2', 'Slow Agent', 'slow_task');
      await new Promise(resolve => setTimeout(resolve, 100));
      const node2 = tracker.endNode('node2', 'approve', 0.9);
      if (node2) {
        tracker.addChildNode(rootNodeId, node2);
      }
      
      tracker.endNode(rootNodeId, 'approve', 0.85);
      
      const trace = await tracker.completeTrace(conversationId, rootNodeId);
      
      expect(trace?.bottleneckAgent).toBe('Slow Agent');
      expect(trace?.bottleneckDuration).toBeGreaterThan(50);
    });

    it('should calculate total duration correctly', async () => {
      const conversationId = 'conv1';
      const rootNodeId = 'root';
      
      tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start');
      
      tracker.startNode(conversationId, 'node1', 'Agent1', 'task1');
      await new Promise(resolve => setTimeout(resolve, 50));
      const node1 = tracker.endNode('node1', 'approve', 0.8);
      if (node1) {
        tracker.addChildNode(rootNodeId, node1);
      }
      
      tracker.startNode(conversationId, 'node2', 'Agent2', 'task2');
      await new Promise(resolve => setTimeout(resolve, 30));
      const node2 = tracker.endNode('node2', 'approve', 0.9);
      if (node2) {
        tracker.addChildNode(rootNodeId, node2);
      }
      
      await new Promise(resolve => setTimeout(resolve, 20));
      tracker.endNode(rootNodeId, 'approve', 0.85);
      
      const trace = await tracker.completeTrace(conversationId, rootNodeId);
      
      expect(trace?.totalDuration).toBeGreaterThan(100);
    });
  });

  describe('Child Node Management', () => {
    it('should add child nodes correctly', () => {
      const parentNodeId = 'parent';
      const childNode = {
        id: 'child',
        agent: 'Child Agent',
        action: 'child_action',
        startTime: new Date(),
        duration: 100
      };
      
      tracker.startNode('conv1', parentNodeId, 'Parent Agent', 'parent_action');
      tracker.addChildNode(parentNodeId, childNode);
      
      const activeNodes = (tracker as any).activeNodes;
      const parent = activeNodes.get(parentNodeId);
      
      expect(parent.children).toBeDefined();
      expect(parent.children.length).toBe(1);
      expect(parent.children[0].id).toBe('child');
    });
  });

  describe('Trace Retrieval', () => {
    it('should retrieve trace by conversation ID', async () => {
      const conversationId = 'conv1';
      const rootNodeId = 'root';
      
      tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start');
      tracker.endNode(rootNodeId, 'approve', 0.9);
      
      await tracker.completeTrace(conversationId, rootNodeId);
      
      const retrieved = tracker.getTrace(conversationId);
      
      expect(retrieved).toBeDefined();
      expect(retrieved?.conversationId).toBe(conversationId);
    });

    it('should return null for non-existent trace', () => {
      const retrieved = tracker.getTrace('non-existent');
      expect(retrieved).toBeNull();
    });
  });

  describe('Performance Statistics', () => {
    it('should calculate performance stats', async () => {
      const conversationId1 = 'conv1';
      const conversationId2 = 'conv2';
      
      // First conversation
      tracker.startNode(conversationId1, 'root1', 'Orchestrator', 'start');
      await new Promise(resolve => setTimeout(resolve, 50));
      tracker.endNode('root1', 'approve', 0.9);
      await tracker.completeTrace(conversationId1, 'root1');
      
      // Second conversation
      tracker.startNode(conversationId2, 'root2', 'Orchestrator', 'start');
      await new Promise(resolve => setTimeout(resolve, 100));
      tracker.endNode('root2', 'approve', 0.85);
      await tracker.completeTrace(conversationId2, 'root2');
      
      const stats = tracker.getPerformanceStats();
      
      expect(stats.totalTraces).toBe(2);
      expect(stats.averageDuration).toBeGreaterThan(0);
    });

    it('should identify common bottlenecks', async () => {
      // Create multiple traces with same bottleneck
      for (let i = 0; i < 3; i++) {
        const conversationId = `conv${i}`;
        const rootNodeId = `root${i}`;
        
        tracker.startNode(conversationId, rootNodeId, 'Orchestrator', 'start');
        
        tracker.startNode(conversationId, `node${i}`, 'Bottleneck Agent', 'slow_task');
        await new Promise(resolve => setTimeout(resolve, 100));
        const childNode = tracker.endNode(`node${i}`, 'approve', 0.8);
        if (childNode) {
          tracker.addChildNode(rootNodeId, childNode);
        }
        
        tracker.endNode(rootNodeId, 'approve', 0.9);
        await tracker.completeTrace(conversationId, rootNodeId);
      }
      
      const stats = tracker.getPerformanceStats();
      
      expect(stats.commonBottlenecks.length).toBeGreaterThan(0);
      expect(stats.commonBottlenecks[0].agent).toBe('Bottleneck Agent');
      expect(stats.commonBottlenecks[0].count).toBeGreaterThanOrEqual(3);
    });
  });

  describe('Global Instance', () => {
    it('should return singleton instance', () => {
      const instance1 = getTraceTracker();
      const instance2 = getTraceTracker();

      expect(instance1).toBe(instance2);
    });
  });
});

