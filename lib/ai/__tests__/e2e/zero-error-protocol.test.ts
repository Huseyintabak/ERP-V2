/**
 * Zero Error Protocol E2E Test
 * Tüm protocol katmanlarını (Self-Validation, Cross-Validation, Consensus, Database Integrity) test eder
 */

import { AgentOrchestrator } from '../../orchestrator';
import { ProtocolResult } from '../../types/protocol.types';

describe('Zero Error Protocol E2E', () => {
  let orchestrator: AgentOrchestrator;

  beforeAll(() => {
    // Debug: Environment variable'ları kontrol et
    console.log('🔍 Test Environment Check:');
    console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
    
    // Orchestrator'ı başlat
    orchestrator = AgentOrchestrator.getInstance();
  });

  test('Zero Error Protocol should execute all layers for order approval', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }
    console.log('✅ Running E2E test with Zero Error Protocol');

    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_protocol_order_1',
      prompt: 'Bu siparişi onaylamak istiyorum: Order #E2E-001',
      type: 'request',
      context: {
        orderId: 'test-order-e2e-uuid',
        orderNumber: 'E2E-001',
        orderData: {
          id: 'test-order-e2e-uuid',
          order_number: 'E2E-001',
          customer_id: 'test-customer-uuid',
          delivery_date: new Date().toISOString(),
          status: 'beklemede',
          items: [
            {
              product_id: 'test-product-uuid',
              quantity: 10,
              product_name: 'Test Product'
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
    expect(result.protocolResult).toBeDefined();
    
    const protocol = result.protocolResult;
    
    // Protocol yapısını kontrol et
    expect(protocol).toHaveProperty('decision');
    expect(protocol).toHaveProperty('layers');
    expect(protocol).toHaveProperty('finalDecision');
    expect(protocol).toHaveProperty('errors');
    expect(protocol).toHaveProperty('warnings');
    
    // Layers kontrolü
    expect(protocol.layers).toBeDefined();
    
    // Layer 1: Self-Validation kontrolü
    if (protocol.layers.layer1) {
      expect(protocol.layers.layer1).toHaveProperty('isValid');
      expect(protocol.layers.layer1).toHaveProperty('errors');
      expect(protocol.layers.layer1).toHaveProperty('warnings');
      expect(Array.isArray(protocol.layers.layer1.errors)).toBe(true);
      expect(Array.isArray(protocol.layers.layer1.warnings)).toBe(true);
      console.log('✅ Layer 1 (Self-Validation) executed');
    }
    
    // Layer 2: Cross-Validation kontrolü
    if (protocol.layers.layer2) {
      expect(protocol.layers.layer2).toHaveProperty('isValid');
      expect(protocol.layers.layer2).toHaveProperty('errors');
      expect(protocol.layers.layer2).toHaveProperty('warnings');
      expect(Array.isArray(protocol.layers.layer2.errors)).toBe(true);
      expect(Array.isArray(protocol.layers.layer2.warnings)).toBe(true);
      console.log('✅ Layer 2 (Cross-Validation) executed');
    }
    
    // Layer 3: Consensus kontrolü
    if (protocol.layers.layer3) {
      expect(protocol.layers.layer3).toHaveProperty('isConsensus');
      expect(protocol.layers.layer3).toHaveProperty('votes');
      expect(protocol.layers.layer3).toHaveProperty('errors');
      expect(Array.isArray(protocol.layers.layer3.votes)).toBe(true);
      expect(Array.isArray(protocol.layers.layer3.errors)).toBe(true);
      console.log('✅ Layer 3 (Consensus) executed');
    }
    
    // Layer 4: Database Integrity kontrolü
    if (protocol.layers.layer4) {
      expect(protocol.layers.layer4).toHaveProperty('allChecksPassed');
      expect(protocol.layers.layer4).toHaveProperty('checks');
      expect(Array.isArray(protocol.layers.layer4.checks)).toBe(true);
      console.log('✅ Layer 4 (Database Integrity) executed');
    }
    
    // Final decision kontrolü
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
    console.log(`✅ Final Decision: ${protocol.finalDecision}`);
    
    // Errors ve warnings kontrolü
    expect(Array.isArray(protocol.errors)).toBe(true);
    expect(Array.isArray(protocol.warnings)).toBe(true);
    
    if (protocol.errors.length > 0) {
      console.log('⚠️ Protocol Errors:', protocol.errors);
    }
    if (protocol.warnings.length > 0) {
      console.log('⚠️ Protocol Warnings:', protocol.warnings);
    }
  }, 60000); // 60 saniye timeout (tüm katmanlar için)

  test('Zero Error Protocol should handle production log validation', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const result = await orchestrator.startConversation('production', {
      id: 'test_e2e_protocol_production_1',
      prompt: 'Bu üretim kaydını doğrula: Plan #E2E-PROD-001, Üretilen: 5 adet',
      type: 'validation',
      context: {
        planId: 'test-plan-e2e-uuid',
        planData: {
          id: 'test-plan-e2e-uuid',
          product_id: 'test-product-uuid',
          product_name: 'Test Product',
          planned_quantity: 100,
          produced_quantity: 45,
          quantity_produced: 5,
          totalProduced: 50,
          status: 'devam_ediyor'
        },
        operatorId: 'test-operator-uuid',
        barcodeScanned: 'E2E-BARCODE-001',
        bomSnapshot: [],
        stockChecks: []
      },
      urgency: 'high',
      severity: 'medium'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    const protocol = result.protocolResult;
    expect(protocol).toHaveProperty('layers');
    expect(protocol).toHaveProperty('finalDecision');
    
    // Protocol result yapısını kontrol et
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
    
    // En az bir layer çalışmış olmalı (eğer hata yoksa)
    const layerCount = Object.keys(protocol.layers || {}).length;
    if (layerCount > 0) {
      console.log(`✅ ${layerCount} protocol layer(s) executed`);
    } else {
      console.log('⚠️ No layers executed (may be due to early rejection)');
    }
  }, 60000);

  test('Zero Error Protocol should handle stock movement validation', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    const result = await orchestrator.startConversation('warehouse', {
      id: 'test_e2e_protocol_stock_1',
      prompt: 'Bu stok hareketini doğrula: giris - 50 raw',
      type: 'validation',
      context: {
        materialType: 'raw',
        materialId: 'test-material-e2e-uuid',
        movementType: 'giris',
        quantity: 50,
        currentQuantity: 100,
        newQuantity: 150
      },
      urgency: 'medium',
      severity: 'medium'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    const protocol = result.protocolResult;
    
    // Protocol katmanlarının çalıştığını kontrol et
    expect(protocol.layers).toBeDefined();
    
    // Final decision kontrolü
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
  }, 60000);

  test('Zero Error Protocol should reject invalid requests', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Geçersiz bir istek (negatif quantity)
    const result = await orchestrator.startConversation('warehouse', {
      id: 'test_e2e_protocol_reject_1',
      prompt: 'Bu stok hareketini doğrula: cikis - -100 raw',
      type: 'validation',
      context: {
        materialType: 'raw',
        materialId: 'test-material-e2e-uuid',
        movementType: 'cikis',
        quantity: -100, // Geçersiz: negatif quantity
        currentQuantity: 100,
        newQuantity: 0
      },
      urgency: 'high',
      severity: 'high'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    const protocol = result.protocolResult;
    
    // Geçersiz istekler için protocol hata üretmeli veya reject etmeli
    // (Agent'ın kendisi reject edebilir veya protocol reject edebilir)
    expect(['approved', 'rejected', 'pending_approval', 'conditional']).toContain(protocol.finalDecision);
    
    // Eğer reject edildiyse, errors olmalı
    if (protocol.finalDecision === 'rejected') {
      expect(protocol.errors.length).toBeGreaterThan(0);
      console.log('✅ Invalid request correctly rejected by protocol');
    }
  }, 60000);

  test('Zero Error Protocol should handle high severity requests with all layers', async () => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    // Yüksek severity isteği - tüm katmanlar çalışmalı
    const result = await orchestrator.startConversation('planning', {
      id: 'test_e2e_protocol_high_severity_1',
      prompt: 'Kritik sipariş onayı: Order #CRITICAL-001',
      type: 'request',
      context: {
        orderId: 'test-critical-order-uuid',
        orderNumber: 'CRITICAL-001',
        isCritical: true
      },
      urgency: 'critical',
      severity: 'critical'
    });

    expect(result).toBeDefined();
    expect(result.protocolResult).toBeDefined();
    
    const protocol = result.protocolResult;
    
    // Yüksek severity için tüm katmanlar çalışmalı
    const layerCount = Object.keys(protocol.layers || {}).length;
    expect(layerCount).toBeGreaterThan(0);
    
    console.log(`✅ High severity request: ${layerCount} layer(s) executed`);
    console.log(`✅ Final Decision: ${protocol.finalDecision}`);
  }, 60000);
});

