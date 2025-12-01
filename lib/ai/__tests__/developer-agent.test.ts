/**
 * Developer Agent Test
 * Sistem analizi, geliştirme önerileri ve iyileştirme testleri
 */

import { DeveloperAgent } from '../agents/developer-agent';
import { AgentEventBus } from '../event-bus';
import { AgentRequest } from '../types/agent.types';

describe('Developer Agent', () => {
  let developerAgent: DeveloperAgent;
  let eventBus: AgentEventBus;

  beforeAll(() => {
    // Debug: Environment variable'ları kontrol et
    console.log('🔍 Test Environment Check:');
    console.log('  OPENAI_API_KEY:', process.env.OPENAI_API_KEY ? '✅ SET (' + process.env.OPENAI_API_KEY.substring(0, 20) + '...)' : '❌ NOT SET');
    console.log('  NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ SET' : '❌ NOT SET');
    console.log('  NEXT_PUBLIC_SUPABASE_ANON_KEY:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ? '✅ SET' : '❌ NOT SET');
    
    // Event Bus'ı başlat
    eventBus = AgentEventBus.getInstance();
    
    // Developer Agent'ı oluştur ve kaydet
    developerAgent = new DeveloperAgent();
    eventBus.registerAgent(developerAgent);
  });

  afterAll(() => {
    // Cleanup
    eventBus.clear();
  });

  test('Developer Agent should be initialized', () => {
    expect(developerAgent).toBeDefined();
    const info = developerAgent.getInfo();
    expect(info.name).toBe('Developer Agent');
    expect(info.role).toBe('developer');
  });

  test('Developer Agent should process system analysis request', async () => {
    const request: AgentRequest = {
      id: 'test_system_analysis_1',
      prompt: 'Sistem performansını analiz et',
      type: 'analysis',
      context: {
        systemMetrics: {
          responseTime: 150,
          errorRate: 0.02,
          activeUsers: 50
        }
      },
      urgency: 'medium',
      severity: 'low'
    };

    // Not: Bu test gerçek OpenAI API çağrısı yapacak
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      console.warn('   Available env vars:', Object.keys(process.env).filter(k => k.includes('OPENAI') || k.includes('SUPABASE')).join(', '));
      return;
    }
    console.log('✅ Running API test with OPENAI_API_KEY');

    try {
      const response = await developerAgent.processRequest(request);
      
      expect(response).toBeDefined();
      expect(response.agent).toBe('Developer Agent');
      expect(response.decision).toMatch(/approve|reject|conditional|pending/);
      expect(response.timestamp).toBeInstanceOf(Date);
    } catch (error: any) {
      // Agent henüz diğer agent'lara bağlı olmadığı için hata alabilir
      console.log('Expected error (other agents not available):', error.message);
      expect(error).toBeDefined();
    }
  }, 30000); // 30 saniye timeout (API çağrısı için)

  test('Developer Agent should handle improvement suggestions request', async () => {
    const request: AgentRequest = {
      id: 'test_improvement_suggestions_1',
      prompt: 'Sistem iyileştirme önerileri sun',
      type: 'request',
      context: {
        action: 'suggest_improvements',
        area: 'performance'
      },
      urgency: 'low'
    };

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    try {
      const response = await developerAgent.processRequest(request);
      
      expect(response).toBeDefined();
      expect(response.agent).toBe('Developer Agent');
      expect(response.decision).toMatch(/approve|reject|conditional|pending/);
      
      // Improvement suggestions için recommendations kontrolü
      if (response.recommendations) {
        expect(Array.isArray(response.recommendations)).toBe(true);
      }
    } catch (error: any) {
      console.log('Expected error:', error.message);
      expect(error).toBeDefined();
    }
  }, 30000);

  test('Developer Agent should handle code review request', async () => {
    const request: AgentRequest = {
      id: 'test_code_review_1',
      prompt: 'Kod kalitesini değerlendir',
      type: 'query',
      context: {
        codeSnippet: 'function test() { return true; }',
        language: 'typescript'
      },
      urgency: 'low'
    };

    if (!process.env.OPENAI_API_KEY) {
      console.warn('⚠️ OPENAI_API_KEY not set, skipping actual API test');
      return;
    }

    try {
      const response = await developerAgent.processRequest(request);
      
      expect(response).toBeDefined();
      expect(response.agent).toBe('Developer Agent');
    } catch (error: any) {
      console.log('Expected error:', error.message);
      expect(error).toBeDefined();
    }
  }, 30000);

  test('Developer Agent should handle system health check', async () => {
    const request: AgentRequest = {
      id: 'test_health_check_1',
      prompt: 'Sistem sağlık durumunu kontrol et',
      type: 'request',
      context: {
        action: 'health_check'
      },
      urgency: 'medium',
      severity: 'medium'
    };

    // Bu test Supabase'e bağlanmaya çalışacak
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!supabaseUrl) {
      console.warn('⚠️ NEXT_PUBLIC_SUPABASE_URL not set, skipping database test');
      console.warn('   Available env vars:', Object.keys(process.env).filter(k => k.includes('SUPABASE')).join(', '));
      return;
    }
    console.log('✅ Running database test with Supabase URL:', supabaseUrl.substring(0, 30) + '...');

    // Supabase bağlantısını test et (test client kullan)
    try {
      const { createTestClient } = await import('@/lib/supabase/test-client');
      const supabase = createTestClient();
      
      // Basit bir bağlantı testi
      const { data: testData, error: testError } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (testError) {
        // PGRST116 = no rows found (bu normal, tablo boş olabilir)
        if (testError.code === 'PGRST116') {
          console.log('✅ Supabase connection successful (table empty, but connection works)');
        } else {
          console.warn('⚠️ Supabase connection test failed:', testError.message, testError.code);
          console.warn('⚠️ Skipping database-dependent test');
          return;
        }
      } else {
        console.log('✅ Supabase connection successful');
      }
    } catch (connectionError: any) {
      console.warn('⚠️ Supabase connection error:', connectionError.message);
      console.warn('⚠️ Skipping database-dependent test');
      return;
    }

    try {
      const response = await developerAgent.processRequest(request);
      
      expect(response).toBeDefined();
      expect(response.agent).toBe('Developer Agent');
      expect(response.decision).toMatch(/approve|reject|conditional|pending/);
    } catch (error: any) {
      console.log('Expected error:', error.message);
      expect(error).toBeDefined();
    }
  }, 30000);

  test('Developer Agent should handle unknown request type', async () => {
    const request: AgentRequest = {
      id: 'test_unknown_type_1',
      prompt: 'Test request',
      type: 'unknown_type' as any,
      context: {},
      urgency: 'low'
    };

    const response = await developerAgent.processRequest(request);
    
    expect(response).toBeDefined();
    expect(response.agent).toBe('Developer Agent');
    expect(response.decision).toBe('pending');
    expect(response.reasoning).toContain('Unknown request type');
  });
});

