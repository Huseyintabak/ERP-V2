/**
 * Orchestrator Integration Test
 * Agent'lar arası konuşma, Zero Error Protocol ve Consensus Engine testleri
 */

import { AgentOrchestrator } from '../orchestrator';
import { AgentEventBus } from '../event-bus';

describe('Agent Orchestrator Integration', () => {
  let orchestrator: AgentOrchestrator;
  let eventBus: AgentEventBus;

  beforeAll(() => {
    // Debug: Environment variable'ları kontrol et
    console.log('🔍 Test Environment Check:');
    console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
    
    // Orchestrator'ı başlat
    orchestrator = AgentOrchestrator.getInstance();
    eventBus = AgentEventBus.getInstance();
  });

  afterAll(() => {
    // Cleanup
    eventBus.clear();
  });

  test('Orchestrator should be initialized with all agents', () => {
    expect(orchestrator).toBeDefined();
    
    // Tüm agent'ların kayıtlı olduğunu kontrol et
    const agents = orchestrator.getAllAgents();
    expect(agents.length).toBeGreaterThan(0);
    
    // Beklenen agent'ları kontrol et
    const agentRoles = agents.map(a => a.role);
    expect(agentRoles).toContain('planning');
    expect(agentRoles).toContain('warehouse');
    expect(agentRoles).toContain('production');
    expect(agentRoles).toContain('purchase');
    expect(agentRoles).toContain('manager');
    expect(agentRoles).toContain('developer');
  });

  test('Orchestrator should start conversation with Planning Agent', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }
    console.log('✅ Running API test with OPENAI_API_KEY');

    const result = await orchestrator.startConversation('planning', {
      id: 'test_conv_planning_1',
      prompt: 'Bu siparişi onaylamak istiyorum: Order #123',
      type: 'request',
      context: {
        orderId: 'test-order-uuid',
        orderNumber: 'ORD-123'
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toMatch(/approved|rejected|pending_approval|conditional/);
    expect(result.protocolResult).toBeDefined();
    expect(result.conversation).toBeDefined();
    expect(result.conversation.id).toBe('test_conv_planning_1');
    // Status completed veya failed olabilir (protocol sonucuna göre)
    expect(['completed', 'failed']).toContain(result.conversation.status);
    expect(result.conversation.responses.length).toBeGreaterThan(0);
  }, 30000);

  test('Orchestrator should start conversation with Warehouse Agent', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const result = await orchestrator.startConversation('warehouse', {
      id: 'test_conv_warehouse_1',
      prompt: 'Bu stok hareketini doğrula: giris - 100 raw',
      type: 'validation',
      context: {
        materialType: 'raw',
        materialId: 'test-material-uuid',
        movementType: 'giris',
        quantity: 100
      },
      urgency: 'medium',
      severity: 'medium'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toMatch(/approved|rejected|pending_approval|conditional/);
    expect(result.protocolResult).toBeDefined();
    expect(result.conversation).toBeDefined();
    expect(result.conversation.responses.length).toBeGreaterThan(0);
  }, 30000);

  test('Orchestrator should start conversation with Production Agent', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const result = await orchestrator.startConversation('production', {
      id: 'test_conv_production_1',
      prompt: 'Bu üretim kaydını doğrula: Plan #456, Üretilen: 10 adet',
      type: 'validation',
      context: {
        planId: 'test-plan-uuid',
        quantity_produced: 10
      },
      urgency: 'high',
      severity: 'medium'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toMatch(/approved|rejected|pending_approval|conditional/);
    expect(result.protocolResult).toBeDefined();
    expect(result.conversation).toBeDefined();
  }, 30000);

  test('Orchestrator should execute Zero Error Protocol', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const result = await orchestrator.startConversation('planning', {
      id: 'test_conv_protocol_1',
      prompt: 'Sipariş onayı için Zero Error Protocol testi',
      type: 'request',
      context: {
        orderId: 'test-order-uuid',
        testMode: true
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    // Protocol result yapısını kontrol et
    const protocol = result.protocolResult;
    expect(protocol).toHaveProperty('layers');
    expect(protocol).toHaveProperty('finalDecision');
    expect(protocol).toHaveProperty('errors');
    expect(protocol).toHaveProperty('warnings');
    
    // Layers kontrolü
    if (protocol.layers && protocol.layers.length > 0) {
      protocol.layers.forEach((layer: any) => {
        expect(layer).toHaveProperty('layer');
        expect(layer).toHaveProperty('status');
      });
    }
  }, 30000);

  test('Orchestrator should handle conversation history', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const conversationId = 'test_conv_history_1';
    
    // İlk konuşma
    const result1 = await orchestrator.startConversation('planning', {
      id: conversationId,
      prompt: 'İlk konuşma',
      type: 'query',
      context: {},
      urgency: 'low'
    });

    expect(result1).toBeDefined();
    expect(result1.conversation.id).toBe(conversationId);

    // Conversation history'yi kontrol et
    const history = orchestrator.getConversationHistory(conversationId);
    expect(history).toBeDefined();
    expect(history?.id).toBe(conversationId);
    expect(history?.responses.length).toBeGreaterThan(0);
  }, 30000);

  test('Orchestrator should handle invalid agent role', async () => {
    await expect(
      orchestrator.startConversation('invalid_agent', {
        id: 'test_conv_invalid_1',
        prompt: 'Test',
        type: 'query',
        context: {}
      })
    ).rejects.toThrow('Agent not found: invalid_agent');
  });

  test('Orchestrator should get all conversations', () => {
    const conversations = orchestrator.getAllConversations();
    expect(Array.isArray(conversations)).toBe(true);
  });

  test('Orchestrator should handle multiple concurrent conversations', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Aynı anda birden fazla konuşma başlat
    const promises = [
      orchestrator.startConversation('planning', {
        id: 'test_conv_concurrent_1',
        prompt: 'Concurrent test 1',
        type: 'query',
        context: {},
        urgency: 'low'
      }),
      orchestrator.startConversation('warehouse', {
        id: 'test_conv_concurrent_2',
        prompt: 'Concurrent test 2',
        type: 'query',
        context: {},
        urgency: 'low'
      }),
      orchestrator.startConversation('production', {
        id: 'test_conv_concurrent_3',
        prompt: 'Concurrent test 3',
        type: 'query',
        context: {},
        urgency: 'low'
      })
    ];

    const results = await Promise.all(promises);

    // Tüm konuşmaların başarılı olduğunu kontrol et
    results.forEach((result, index) => {
      expect(result).toBeDefined();
      expect(result.finalDecision).toBeDefined();
      expect(result.conversation.id).toBe(`test_conv_concurrent_${index + 1}`);
    });
  }, 60000); // 60 saniye timeout (birden fazla API çağrısı için)
});

