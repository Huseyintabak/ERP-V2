/**
 * Agent Health Monitoring
 * Tracks agent performance metrics: uptime, error rate, latency, success rate, token usage
 */

import { agentLogger } from './logger';
import { createAdminClient } from '@/lib/supabase/server';

export interface HealthMetrics {
  uptime: number;                    // Uptime percentage (0-100)
  errorRate: number;                 // Error rate percentage (0-100)
  latency: number;                   // Average latency in milliseconds
  successRate: number;               // Success rate percentage (0-100)
  tokenUsage: {
    total: number;                   // Total tokens used
    average: number;                 // Average tokens per request
    peak: number;                    // Peak token usage
  };
  requestCount: number;              // Total requests
  errorCount: number;                // Total errors
  successCount: number;              // Total successes
  lastRequestTime?: Date;            // Last request timestamp
  lastErrorTime?: Date;              // Last error timestamp
  lastSuccessTime?: Date;            // Last success timestamp
}

export interface AgentHealthStatus {
  agent: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  metrics: HealthMetrics;
  timestamp: Date;
}

/**
 * Health Monitor Class
 * Tracks and manages health metrics for each agent
 */
export class HealthMonitor {
  private metrics: Map<string, HealthMetrics> = new Map();
  private readonly WINDOW_SIZE = 100; // Last N requests to track
  private readonly HEALTH_THRESHOLDS = {
    errorRate: 10,      // >10% error rate = degraded
    latency: 5000,      // >5s latency = degraded
    successRate: 90     // <90% success rate = degraded
  };

  /**
   * Record a request
   */
  async recordRequest(
    agent: string,
    success: boolean,
    latency: number,
    tokensUsed?: number,
    error?: string
  ): Promise<void> {
    const current = this.metrics.get(agent) || this.getDefaultMetrics();
    
    // Update metrics
    current.requestCount++;
    current.lastRequestTime = new Date();
    
    if (success) {
      current.successCount++;
      current.lastSuccessTime = new Date();
    } else {
      current.errorCount++;
      current.lastErrorTime = new Date();
    }
    
    // Update latency (moving average)
    current.latency = (current.latency * (current.requestCount - 1) + latency) / current.requestCount;
    
    // Update token usage
    if (tokensUsed !== undefined) {
      current.tokenUsage.total += tokensUsed;
      current.tokenUsage.average = current.tokenUsage.total / current.requestCount;
      if (tokensUsed > current.tokenUsage.peak) {
        current.tokenUsage.peak = tokensUsed;
      }
    }
    
    // Calculate rates
    current.errorRate = (current.errorCount / current.requestCount) * 100;
    current.successRate = (current.successCount / current.requestCount) * 100;
    
    // Calculate uptime (percentage of time agent is available)
    // Simplified: if error rate < threshold, uptime is high
    current.uptime = Math.max(0, 100 - current.errorRate);
    
    this.metrics.set(agent, current);
    
    // Save to database (async, non-blocking)
    this.saveToDatabase(agent, current).catch(error => {
      // Silent fail - database save should not block requests
      if (process.env.NODE_ENV === 'development') {
        console.warn('Failed to save health metrics to database:', error);
      }
    });
  }

  /**
   * Get health metrics for an agent
   */
  getMetrics(agent: string): HealthMetrics | null {
    return this.metrics.get(agent) || null;
  }

  /**
   * Get health status for an agent
   */
  getHealthStatus(agent: string): AgentHealthStatus {
    const metrics = this.getMetrics(agent) || this.getDefaultMetrics();
    
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    
    if (metrics.errorRate > this.HEALTH_THRESHOLDS.errorRate ||
        metrics.latency > this.HEALTH_THRESHOLDS.latency ||
        metrics.successRate < this.HEALTH_THRESHOLDS.successRate) {
      status = 'degraded';
    }
    
    // Critical thresholds
    if (metrics.errorRate > 50 || metrics.successRate < 50) {
      status = 'unhealthy';
    }
    
    // Alert if unhealthy
    if (status === 'unhealthy') {
      this.sendAlert(agent, metrics).catch(error => {
        // Silent fail - alerting should not block requests
        if (process.env.NODE_ENV === 'development') {
          console.warn('Failed to send health alert:', error);
        }
      });
    }
    
    return {
      agent,
      status,
      metrics,
      timestamp: new Date()
    };
  }

