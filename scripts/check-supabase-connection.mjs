#!/usr/bin/env node
/**
 * Supabase Connection Check Script
 * Sunucuda Supabase bağlantısını test eder
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 Supabase Connection Check\n');
console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 1. .env.local dosyasını kontrol et
const envLocalPath = join(projectRoot, '.env.local');
let envLocalContent = '';

try {
  envLocalContent = readFileSync(envLocalPath, 'utf-8');
  console.log('✅ .env.local dosyası bulundu\n');
} catch (error) {
  console.error('❌ .env.local dosyası bulunamadı!');
  console.error(`   Path: ${envLocalPath}\n`);
  process.exit(1);
}

// 2. Supabase environment variables'ları kontrol et
const supabaseUrl = envLocalContent.match(/^NEXT_PUBLIC_SUPABASE_URL=(.+)$/m)?.[1]?.trim();
const supabaseAnonKey = envLocalContent.match(/^NEXT_PUBLIC_SUPABASE_ANON_KEY=(.+)$/m)?.[1]?.trim();
const supabaseServiceKey = envLocalContent.match(/^SUPABASE_SERVICE_ROLE_KEY=(.+)$/m)?.[1]?.trim();

console.log('📋 Environment Variables:\n');
console.log(`   NEXT_PUBLIC_SUPABASE_URL: ${supabaseUrl ? '✅ SET (' + supabaseUrl.substring(0, 30) + '...)' : '❌ NOT SET'}`);
console.log(`   NEXT_PUBLIC_SUPABASE_ANON_KEY: ${supabaseAnonKey ? '✅ SET (' + supabaseAnonKey.substring(0, 20) + '...)' : '❌ NOT SET'}`);
console.log(`   SUPABASE_SERVICE_ROLE_KEY: ${supabaseServiceKey ? '✅ SET (' + supabaseServiceKey.substring(0, 20) + '...)' : '❌ NOT SET'}`);
console.log('');

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
  console.error('❌ Eksik environment variables!\n');
  process.exit(1);
}

// 3. Supabase URL format kontrolü
if (!supabaseUrl.startsWith('https://') || !supabaseUrl.includes('.supabase.co')) {
  console.warn('⚠️  Supabase URL formatı şüpheli!');
  console.warn(`   URL: ${supabaseUrl}`);
  console.warn('   Beklenen format: https://xxxxx.supabase.co\n');
}

// 4. Supabase API testi (anon key ile)
console.log('🧪 Supabase API Connection Test...\n');

try {
  const testUrl = `${supabaseUrl}/rest/v1/agent_logs?select=id&limit=1`;
  
  console.log(`   Test URL: ${supabaseUrl}/rest/v1/agent_logs`);
  console.log('   Test başlatılıyor...\n');
  
  const response = await fetch(testUrl, {
    method: 'GET',
    headers: {
      'apikey': supabaseAnonKey,
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json'
    },
    // 10 saniye timeout
    signal: AbortSignal.timeout(10000)
  });
  
  if (response.ok) {
    console.log('✅ Supabase API bağlantısı başarılı!\n');
    console.log(`   Status: ${response.status} ${response.statusText}`);
  } else {
    console.error('❌ Supabase API bağlantı hatası!');
    console.error(`   Status: ${response.status} ${response.statusText}`);
    
    const errorText = await response.text().catch(() => '');
    if (errorText) {
      console.error(`   Error: ${errorText.substring(0, 200)}`);
    }
    console.log('');
    process.exit(1);
  }
} catch (error) {
  console.error('❌ Supabase API bağlantı hatası!');
  console.error(`   Error: ${error.message}`);
  console.error(`   Type: ${error.name}\n`);
  
  if (error.message.includes('fetch failed')) {
    console.error('🔍 Olası nedenler:');
    console.error('   1. Network bağlantısı yok');
    console.error('   2. Firewall Supabase\'i engelliyor');
    console.error('   3. DNS problemi');
    console.error('   4. Supabase URL yanlış\n');
  }
  
  if (error.name === 'AbortError') {
    console.error('⏱️  Timeout - Supabase\'e 10 saniye içinde bağlanılamadı\n');
  }
  
  process.exit(1);
}

// 5. Service role key testi (admin işlemleri için)
console.log('🔐 Service Role Key Test (admin işlemleri)...\n');

try {
  const testUrl = `${supabaseUrl}/rest/v1/agent_logs?select=id&limit=1`;
  
  const response = await fetch(testUrl, {
    method: 'GET',
    headers: {
      'apikey': supabaseServiceKey,
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'Content-Type': 'application/json'
    },
    signal: AbortSignal.timeout(10000)
  });
  
  if (response.ok) {
    console.log('✅ Service Role Key bağlantısı başarılı!\n');
    console.log(`   Status: ${response.status} ${response.statusText}`);
  } else {
    console.error('⚠️  Service Role Key bağlantı hatası!');
    console.error(`   Status: ${response.status} ${response.statusText}`);
    
    const errorText = await response.text().catch(() => '');
    if (errorText) {
      console.error(`   Error: ${errorText.substring(0, 200)}`);
    }
    console.log('');
  }
} catch (error) {
  console.error('⚠️  Service Role Key bağlantı hatası!');
  console.error(`   Error: ${error.message}\n`);
}

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
console.log('✅ Supabase connection check tamamlandı!\n');

