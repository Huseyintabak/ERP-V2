# 🚀 Thunder ERP - Canlı Ortam Güvenlik Kuralları

**Tarih:** 2025-01-27  
**Durum:** Beta → Canlı Geçiş Tamamlandı  
**Versiyon:** Production Ready

---

## ⚠️ KRİTİK UYARI

**Bu proje artık CANLI ORTAMDA çalışıyor!**  
Tüm değişiklikler gerçek kullanıcıları ve verileri etkiler.

---

## 🛡️ TEMEL GÜVENLİK KURALLARI

### 1. **VERİ KORUMA** 🔒
```bash
❌ ASLA YAPMA:
- Canlı veriyi silme
- Mevcut tabloları DROP etme
- Kritik verileri güncelleme
- Bulk DELETE işlemleri

✅ GÜVENLİ YAKLAŞIM:
- Soft delete kullan
- Backup al
- Test ortamında dene
- Rollback planı hazırla
```

### 2. **DATABASE DEĞİŞİKLİKLERİ** 🗄️
```sql
❌ TEHLİKELİ:
DROP TABLE users;
ALTER TABLE orders DROP COLUMN customer_id;
DELETE FROM stock_movements;

✅ GÜVENLİ:
-- Migration ile yeni kolon ekle
ALTER TABLE orders ADD COLUMN new_field VARCHAR(255) DEFAULT '';
-- Soft delete
UPDATE orders SET is_deleted = true WHERE id = ?;
-- Backup ile güncelleme
UPDATE stock_movements SET status = 'archived' WHERE created_at < ?;
```

### 3. **API DEĞİŞİKLİKLERİ** 🔌
```typescript
❌ BREAKING CHANGES:
// Mevcut endpoint'i değiştirme
GET /api/orders → POST /api/orders

✅ BACKWARD COMPATIBILITY:
// Yeni versiyon ekle
GET /api/v2/orders
// Mevcut endpoint'i koru
GET /api/orders (deprecated)
```

---

## 🔧 GÜVENLİ GELİŞTİRME PROSEDÜRÜ

### **Adım 1: Test Ortamı** 🧪
```bash
# Development branch oluştur
git checkout -b feature/new-feature

# Test verileri ile dene
npm run dev
# Test senaryolarını çalıştır
npm run test
```

### **Adım 2: Code Review** 👀
```bash
# Pull request oluştur
git push origin feature/new-feature

# Review checklist:
- [ ] Breaking change yok
- [ ] Error handling var
- [ ] Logging eklendi
- [ ] Rollback planı hazır
```

### **Adım 3: Staging Test** 🎭
```bash
# Staging'e deploy et
npm run build:staging

# Canlı veri ile test et
# Performance test yap
# User acceptance test
```

### **Adım 4: Production Deploy** 🚀
```bash
# Backup al
pg_dump thunder_erp > backup_$(date +%Y%m%d).sql

# Deploy et
npm run build:production
npm run deploy

# Monitor et
# Log'ları kontrol et
# Error rate'i izle
```

---

## 📊 CANLI VERİ KORUMA LİSTESİ

### **Kritik Tablolar** ⚠️
```sql
-- ASLA SİLME/GÜNCELLEME YAPMA:
users                    -- Kullanıcı hesapları
customers               -- Müşteri verileri
orders                  -- Sipariş geçmişi
order_items             -- Sipariş kalemleri
raw_materials           -- Hammadde stokları
semi_finished_products  -- Yarı mamul stokları
finished_products       -- Nihai ürün stokları
stock_movements         -- Stok hareketleri
audit_logs              -- Audit kayıtları
price_history           -- Fiyat geçmişi
```

### **Güvenli İşlemler** ✅
```sql
-- Bu işlemler güvenli:
INSERT INTO new_table...     -- Yeni kayıt ekleme
UPDATE status = 'active'     -- Status güncelleme
SELECT ...                   -- Veri okuma
CREATE INDEX ...             -- Index ekleme
```

---

## 🚨 ACİL DURUM PROSEDÜRÜ

### **Sistem Çöktüğünde** 💥
```bash
# 1. Hızlı rollback
git revert <commit-hash>
npm run deploy:rollback

# 2. Database restore
psql thunder_erp < backup_latest.sql

# 3. Servisleri yeniden başlat
pm2 restart all

# 4. Monitor et
pm2 logs
```

