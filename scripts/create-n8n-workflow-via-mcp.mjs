#!/usr/bin/env node

/**
 * n8n Workflow Oluşturma Script'i (MCP ile)
 * 
 * Kullanım:
 *   node scripts/create-n8n-workflow-via-mcp.mjs
 * 
 * veya TypeScript ile:
 *   import { getN8nWorkflowGenerator } from '@/lib/ai/n8n-workflow-generator';
 */

import { getN8nMCPClient } from '../lib/ai/n8n-mcp-client.js';
import { getN8nApiClient } from '../lib/ai/n8n-api-client.js';
import { getN8nWorkflowGenerator } from '../lib/ai/n8n-workflow-generator.js';

async function main() {
  console.log('🚀 n8n Workflow Oluşturma Script\'i Başlatılıyor...\n');

  try {
    // 1. MCP Server'a bağlan
    console.log('1️⃣  MCP Server\'a bağlanılıyor...');
    const mcpClient = getN8nMCPClient();
    
    const isHealthy = await mcpClient.healthCheck();
    if (!isHealthy) {
      console.error('❌ MCP Server\'a bağlanılamadı!');
      console.log('💡 Kontrol edin:');
      console.log('   - N8N_MCP_SERVER_URL environment variable');
      console.log('   - N8N_MCP_ACCESS_TOKEN environment variable');
      console.log('   - n8n MCP Server aktif mi?');
      process.exit(1);
    }
    console.log('✅ MCP Server\'a bağlandı\n');

    // 2. MCP Tool'larını listele
    console.log('2️⃣  MCP Tool\'larını listeleniyor...');
    const tools = await mcpClient.listTools();
    console.log(`✅ ${tools.length} tool bulundu:`);
    tools.forEach(tool => {
      console.log(`   - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // 3. Mevcut workflow'ları listele
    console.log('3️⃣  Mevcut workflow\'lar listeleniyor...');
    const generator = getN8nWorkflowGenerator();
    const analysis = await generator.analyzeWorkflows();
    console.log(`✅ Toplam ${analysis.total} workflow:`);
    console.log(`   - Aktif: ${analysis.active}`);
    console.log(`   - Pasif: ${analysis.inactive}`);
    console.log('');

    // 4. Yeni workflow oluştur
    console.log('4️⃣  Yeni Planning Agent workflow\'u oluşturuluyor...');
    const workflowId = await generator.createBasicPlanningWorkflow();
    console.log(`✅ Workflow oluşturuldu: ${workflowId}\n`);

    // 5. Workflow'u aktifleştir (opsiyonel)
    console.log('5️⃣  Workflow aktifleştiriliyor...');
    const apiClient = getN8nApiClient();
    await apiClient.activateWorkflow(workflowId, true);
    console.log(`✅ Workflow aktifleştirildi\n`);

    // 6. Sonuç
    console.log('============================================');
    console.log('✅ BAŞARILI!');
    console.log('============================================');
    console.log('');
    console.log(`📍 Workflow ID: ${workflowId}`);
    console.log(`🌐 n8n UI: http://192.168.1.250:5678`);
    console.log(`📡 Webhook URL: http://192.168.1.250:5678/webhook/planning-agent-auto`);
    console.log('');
    console.log('🧪 Test et:');
    console.log(`curl -X POST http://192.168.1.250:5678/webhook/planning-agent-auto \\`);
    console.log(`  -H "Content-Type: application/json" \\`);
    console.log(`  -d '{"prompt": "100 adet Ürün A için plan oluştur"}'`);
    console.log('');

  } catch (error) {
    console.error('❌ Hata:', error);
    process.exit(1);
  }
}

// Script'i çalıştır
main();

