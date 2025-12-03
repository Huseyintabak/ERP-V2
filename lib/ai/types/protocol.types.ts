/**
 * Zero Error Protocol Types
 * 5 katmanlı doğrulama sistemi için type definitions
 */

import { AgentDecision } from './agent.types';

export interface ProtocolResult {
  decision: AgentDecision;
  layers: {
    layer1?: LayerResult;
    layer2?: LayerResult;
    layer3?: LayerResult;
    layer4?: LayerResult;
    layer5?: LayerResult;
  };
  finalDecision: 'approved' | 'rejected' | 'pending_approval';
  errors: string[];
  warnings: string[];
}

export interface LayerResult {
  isValid: boolean; // Layer geçti mi?
  details?: any;
  errors?: string[];
  warnings?: string[];
  // Layer 3 (Consensus) için ek alanlar
  approvalRate?: number;
  totalVotes?: number;
  approveVotes?: number;
  rejectVotes?: number;
  conditionalVotes?: number;
  agentOpinions?: Array<{
    agent: string;
    vote: 'approve' | 'reject' | 'conditional';
    confidence: number;
    reasoning: string;
    conditions?: string[];
  }>;
  conditions?: string[];
}


