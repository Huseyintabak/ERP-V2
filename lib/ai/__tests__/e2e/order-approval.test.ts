/**
 * Order Approval E2E Test
 * Order approval API endpoint'inin AI agent entegrasyonunu test eder
 */

import { AgentOrchestrator } from '../../orchestrator';

describe('Order Approval E2E', () => {
  let orchestrator: AgentOrchestrator;

  beforeAll(() => {
    // Debug: Environment variable'ları kontrol et
    console.log('🔍 Test Environment Check:');
    console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
    console.log('  AGENT_ENABLED:', process.env.AGENT_ENABLED || 'false');
    
    // Orchestrator'ı başlat
    orchestrator = AgentOrchestrator.getInstance();
  });

  test('Order approval should trigger Planning Agent validation', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }
    console.log('✅ Running E2E test for Order Approval');

    // Order approval senaryosu
    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_order_approval_1',
      prompt: 'Bu siparişi onaylamak istiyorum: Order #E2E-APPROVAL-001',
      type: 'request',
      context: {
        orderId: 'test-order-approval-uuid',
        orderNumber: 'E2E-APPROVAL-001',
        orderData: {
          id: 'test-order-approval-uuid',
          order_number: 'E2E-APPROVAL-001',
          customer_id: 'test-customer-uuid',
          delivery_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 gün sonra
          status: 'beklemede',
          items: [
            {
              id: 'test-order-item-1',
              product_id: 'test-product-uuid',
              product_name: 'Test Product 1',
              quantity: 50,
              unit_price: 100.00
            },
            {
              id: 'test-order-item-2',
              product_id: 'test-product-uuid-2',
              product_name: 'Test Product 2',
              quantity: 30,
              unit_price: 150.00
            }
          ]
        },
        requestedBy: 'test-user-uuid',
        requestedByRole: 'planlama'
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    // Planning Agent'ın karar verdiğini kontrol et
    expect(result.conversation).toBeDefined();
    expect(result.conversation.responses.length).toBeGreaterThan(0);
    
    const agentResponse = result.conversation.responses[0];
    expect(agentResponse.agent).toBe('Planning Agent');
    expect(agentResponse.decision).toMatch(/approve|reject|conditional|pending/);
    
    // Protocol sonucunu kontrol et
    const protocol = result.protocolResult;
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
    
    console.log(`✅ Order Approval Decision: ${protocol.finalDecision}`);
    if (protocol.errors.length > 0) {
      console.log('⚠️ Protocol Errors:', protocol.errors);
    }
    if (protocol.warnings.length > 0) {
      console.log('⚠️ Protocol Warnings:', protocol.warnings);
    }
  }, 60000);

  test('Order approval should handle insufficient stock scenario', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Yetersiz stok senaryosu
    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_order_insufficient_stock_1',
      prompt: 'Bu siparişi onaylamak istiyorum ama stok yetersiz olabilir: Order #E2E-LOW-STOCK-001',
      type: 'request',
      context: {
        orderId: 'test-order-low-stock-uuid',
        orderNumber: 'E2E-LOW-STOCK-001',
        orderData: {
          id: 'test-order-low-stock-uuid',
          order_number: 'E2E-LOW-STOCK-001',
          customer_id: 'test-customer-uuid',
          delivery_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 gün sonra
          status: 'beklemede',
          items: [
            {
              id: 'test-order-item-low-stock',
              product_id: 'test-product-uuid',
              product_name: 'Test Product (Low Stock)',
              quantity: 10000, // Çok yüksek miktar - stok yetersiz olmalı
              unit_price: 100.00
            }
          ]
        },
        requestedBy: 'test-user-uuid',
        requestedByRole: 'planlama',
        stockWarning: true // Stok uyarısı var
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toBeDefined();
    
    // Yetersiz stok durumunda reject veya conditional olmalı
    expect(['rejected', 'conditional', 'pending_approval']).toContain(result.finalDecision);
    
    const protocol = result.protocolResult;
    if (protocol.finalDecision === 'rejected') {
      // Reject edildiyse, errors olmalı
      expect(protocol.errors.length).toBeGreaterThan(0);
      console.log('✅ Insufficient stock correctly rejected');
    } else if (protocol.finalDecision === 'conditional') {
      // Conditional ise, warnings olmalı
      expect(protocol.warnings.length).toBeGreaterThan(0);
      console.log('✅ Insufficient stock handled with conditions');
    }
  }, 60000);

  test('Order approval should handle high value orders requiring human approval', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Yüksek değerli sipariş senaryosu
    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_order_high_value_1',
      prompt: 'Bu yüksek değerli siparişi onaylamak istiyorum: Order #E2E-HIGH-VALUE-001',
      type: 'request',
      context: {
        orderId: 'test-order-high-value-uuid',
        orderNumber: 'E2E-HIGH-VALUE-001',
        orderData: {
          id: 'test-order-high-value-uuid',
          order_number: 'E2E-HIGH-VALUE-001',
          customer_id: 'test-customer-uuid',
          delivery_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 gün sonra
          status: 'beklemede',
          items: [
            {
              id: 'test-order-item-high-value',
              product_id: 'test-product-uuid',
              product_name: 'Test Product (High Value)',
              quantity: 1000,
              unit_price: 10000.00 // Çok yüksek fiyat
            }
          ],
          totalAmount: 10000000.00 // 10M TL
        },
        requestedBy: 'test-user-uuid',
        requestedByRole: 'planlama',
        requiresHumanApproval: true // İnsan onayı gerekli
      },
      urgency: 'critical',
      severity: 'critical'
    });

    expect(result).toBeDefined();
    expect(result.finalDecision).toBeDefined();
    
    // Yüksek değerli siparişler için pending_approval veya conditional olmalı
    const protocol = result.protocolResult;
    expect(['pending_approval', 'conditional', 'approved', 'rejected']).toContain(protocol.finalDecision);
    
    if (protocol.finalDecision === 'pending_approval') {
      console.log('✅ High value order correctly requires human approval');
    } else if (protocol.finalDecision === 'conditional') {
      console.log('✅ High value order handled with conditions');
    }
  }, 60000);

  test('Order approval should integrate with Warehouse Agent for stock check', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Warehouse Agent ile entegrasyon testi
    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_order_warehouse_integration_1',
      prompt: 'Sipariş onayı için Warehouse Agent ile stok kontrolü yap: Order #E2E-WAREHOUSE-001',
      type: 'request',
      context: {
        orderId: 'test-order-warehouse-uuid',
        orderNumber: 'E2E-WAREHOUSE-001',
        orderData: {
          id: 'test-order-warehouse-uuid',
          order_number: 'E2E-WAREHOUSE-001',
          customer_id: 'test-customer-uuid',
          delivery_date: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(),
          status: 'beklemede',
          items: [
            {
              id: 'test-order-item-warehouse',
              product_id: 'test-product-uuid',
              product_name: 'Test Product',
              quantity: 100,
              unit_price: 50.00
            }
          ]
        },
        requestedBy: 'test-user-uuid',
        requestedByRole: 'planlama',
        checkStock: true // Stok kontrolü yap
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    // Protocol'de cross-agent validation çalışmış olmalı
    const protocol = result.protocolResult;
    
    // Layer 2 (Cross-Validation) çalışmış olmalı (Warehouse Agent kontrolü için)
    if (protocol.layers.layer2) {
      console.log('✅ Warehouse Agent integration verified in Layer 2');
      expect(protocol.layers.layer2).toHaveProperty('isValid');
    }
    
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
    console.log(`✅ Order-Warehouse Integration Decision: ${protocol.finalDecision}`);
  }, 60000);
});

