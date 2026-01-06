# 🚀 Hızlı HTTPS Çözümü - ngrok

## En Kolay Yöntem!

### 1. ngrok İndirin (Ücretsiz)
https://ngrok.com/download

### 2. Kurulum (Mac)
```bash
brew install ngrok
```

### 3. ngrok Başlatın
```bash
# Terminal 1: Next.js
npm run dev

# Terminal 2: ngrok (başka terminal)
ngrok http 3001
```

### 4. Çıktıda şunu göreceksiniz:
```
Forwarding  https://xxxx-xx-xx-xxx-xxx.ngrok-free.app -> http://localhost:3001
```

### 5. Mobil Cihazdan:
```
https://xxxx-xx-xx-xxx-xxx.ngrok-free.app/depo/mobile-dashboard
```

✅ HTTPS ile çalışır
✅ Kamera izni çalışır
✅ Hazır!

---

## Alternatif: localtunnel

```bash
# Kurulum
npm install -g localtunnel

# Kullanım
lt --port 3001
```

Çıktı:
```
your url is: https://xxxx.loca.lt
```
