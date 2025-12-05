/**
 * Distributed Tracing System
 * Tracks conversation flow, decision paths, and performance bottlenecks
 */

import { agentLogger } from './logger';
import { createAdminClient } from '@/lib/supabase/server';

export interface TraceNode {
  id: string;
  agent: string;
  action: string;
  startTime: Date;
  endTime?: Date;
  duration?: number;
  decision?: 'approve' | 'reject' | 'conditional' | 'pending';
  confidence?: number;
  children?: TraceNode[];
  metadata?: Record<string, any>;
}

export interface ConversationTrace {
  conversationId: string;
  root: TraceNode;
  totalDuration: number;
  bottleneckAgent?: string;
  bottleneckDuration?: number;
  decisionPath: string[];
  timestamp: Date;
}

/**
 * Trace Tracker Class
 * Builds conversation trees and identifies performance bottlenecks
 */
export class TraceTracker {
  private traces: Map<string, ConversationTrace> = new Map();
  private activeNodes: Map<string, TraceNode> = new Map(); // Track active operations

  /**
   * Start a trace node
   */
  startNode(
    conversationId: string,
    nodeId: string,
    agent: string,
    action: string,
    metadata?: Record<string, any>
  ): void {
    const node: TraceNode = {
      id: nodeId,
      agent,
      action,
      startTime: new Date(),
      metadata
    };
    
    this.activeNodes.set(nodeId, node);
  }

  /**
   * End a trace node
   * Returns the completed node (doesn't delete from activeNodes until completeTrace is called)
   */
  endNode(
    nodeId: string,
    decision?: 'approve' | 'reject' | 'conditional' | 'pending',
    confidence?: number
  ): TraceNode | null {
    const node = this.activeNodes.get(nodeId);
    if (!node) {
      return null;
    }
    
    node.endTime = new Date();
    node.duration = node.endTime.getTime() - node.startTime.getTime();
    node.decision = decision;
    node.confidence = confidence;
    
    // Don't delete from activeNodes yet - might need to add as child
    // Will be cleaned up in completeTrace
    return node;
  }

  /**
   * Add child node to parent
   */
  addChildNode(parentNodeId: string, childNode: TraceNode): void {
    const parent = this.activeNodes.get(parentNodeId);
    if (!parent) {
      // Try to find in existing traces
      for (const trace of this.traces.values()) {
        const found = this.findNode(trace.root, parentNodeId);
        if (found) {
          found.children = found.children || [];
          found.children.push(childNode);
          return;
        }
      }
      return;
    }
    
    parent.children = parent.children || [];
    parent.children.push(childNode);
  }

  /**
   * Complete a conversation trace
   */
  async completeTrace(
    conversationId: string,
    rootNodeId: string
  ): Promise<ConversationTrace | null> {
    const root = this.activeNodes.get(rootNodeId);
    if (!root) {
      return null;
    }
    
    // Deep clone root node to preserve children structure
    const rootClone = this.cloneNode(root);
    
    // Build trace tree from cloned root
    const trace = this.buildTrace(conversationId, rootClone);
    
    // Identify bottlenecks
    this.identifyBottlenecks(trace);
    
    // Store trace
    this.traces.set(conversationId, trace);
    
    // Save to database (async, non-blocking)
    this.saveToDatabase(trace).catch(error => {
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save trace to database:', error);
      }
    });
    
    // Cleanup - remove all nodes for this conversation
    this.cleanupNodes(conversationId, rootNodeId);
    