  /**
   * Send alert for unhealthy agent
   */
  private async sendAlert(agent: string, metrics: HealthMetrics): Promise<void> {
    try {
      // Log critical health alert
      await agentLogger.error({
        agent: 'Health Monitor',
        action: 'agent_unhealthy_alert',
        data: {
          unhealthyAgent: agent,
          metrics,
          threshold: this.HEALTH_THRESHOLDS,
          timestamp: new Date().toISOString()
        }
      });
      
      // Developer Agent'a da rapor gönder (async, non-blocking)
      try {
        const { DeveloperAgent } = await import('../agents/developer-agent');
        const developerAgent = new DeveloperAgent();
        await developerAgent.askAgent(
          'Developer Agent',
          `Agent Health Alert: ${agent} is UNHEALTHY. Metrics: Error Rate: ${metrics.errorRate.toFixed(2)}%, Success Rate: ${metrics.successRate.toFixed(2)}%, Latency: ${metrics.latency.toFixed(0)}ms`,
          {
            alertType: 'agent_unhealthy',
            agent,
            metrics,
            timestamp: new Date().toISOString()
          }
        ).catch(() => {
          // Silent fail - Developer Agent'a raporlama optional
        });
      } catch (error) {
        // Silent fail - Developer Agent alerting optional
      }
    } catch (error: any) {
      // Silent fail - alerting should not block requests
      throw error;
    }
  }

  /**
   * Get all agents' health status
   */
  getAllHealthStatuses(): Record<string, AgentHealthStatus> {
    const statuses: Record<string, AgentHealthStatus> = {};
    this.metrics.forEach((_, agent) => {
      statuses[agent] = this.getHealthStatus(agent);
    });
    return statuses;
  }

  /**
   * Reset metrics for an agent
   */
  reset(agent: string): void {
    this.metrics.set(agent, this.getDefaultMetrics());
  }

  /**
   * Reset all metrics
   */
  resetAll(): void {
    this.metrics.clear();
  }

  /**
   * Get default metrics
   */
  private getDefaultMetrics(): HealthMetrics {
    return {
      uptime: 100,
      errorRate: 0,
      latency: 0,
      successRate: 100,
      tokenUsage: {
        total: 0,
        average: 0,
        peak: 0
      },
      requestCount: 0,
      errorCount: 0,
      successCount: 0
    };
  }

  /**
   * Save metrics to database
   */
  private async saveToDatabase(agent: string, metrics: HealthMetrics): Promise<void> {
    try {
      const supabase = createAdminClient();
      
      // Find latest log entry for this agent to update
      const { data: latestLog } = await supabase
        .from('agent_logs')
        .select('id')
        .eq('agent', agent)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (latestLog) {
        // Update latest log entry with health metrics
        await supabase
          .from('agent_logs')
          .update({
            health_metrics: metrics
          })
          .eq('id', latestLog.id);
      } else {
        // If no log entry exists, create a new one
        await supabase
          .from('agent_logs')
          .insert({
            agent,
            action: 'health_metrics_update',
            level: 'info',
            data: {
              metrics,
              timestamp: new Date().toISOString()
            },
            health_metrics: metrics
          });
      }
    } catch (error: any) {
      // Silent fail - database save should not block requests
      throw error;
    }
  }
}

/**
 * Global health monitor instance
 */
let healthMonitorInstance: HealthMonitor | null = null;

/**
 * Get global health monitor instance
 */
export function getHealthMonitor(): HealthMonitor {
  if (!healthMonitorInstance) {
    healthMonitorInstance = new HealthMonitor();
  }
  return healthMonitorInstance;
}

