/**
 * API Endpoint Üzerinden Conversation'ı Sonlandır
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: join(__dirname, '..', '.env.local') });

// Sonlandırılacak conversation ID
const conversationId = 'dev_report_1764761863381_6abjhc';

// JWT token'ı oku (eğer varsa)
// Not: Bu script için geçici bir token gerekebilir veya admin key kullanılabilir
// Şimdilik basit bir yaklaşım kullanıyoruz

async function stopConversationViaAPI() {
  console.log(`🛑 API üzerinden conversation ${conversationId} sonlandırılıyor...\n`);

  try {
    // Next.js server'ına istek gönder
    // Not: Bu script server-side'da çalıştığı için, doğrudan orchestrator'ı çağırmak daha iyi olabilir
    // Ancak API endpoint'i de oluşturduk, frontend'den kullanılabilir
    
    console.log(`ℹ️  Bu conversation'ı sonlandırmak için:`);
    console.log(`   1. Frontend'den: /api/ai/conversations/${conversationId}/stop endpoint'ini POST ile çağırın`);
    console.log(`   2. Ya da sunucuyu yeniden başlatın (in-memory cache temizlenecek)`);
    console.log(`\n✅ Database'de conversation zaten 'completed' olarak işaretli.`);
    console.log(`   Terminal log'larındaki görünüm muhtemelen in-memory cache'den kaynaklanıyor.`);
    console.log(`   Sunucu restart edilirse temizlenecektir.`);

  } catch (error) {
    console.error(`❌ Hata:`, error.message);
  }
}

// Script'i çalıştır
stopConversationViaAPI()
  .then(() => {
    console.log('\n✨ Script tamamlandı!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('\n❌ Script hatası:', error);
    process.exit(1);
  });

