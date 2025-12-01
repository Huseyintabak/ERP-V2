/**
 * Agent Message Types
 * Agent'lar arası mesajlaşma için type definitions
 */

import { AgentResponse, ConsensusResult } from './agent.types';
import { ProtocolResult } from './protocol.types';

export interface AgentMessage {
  id: string;
  from: string;
  to: string | 'broadcast';
  type: 'query' | 'request' | 'response' | 'notification' | 'alert';
  content: string;
  data?: any;
  context?: {
    conversationId?: string;
    previousMessages?: AgentMessage[];
    urgency?: 'low' | 'medium' | 'high' | 'critical';
  };
  timestamp: Date;
}

export interface ConversationMessage {
  agent: string;
  message: string;
  response: AgentResponse;
  timestamp: Date;
}

export interface ConversationResult {
  initiator: string;
  finalDecision: 'approved' | 'rejected' | 'pending_approval';
  agentConversations: ConversationMessage[];
  consensus: ConsensusResult;
  protocolResult: ProtocolResult;
}

