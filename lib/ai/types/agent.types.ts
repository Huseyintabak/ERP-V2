/**
 * Agent Request/Response Types
 * Multi-Agent AI System için temel type definitions
 */

export interface AgentRequest {
  id: string;
  prompt: string;
  type: 'query' | 'request' | 'analysis' | 'validation';
  context?: Record<string, any>;
  urgency?: 'low' | 'medium' | 'high' | 'critical';
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentResponse {
  id: string;
  agent: string;
  decision: 'approve' | 'reject' | 'conditional' | 'pending';
  action?: string;
  data?: any;
  reasoning: string;
  confidence: number; // 0-1
  issues?: string[];
  recommendations?: string[];
  timestamp: Date;
}

export interface ValidationResult {
  isValid: boolean;
  issues: string[];
  recommendations: string[];
  confidence: number;
}

export interface AgentDecision {
  agent: string;
  action: string;
  data: any;
  reasoning: string;
  confidence: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
}

export interface Vote {
  agent: string;
  vote: 'approve' | 'reject' | 'conditional';
  confidence: number;
  reasoning: string;
  conditions?: string[];
}

export interface ConsensusResult {
  isConsensus: boolean;
  approvalRate: number;
  totalVotes: number;
  approveVotes: number;
  rejectVotes: number;
  conditionalVotes: number;
  conditions: string[];
  agentOpinions: Vote[];
}