    return trace;
  }

  /**
   * Clone a node and its children recursively
   */
  private cloneNode(node: TraceNode): TraceNode {
    const cloned: TraceNode = {
      id: node.id,
      agent: node.agent,
      action: node.action,
      startTime: node.startTime,
      endTime: node.endTime,
      duration: node.duration,
      decision: node.decision,
      confidence: node.confidence,
      metadata: node.metadata ? { ...node.metadata } : undefined,
      children: node.children ? node.children.map(child => this.cloneNode(child)) : undefined
    };
    return cloned;
  }

  /**
   * Cleanup all nodes for a conversation
   */
  private cleanupNodes(conversationId: string, rootNodeId: string): void {
    // Remove root node
    this.activeNodes.delete(rootNodeId);
    
    // Remove all child nodes that might still be active
    // Find and remove any nodes that were part of this conversation
    const nodesToRemove: string[] = [];
    this.activeNodes.forEach((node, nodeId) => {
      // Check if this node was a child of the root (by checking metadata or conversation context)
      // For now, we'll keep it simple and just remove the root
      // Child nodes should have been added as children and won't be in activeNodes
    });
    
    nodesToRemove.forEach(nodeId => this.activeNodes.delete(nodeId));
  }

  /**
   * Build trace tree from root node
   */
  private buildTrace(conversationId: string, root: TraceNode): ConversationTrace {
    // Calculate total duration
    const totalDuration = this.calculateTotalDuration(root);
    
    // Extract decision path
    const decisionPath = this.extractDecisionPath(root);
    
    return {
      conversationId,
      root,
      totalDuration,
      decisionPath,
      timestamp: new Date()
    };
  }

  /**
   * Calculate total duration of trace tree
   */
  private calculateTotalDuration(node: TraceNode): number {
    let duration = node.duration || 0;
    
    if (node.children) {
      for (const child of node.children) {
        duration += this.calculateTotalDuration(child);
      }
    }
    
    return duration;
  }

  /**
   * Extract decision path from trace tree
   */
  private extractDecisionPath(node: TraceNode): string[] {
    const path: string[] = [];
    
    if (node.decision) {
      path.push(`${node.agent}:${node.decision}`);
    }
    
    if (node.children) {
      for (const child of node.children) {
        path.push(...this.extractDecisionPath(child));
      }
    }
    
    return path;
  }

  /**
   * Identify performance bottlenecks
   */
  private identifyBottlenecks(trace: ConversationTrace): void {
    let maxDuration = 0;
    let bottleneckNode: TraceNode | null = null;
    
    const findBottleneck = (node: TraceNode, isRoot: boolean = false) => {
      // Check children first (they represent actual agent work)
      // Only check root if no children exist or root has significant duration
      if (node.children && node.children.length > 0) {
        // Prioritize children over root
        for (const child of node.children) {
          findBottleneck(child, false);
        }
      }
      
      // Check this node's duration (but prefer children if they exist)
      if (node.duration && node.duration > maxDuration) {
        // If this is root and has children, only consider it if it's significantly longer
        if (!isRoot || !node.children || node.children.length === 0) {
          maxDuration = node.duration;
          bottleneckNode = node;
        }
      }
    };
    
    // Start from root
    findBottleneck(trace.root, true);
    
    if (bottleneckNode) {
      trace.bottleneckAgent = bottleneckNode.agent;
      trace.bottleneckDuration = bottleneckNode.duration || 0;
    }
  }

  /**
   * Find node in tree by ID
   */
  private findNode(node: TraceNode, nodeId: string): TraceNode | null {
    if (node.id === nodeId) {
      return node;
    }
    
    if (node.children) {
      for (const child of node.children) {
        const found = this.findNode(child, nodeId);
        if (found) {
          return found;
        }
      }
    }
    
    return null;
  }

  /**
   * Get trace for conversation
   */
  getTrace(conversationId: string): ConversationTrace | null {
    return this.traces.get(conversationId) || null;
  }

  /**
   * Save trace to database
   */
  private async saveToDatabase(trace: ConversationTrace): Promise<void> {
    try {
      const supabase = createAdminClient();
      
      // Find latest log entry for this conversation to update
      const { data: latestLog } = await supabase
        .from('agent_logs')
        .select('id')
        .eq('conversation_id', trace.conversationId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestLog) {
        // Update latest log entry with trace tree
        await supabase
          .from('agent_logs')
          .update({
            trace_tree: {
              root: trace.root,
              totalDuration: trace.totalDuration,
              bottleneckAgent: trace.bottleneckAgent,
              bottleneckDuration: trace.bottleneckDuration,
              decisionPath: trace.decisionPath,
              timestamp: trace.timestamp.toISOString()
            }
          })
          .eq('id', latestLog.id);
      } else {
        // If no log entry exists, create a new one
        await supabase
          .from('agent_logs')
          .insert({
            agent: 'Trace Tracker',
            action: 'conversation_trace_completed',
            level: 'info',
            conversation_id: trace.conversationId,
            data: {
              trace,
              timestamp: new Date().toISOString()
            },
            trace_tree: {
              root: trace.root,
              totalDuration: trace.totalDuration,
              bottleneckAgent: trace.bottleneckAgent,
              bottleneckDuration: trace.bottleneckDuration,
              decisionPath: trace.decisionPath,
              timestamp: trace.timestamp.toISOString()
            }
          });
      }
    } catch (error: any) {
      // Silent fail - trace saving should not block requests
      throw error;
    }
  }

  /**
   * Get performance statistics
   */
  getPerformanceStats(): {
    totalTraces: number;
    averageDuration: number;
    commonBottlenecks: Array<{ agent: string; count: number; avgDuration: number }>;
  } {
    const traces = Array.from(this.traces.values());
    
    if (traces.length === 0) {
      return {
        totalTraces: 0,
        averageDuration: 0,
        commonBottlenecks: []
      };
    }
    
    const averageDuration = traces.reduce(
      (sum, t) => sum + t.totalDuration,
      0
    ) / traces.length;
    
    // Count bottlenecks by agent
    const bottleneckCounts: Record<string, { count: number; totalDuration: number }> = {};
    traces.forEach(trace => {
      if (trace.bottleneckAgent) {
        if (!bottleneckCounts[trace.bottleneckAgent]) {
          bottleneckCounts[trace.bottleneckAgent] = { count: 0, totalDuration: 0 };
        }
        bottleneckCounts[trace.bottleneckAgent].count++;
        bottleneckCounts[trace.bottleneckAgent].totalDuration += trace.bottleneckDuration || 0;
      }
    });
    
    const commonBottlenecks = Object.entries(bottleneckCounts)
      .map(([agent, stats]) => ({
        agent,
        count: stats.count,
        avgDuration: stats.totalDuration / stats.count
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5); // Top 5
    
    return {
      totalTraces: traces.length,
      averageDuration,
      commonBottlenecks
    };
  }
}

// Global instance
let traceTrackerInstance: TraceTracker | null = null;

/**
 * Get global trace tracker instance
 */
export function getTraceTracker(): TraceTracker {
  if (!traceTrackerInstance) {
    traceTrackerInstance = new TraceTracker();
  }
  return traceTrackerInstance;
}

