/**
 * Test Utilities
 * Test helper functions and mock factories
 */

import { createTestClient } from '@/lib/supabase/test-client';
import { BaseAgent } from '@/lib/ai/agents/base-agent';
import { AgentRequest, AgentResponse } from '@/lib/ai/types/agent.types';
import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Mock Supabase Client
 * Test ortamında kullanılacak mock Supabase client
 */
export function createMockSupabaseClient(): Partial<SupabaseClient> {
  const mockSelect = jest.fn().mockReturnThis();
  const mockQuery = {
    select: mockSelect,
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    neq: jest.fn().mockReturnThis(),
    gt: jest.fn().mockReturnThis(),
    gte: jest.fn().mockReturnThis(),
    lt: jest.fn().mockReturnThis(),
    lte: jest.fn().mockReturnThis(),
    like: jest.fn().mockReturnThis(),
    ilike: jest.fn().mockReturnThis(),
    is: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    contains: jest.fn().mockReturnThis(),
    or: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    range: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: null, error: null }),
    maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    then: jest.fn((cb) => cb({ data: [], error: null, count: 0 })),
  };

  // select() çağrıldığında mockQuery döndür
  mockSelect.mockReturnValue(mockQuery);

  return {
    from: jest.fn(() => mockQuery),
    rpc: jest.fn().mockResolvedValue({ data: null, error: null }),
    auth: {
      getUser: jest.fn().mockResolvedValue({ data: { user: null }, error: null }),
      getSession: jest.fn().mockResolvedValue({ data: { session: null }, error: null }),
    },
  } as any;
}

/**
 * Real Supabase Client (Test Environment)
 * Gerçek Supabase client oluştur (test database için)
 */
export function createRealSupabaseClient(useServiceRole: boolean = false) {
  return createTestClient(useServiceRole);
}

/**
 * Mock Agent Instance
 * Test için mock agent oluştur
 */
export function createMockAgent(
  name: string = 'Mock Agent',
  role: string = 'mock'
): Partial<BaseAgent> {
  return {
    getInfo: jest.fn(() => ({
      name,
      role,
      responsibilities: [],
    })),
    processRequest: jest.fn().mockResolvedValue({
      agent: name,
      decision: 'approve',
      confidence: 0.9,
      reasoning: 'Mock reasoning',
      timestamp: new Date(),
      suggestions: [],
      issues: [],
    } as AgentResponse),
    validateWithOtherAgents: jest.fn().mockResolvedValue({
      isValid: true,
      confidence: 0.9,
      issues: [],
    }),
  } as any;
}

/**
 * Test Data Factories
 */

/**
 * Mock Order Data
 */
export function createMockOrder(overrides: Partial<any> = {}) {
  return {
    id: 'test-order-uuid',
    order_number: 'ORD-2025-001',
    customer_name: 'Test Customer',
    product_id: 'test-product-uuid',
    quantity: 10,
    delivery_date: new Date().toISOString().split('T')[0],
    priority: 'orta',
    status: 'beklemede',
    created_by: 'test-user-uuid',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock Production Plan Data
 */
export function createMockProductionPlan(overrides: Partial<any> = {}) {
  return {
    id: 'test-plan-uuid',
    order_id: 'test-order-uuid',
    product_id: 'test-product-uuid',
    planned_quantity: 10,
    produced_quantity: 0,
    status: 'planlandi',
    assigned_operator_id: null,
    started_at: null,
    completed_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock Raw Material Data
 */
export function createMockRawMaterial(overrides: Partial<any> = {}) {
  return {
    id: 'test-raw-material-uuid',
    code: 'HM-001',
    name: 'Test Hammadde',
    barcode: '1234567890001',
    quantity: 100,
    reserved_quantity: 0,
    critical_level: 10,
    unit: 'kg',
    unit_price: 50.0,
    description: 'Test hammadde açıklaması',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock Finished Product Data
 */
export function createMockFinishedProduct(overrides: Partial<any> = {}) {
  return {
    id: 'test-finished-product-uuid',
    code: 'NU-001',
    name: 'Test Nihai Ürün',
    barcode: '3234567890001',
    quantity: 25,
    reserved_quantity: 0,
    critical_level: 5,
    unit: 'adet',
    sale_price: 500.0,
    description: 'Test nihai ürün açıklaması',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock Agent Request
 */
export function createMockAgentRequest(overrides: Partial<AgentRequest> = {}): AgentRequest {
  return {
    id: 'test-request-1',
    prompt: 'Test request prompt',
    type: 'request',
    context: {},
    urgency: 'medium',
    severity: 'medium',
    ...overrides,
  };
}

/**
 * Mock Agent Response
 */
export function createMockAgentResponse(overrides: Partial<AgentResponse> = {}): AgentResponse {
  return {
    agent: 'Mock Agent',
    decision: 'approve',
    confidence: 0.9,
    reasoning: 'Mock reasoning',
    timestamp: new Date(),
    suggestions: [],
    issues: [],
    ...overrides,
  };
}

/**
 * Mock User Data
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    id: 'test-user-uuid',
    email: 'test@example.com',
    name: 'Test User',
    role: 'planlama',
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Mock Operator Data
 */
export function createMockOperator(overrides: Partial<any> = {}) {
  return {
    id: 'test-operator-uuid',
    series: 'thunder',
    experience_years: 5,
    daily_capacity: 46,
    location: 'Üretim Salonu A',
    hourly_rate: 25,
    active_productions_count: 0,
    ...overrides,
  };
}

/**
 * Mock BOM Data
 */
export function createMockBOM(overrides: Partial<any> = {}) {
  return {
    id: 'test-bom-uuid',
    finished_product_id: 'test-finished-product-uuid',
    material_type: 'raw',
    material_id: 'test-raw-material-uuid',
    quantity_needed: 10,
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

/**
 * Wait helper for async operations
 */
export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Mock OpenAI Response
 */
export function createMockOpenAIResponse(content: string = '{"decision": "approve", "confidence": 0.9}') {
  return {
    id: 'chatcmpl-test',
    object: 'chat.completion',
    created: Math.floor(Date.now() / 1000),
    model: 'gpt-4o',
    choices: [
      {
        index: 0,
        message: {
          role: 'assistant' as const,
          content,
        },
        finish_reason: 'stop',
      },
    ],
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
    },
  };
}

/**
 * Setup test environment
 */
export function setupTestEnvironment() {
  // Set test environment variables
  process.env.NODE_ENV = 'test';
  process.env.AGENT_ENABLED = 'true';
  process.env.AGENT_LOGGING_ENABLED = 'true';
  
  // Mock console methods to reduce noise in tests
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

/**
 * Cleanup test environment
 */
export function cleanupTestEnvironment() {
  jest.clearAllMocks();
  jest.restoreAllMocks();
}

