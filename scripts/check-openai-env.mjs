#!/usr/bin/env node
/**
 * OpenAI API Key Environment Check Script
 * Sunucuda .env.local dosyasını ve PM2 environment'ını kontrol eder
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

console.log('🔍 OpenAI API Key Environment Check\n');
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

// 2. OPENAI_API_KEY'i kontrol et
const openaiKeyMatch = envLocalContent.match(/^OPENAI_API_KEY=(.+)$/m);
if (!openaiKeyMatch) {
  console.error('❌ OPENAI_API_KEY .env.local dosyasında bulunamadı!\n');
  console.log('📝 .env.local dosyasına şu satırı ekleyin:');
  console.log('   OPENAI_API_KEY=sk-proj-your-key-here\n');
  process.exit(1);
}

const apiKey = openaiKeyMatch[1].trim();

// 3. API Key format kontrolü
if (!apiKey || apiKey === '') {
  console.error('❌ OPENAI_API_KEY boş!\n');
  process.exit(1);
}

if (apiKey === 'sk-proj-your-key-here' || apiKey.startsWith('sk-proj-') === false) {
  console.warn('⚠️  OPENAI_API_KEY formatı şüpheli!');
  console.warn(`   Key: ${apiKey.substring(0, 20)}...`);
  console.warn('   OpenAI API key\'leri genellikle "sk-proj-" veya "sk-" ile başlar.\n');
} else {
  console.log('✅ OPENAI_API_KEY formatı doğru görünüyor');
  console.log(`   Key (ilk 20 karakter): ${apiKey.substring(0, 20)}...\n`);
}

// 4. API Key uzunluk kontrolü
if (apiKey.length < 20) {
  console.warn('⚠️  OPENAI_API_KEY çok kısa! (Minimum 20 karakter olmalı)');
  console.warn(`   Mevcut uzunluk: ${apiKey.length} karakter\n`);
} else {
  console.log(`✅ API Key uzunluğu: ${apiKey.length} karakter\n`);
}

// 5. Diğer environment variables kontrolü
const requiredEnvVars = [
  'NEXT_PUBLIC_SUPABASE_URL',
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'SUPABASE_SERVICE_ROLE_KEY',
  'JWT_SECRET',
  'NODE_ENV'
];

console.log('📋 Diğer Environment Variables:\n');
requiredEnvVars.forEach(varName => {
  const match = envLocalContent.match(new RegExp(`^${varName}=(.+)$`, 'm'));
  if (match && match[1].trim() !== '') {
    console.log(`   ✅ ${varName}: SET`);
  } else {
    console.log(`   ⚠️  ${varName}: NOT SET`);
  }
});

console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

// 6. PM2 kontrolü için talimatlar
console.log('📝 PM2 Kontrolü:\n');
console.log('   PM2 process\'in environment variable\'ları görmesi için:');
console.log('   pm2 restart thunder-erp --update-env\n');
console.log('   PM2 environment\'ı kontrol etmek için:');
console.log('   pm2 show thunder-erp\n');
console.log('   PM2 log\'larını kontrol etmek için:');
console.log('   pm2 logs thunder-erp --lines 50\n');

// 7. API Key validation testi (opsiyonel)
if (process.argv.includes('--test')) {
  console.log('\n🧪 API Key Test (OpenAI API\'ye istek gönderiliyor)...\n');
  
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      }
    });
    
    if (response.ok) {
      console.log('✅ API Key geçerli! OpenAI API\'ye başarıyla bağlanıldı.\n');
    } else {
      const errorData = await response.json().catch(() => ({}));
      console.error('❌ API Key geçersiz veya hatalı!');
      console.error(`   Status: ${response.status}`);
      console.error(`   Error: ${errorData.error?.message || response.statusText}\n`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ API Key testi başarısız!');
    console.error(`   Error: ${error.message}\n`);
    process.exit(1);
  }
}

console.log('✅ Environment check tamamlandı!\n');

