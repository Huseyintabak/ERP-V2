// Jest setup dosyası
// Test environment için global ayarlar

// .env.local dosyasından environment variable'ları yükle
const result = require('dotenv').config({ path: '.env.local' })

if (result.error) {
  console.warn('⚠️ .env.local dosyası yüklenemedi:', result.error.message)
} else {
  console.log('✅ .env.local dosyası yüklendi')
}

// Environment variables
process.env.NODE_ENV = 'test'

// Supabase environment variables (test için)
// .env.local'den yüklenmiş olmalı, yoksa boş string
if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
  process.env.NEXT_PUBLIC_SUPABASE_URL = process.env.SUPABASE_URL || ''
}

if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || ''
}

// OpenAI API Key (test için opsiyonel)
// .env.local'den yüklenmiş olmalı
if (!process.env.OPENAI_API_KEY) {
  process.env.OPENAI_API_KEY = process.env.OPENAI_API_KEY || ''
}

// Agent enabled flag
process.env.AGENT_ENABLED = process.env.AGENT_ENABLED || 'true'
process.env.AGENT_LOGGING_ENABLED = process.env.AGENT_LOGGING_ENABLED || 'true'

// Debug: Environment variable'ların yüklendiğini kontrol et
if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
  console.log('✅ NEXT_PUBLIC_SUPABASE_URL loaded from .env.local')
  // Test için de kullanılabilir hale getir
  global.NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
}
if (process.env.OPENAI_API_KEY) {
  console.log('✅ OPENAI_API_KEY loaded from .env.local')
  // Test için de kullanılabilir hale getir
  global.OPENAI_API_KEY = process.env.OPENAI_API_KEY
}
if (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  global.NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
}

// Console log suppression (opsiyonel)
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
//   error: jest.fn(),
// }

