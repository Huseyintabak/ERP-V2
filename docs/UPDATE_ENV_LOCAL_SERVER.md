# 🔧 Sunucuda .env.local Dosyasını Manuel Güncelleme

## Yöntem 1: nano ile Düzenleme (Önerilen)

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@192.168.1.250

# Proje dizinine git
cd /var/www/thunder-erp

# .env.local dosyasını düzenle
nano .env.local
```

**nano Kullanımı:**
- Dosyayı düzenleyin
- **Ctrl+O** → Enter (kaydet)
- **Ctrl+X** (çıkış)

---

## Yöntem 2: vi ile Düzenleme

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@192.168.1.250

# Proje dizinine git
cd /var/www/thunder-erp

# .env.local dosyasını düzenle
vi .env.local
```

**vi Kullanımı:**
- **i** (insert moduna geç)
- Dosyayı düzenle
- **Esc** (insert modundan çık)
- **:wq** → Enter (kaydet ve çık)
- **:q!** → Enter (kaydetmeden çık)

---

## Yöntem 3: echo ile Satır Ekleme

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@192.168.1.250

# Proje dizinine git
cd /var/www/thunder-erp

# Satır ekleme
echo "" >> .env.local
echo "# n8n Configuration" >> .env.local
echo "N8N_WEBHOOK_URL=http://localhost:5678" >> .env.local
echo "N8N_BASE_URL=http://192.168.1.250:5678" >> .env.local
```

---

## Yöntem 4: sed ile Değiştirme

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@192.168.1.250

# Proje dizinine git
cd /var/www/thunder-erp

# Değişken değerini değiştir
sed -i 's|N8N_WEBHOOK_URL=.*|N8N_WEBHOOK_URL=http://localhost:5678|' .env.local
```

---

## Yöntem 5: cat ile Dosya Oluşturma

```bash
# Sunucuya SSH ile bağlan
ssh vipkrom@192.168.1.250

# Proje dizinine git
cd /var/www/thunder-erp

# Yedekle
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

# Yeni içerik ekle
cat >> .env.local << 'EOF'

# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678
N8N_BASE_URL=http://192.168.1.250:5678
EOF
```

---

## Yöntem 6: SCP ile Local'den Kopyalama

### Local makineden:

```bash
# Local .env.local dosyasını sunucuya kopyala
scp .env.local vipkrom@192.168.1.250:/var/www/thunder-erp/.env.local
```

**Not:** Bu yöntem local'deki `.env.local` dosyasını sunucuya kopyalar.

---

## Kontrol

```bash
# Sunucuda
cd /var/www/thunder-erp

# .env.local dosyasını görüntüle
cat .env.local

# Belirli bir değişkeni kontrol et
grep "N8N_WEBHOOK_URL" .env.local
```

---

## Önemli Notlar

1. **Yedek Alın:** Değişiklik yapmadan önce yedek alın:
   ```bash
   cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)
   ```

2. **PM2 Restart:** `.env.local` değişikliklerinden sonra PM2'yi restart edin:
   ```bash
   pm2 restart thunder-erp --update-env
   ```

3. **Git'e Commit Etmeyin:** `.env.local` dosyası git'e commit edilmemeli (`.gitignore`'da olmalı)

4. **Format:** Her satırda bir değişken:
   ```bash
   VARIABLE_NAME=value
   ```

5. **Boşluk Yok:** Eşittir işaretinden sonra boşluk olmamalı:
   ```bash
   # ❌ YANLIŞ
   VARIABLE_NAME = value
   
   # ✅ DOĞRU
   VARIABLE_NAME=value
   ```

---

## Örnek: n8n Değişkenlerini Ekleme

```bash
# Sunucuda
cd /var/www/thunder-erp

# Yedekle
cp .env.local .env.local.backup.$(date +%Y%m%d_%H%M%S)

# nano ile düzenle
nano .env.local

# Dosyanın sonuna ekle:
# n8n Configuration
N8N_WEBHOOK_URL=http://localhost:5678
N8N_BASE_URL=http://192.168.1.250:5678
N8N_API_KEY=your-api-key-here

# Kaydet (Ctrl+O, Enter, Ctrl+X)

# PM2'yi restart et
pm2 restart thunder-erp --update-env
```

---

## Hızlı Referans

```bash
# Dosyayı görüntüle
cat .env.local

# Belirli satırları görüntüle
sed -n '20,30p' .env.local

# Değişken değerini değiştir
sed -i 's|OLD_VALUE|NEW_VALUE|' .env.local

# Değişken ekle
echo "NEW_VARIABLE=value" >> .env.local

# Değişken kontrol et
grep "VARIABLE_NAME" .env.local
```

