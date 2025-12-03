# 🚀 Sunucuda Migration Uygulama Talimatları

## ⚠️ ÖNEMLİ: "operator does not exist: text = uuid" Hatası

Bu hata, production database'inde trigger fonksiyonlarının eski versiyonunda UUID type casting eksikliğinden kaynaklanıyor.

---

## 📋 Adım Adım Çözüm

### Yöntem 1: Supabase Dashboard (Önerilen - En Kolay) ✅

1. **Supabase Dashboard'a giriş yap:**
   - https://app.supabase.com adresine git
   - Projenizi seçin

2. **SQL Editor'ı aç:**
   - Sol menüden **"SQL Editor"** seç
   - **"New Query"** butonuna tıkla

3. **Migration SQL'ini çalıştır:**
   - `supabase/FIX-OPERATOR-TYPE-CAST.sql` dosyasını aç
   - **TÜM İÇERİĞİNİ** kopyala
   - SQL Editor'a yapıştır
   - **"Run"** (veya `Ctrl+Enter`) ile çalıştır

4. **Başarı kontrolü:**
   - ✅ "✅ Trigger'lar başarıyla oluşturuldu/güncellendi!" mesajını görmelisiniz
   - Hata varsa ekran görüntüsü al ve kontrol et

---

### Yöntem 2: psql ile (Sunucudan Direkt Bağlantı)

Sunucuda psql kuruluysa:

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@your-server-ip

# Supabase connection string'i al (Supabase Dashboard > Settings > Database > Connection String > URI)
# Format: postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres

# psql ile bağlan
psql "postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres"

# SQL dosyasını çalıştır
\i /path/to/supabase/FIX-OPERATOR-TYPE-CAST.sql

# Veya direkt içeriği yapıştır ve çalıştır
```

---

### Yöntem 3: Node.js Script ile (Supabase Client)

Sunucuda proje dizininde:

```bash
cd /var/www/thunder-erp

# Migration script oluştur
cat > scripts/apply-migration.mjs << 'EOF'
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '..', '.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Supabase credentials not found');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function applyMigration() {
  try {
    const sqlPath = join(__dirname, '..', 'supabase', 'FIX-OPERATOR-TYPE-CAST.sql');
    const sql = readFileSync(sqlPath, 'utf8');
    
    // SQL'i statement'lara böl
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📝 ${statements.length} SQL statement bulundu`);
    
    // Her statement'ı çalıştır
    for (const statement of statements) {
      if (statement.length > 0) {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error) {
          console.error('❌ Statement hatası:', error.message);
          console.error('Statement:', statement.substring(0, 100) + '...');
        }
      }
    }
    
    console.log('✅ Migration tamamlandı!');
  } catch (error) {
    console.error('❌ Migration hatası:', error);
    process.exit(1);
  }
}

applyMigration();
EOF

# Script'i çalıştır
node scripts/apply-migration.mjs
```

**Not:** Bu yöntem `exec_sql` RPC fonksiyonu gerektirir (varsayılan olarak yoktur). Bu yüzden **Yöntem 1 (Dashboard)** önerilir.

---

## ✅ Migration Sonrası Kontrol

### 1. PM2'yi Restart Et
```bash
pm2 restart thunder-erp
```

### 2. Log'ları Kontrol Et
```bash
pm2 logs thunder-erp --lines 50
```

**Beklenen:** Artık "operator does not exist: text = uuid" hatası görünmemeli.

### 3. Production Log Test
- Operator dashboard'dan bir production log oluştur
- Hata olmamalı ve stok hareketleri kaydedilmeli

---

## 🔍 Sorun Giderme

### Migration başarısız oldu

**Hata:** `permission denied` veya `access denied`
- **Çözüm:** Supabase Dashboard'dan SQL Editor'ı kullan (service role key ile otomatik yetkilendirilir)

**Hata:** `function already exists`
- **Çözüm:** Normal, `CREATE OR REPLACE FUNCTION` zaten mevcut fonksiyonu günceller

**Hata:** `trigger already exists`
- **Çözüm:** Normal, `DROP TRIGGER IF EXISTS` ve `CREATE TRIGGER` mevcut trigger'ı yeniden oluşturur

### Hata devam ediyor

1. **Database bağlantısını kontrol et:**
   ```bash
   # PM2 environment variables
   pm2 show thunder-erp
   # NEXT_PUBLIC_SUPABASE_URL ve SUPABASE_SERVICE_ROLE_KEY olmalı
   ```

2. **Trigger'ların varlığını kontrol et:**
   - Supabase Dashboard > SQL Editor
   ```sql
   SELECT tgname, tgenabled 
   FROM pg_trigger 
   WHERE tgname IN (
     'trigger_update_stock_on_production',
     'trigger_consume_materials_on_production'
   );
   ```
   - Her iki trigger de görünmeli

3. **Fonksiyonları kontrol et:**
   ```sql
   SELECT proname, prosrc 
   FROM pg_proc 
   WHERE proname IN (
     'update_stock_on_production',
     'consume_materials_on_production'
   );
   ```
   - Fonksiyon kaynak kodunda `::TEXT` casting'i olmalı

---

## 📝 Özet

**En Hızlı Çözüm:**
1. Supabase Dashboard > SQL Editor
2. `FIX-OPERATOR-TYPE-CAST.sql` içeriğini yapıştır
3. Run
4. `pm2 restart thunder-erp`
5. ✅ Tamamlandı!

---

**Son Güncelleme:** 2025-01-27