### **Veri Kaybı Durumunda** 📉
```bash
# 1. Backup'tan restore
pg_restore -d thunder_erp backup_file.dump

# 2. Log'ları kontrol et
tail -f /var/log/thunder-erp/error.log

# 3. Kullanıcıları bilgilendir
# Email/SMS notification gönder
```

---

## 🔍 CODE REVIEW CHECKLIST

### **Her PR'da Kontrol Et** ✅
- [ ] **Breaking Change:** Mevcut API'ler bozuldu mu?
- [ ] **Data Safety:** Canlı veri etkileniyor mu?
- [ ] **Error Handling:** Hata durumları handle ediliyor mu?
- [ ] **Logging:** Önemli işlemler loglanıyor mu?
- [ ] **Performance:** Query'ler optimize mi?
- [ ] **Security:** SQL injection koruması var mı?
- [ ] **Rollback:** Geri alma planı hazır mı?
- [ ] **Testing:** Test coverage yeterli mi?

### **Red Flags** 🚩
```typescript
// Bu pattern'ları ASLA kullanma:
DELETE FROM users;                    // Bulk delete
DROP TABLE orders;                   // Table drop
ALTER TABLE DROP COLUMN;             // Column drop
UPDATE * SET field = value;          // Bulk update
eval(userInput);                     // Code injection
```

---

## 📈 MONITORING & ALERTING

### **Kritik Metrikler** 📊
```bash
# Database performance
SELECT * FROM pg_stat_activity;

# Error rates
tail -f /var/log/thunder-erp/error.log | grep ERROR

# Memory usage
pm2 monit

# Response times
curl -w "@curl-format.txt" -o /dev/null -s "http://localhost:3000/api/health"
```

### **Alert Thresholds** ⚠️
- **Error Rate:** > 5% → Alert
- **Response Time:** > 2s → Alert  
- **Memory Usage:** > 80% → Alert
- **Database Connections:** > 80% → Alert

---

## 🛠️ DEVELOPMENT TOOLS

### **Güvenli Geliştirme Araçları** 🔧
```bash
# Database migration
npx supabase migration new add_new_feature

# Type safety
npm run type-check

# Linting
npm run lint

# Testing
npm run test

# Security audit
npm audit
```

### **Backup Scripts** 💾
```bash
#!/bin/bash
# daily-backup.sh
pg_dump thunder_erp > backup_$(date +%Y%m%d_%H%M).sql
aws s3 cp backup_*.sql s3://thunder-erp-backups/
```

---

## 📞 İLETİŞİM & ESCALATION

### **Acil Durum Kontakları** 📱
- **Lead Developer:** [İsim] - [Telefon]
- **Database Admin:** [İsim] - [Telefon]  
- **DevOps:** [İsim] - [Telefon]
- **Product Owner:** [İsim] - [Telefon]

### **Escalation Matrix** 📋
- **Level 1:** Development Team (0-30 min)
- **Level 2:** Senior Developer (30-60 min)
- **Level 3:** Technical Lead (1-2 hours)
- **Level 4:** Management (2+ hours)

---

## 📚 KAYNAKLAR

### **Dokümantasyon** 📖
- [API Documentation](./API_REFERENCE.md)
- [Database Schema](./DATABASE_SCHEMA.md)
- [Deployment Guide](./DEPLOYMENT.md)
- [Testing Guide](./TESTING.md)

### **Useful Commands** 💻
```bash
# Health check
curl http://localhost:3000/api/health

# Database status
psql -c "SELECT version();"

# Service status
pm2 status

# Log monitoring
pm2 logs --lines 100
```

---

## ⚡ HIZLI REFERANS

### **Güvenli Komutlar** ✅
```bash
# Backup
pg_dump thunder_erp > backup.sql

# Migration
npx supabase migration up

# Deploy
npm run build && npm run deploy

# Rollback
git revert HEAD && npm run deploy
```

### **Tehlikeli Komutlar** ❌
```bash
# ASLA ÇALIŞTIRMA:
DROP DATABASE thunder_erp;
rm -rf /var/www/thunder-erp;
killall node;
```

---

**🎯 HEDEF:** Sıfır downtime, sıfır veri kaybı, maksimum güvenlik!

**📅 Son Güncelleme:** 2025-01-27  
**👨‍💻 Güncelleyen:** AI Assistant  
**🔄 Versiyon:** 1.0.0
