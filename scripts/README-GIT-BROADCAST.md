# Git Commit Broadcast

Git commit yapıldığında otomatik olarak sistem ayarları broadcast'i gönderir.

## Kurulum

Git hook zaten kurulu. Sadece environment variable'ları ayarlamanız yeterli.

## Environment Variables

`.env.local` dosyasına ekleyin:

```bash
# Git Broadcast Ayarları
GIT_BROADCAST_ENABLED=true                    # Broadcast'i aktif et (default: true)
GIT_BROADCAST_API_URL=http://localhost:3000/api/settings/broadcast  # API URL
GIT_BROADCAST_ONLY_MAIN=false                 # Sadece main branch'lerde gönder (default: false)
BROADCAST_SERVICE_TOKEN=your-secret-token     # Service token (API authentication için)
```

## Nasıl Çalışır?

1. **Git commit yapıldığında** → `post-commit` hook çalışır
2. **Hook** → `scripts/git-broadcast-commit.js` script'ini çalıştırır
3. **Script** → Commit bilgilerini toplar (hash, mesaj, author, branch, değişen dosyalar)
4. **Broadcast API** → `/api/settings/broadcast` endpoint'ine POST request gönderir
5. **Tüm kullanıcılar** → Broadcast'i "Bekleyen Ayar Güncellemeleri" sayfasında görür

## Broadcast İçeriği

Her commit için şu bilgiler broadcast edilir:

- **Commit Hash**: Tam commit hash
- **Commit Mesajı**: Commit mesajı
- **Author**: Commit yapan kişi (name, email)
- **Branch**: Commit yapılan branch
- **Değişen Dosyalar**: Commit'te değişen dosya listesi
- **Timestamp**: Commit zamanı

## Devre Dışı Bırakma

Broadcast'i devre dışı bırakmak için:

```bash
# .env.local
GIT_BROADCAST_ENABLED=false
```

## Sadece Main Branch'lerde Çalıştırma

Sadece `main`, `master`, `production` branch'lerinde broadcast göndermek için:

```bash
# .env.local
GIT_BROADCAST_ONLY_MAIN=true
```

## Test Etme

Hook'u test etmek için:

```bash
# Test commit yap
git commit --allow-empty -m "test: git broadcast test"

# Console'da şunu görmelisiniz:
# 📡 Git commit broadcast gönderiliyor...
# ✅ Broadcast başarıyla gönderildi
```

## Sorun Giderme

### Broadcast gönderilmiyor

1. **Server çalışıyor mu?**
   ```bash
   # Localhost'ta server çalışıyor olmalı
   npm run dev
   ```

2. **Environment variable'lar doğru mu?**
   ```bash
   # .env.local dosyasını kontrol et
   cat .env.local | grep GIT_BROADCAST
   ```

3. **Hook çalışıyor mu?**
   ```bash
   # Hook'un executable olduğundan emin ol
   ls -la .git/hooks/post-commit
   ```

4. **Manuel test:**
   ```bash
   # Script'i manuel çalıştır
   node scripts/git-broadcast-commit.js
   ```

### API Authentication Hatası

Broadcast API'si authentication gerektiriyor. Service token kullanarak authentication yapılır.

**Çözüm:** `.env.local` dosyasına `BROADCAST_SERVICE_TOKEN` ekleyin ve API'de de aynı token'ı tanımlayın:

```bash
# .env.local
BROADCAST_SERVICE_TOKEN=your-secret-token-here
```

API'de de aynı token'ı tanımlayın (production'da environment variable olarak).

## Notlar

- Hook **background'da** çalışır, commit'i bloklamaz
- Hata olsa bile commit başarılı olur (hook commit'i durdurmaz)
- Broadcast sadece commit başarılı olduktan sonra gönderilir
- Her commit için ayrı bir broadcast oluşturulur

