# 📱 Mobil Test - Hızlı Başlangıç

## 🎯 Kamera İzni İçin HTTPS GEREKLİ!

### Seçenek 1: ngrok (ÖNERİLEN - 2 dakika)

1. ngrok indirin: https://ngrok.com/download
2. Terminal 1: `npm run dev`
3. Terminal 2: `ngrok http 3001`
4. Çıkan HTTPS URL'i kopyalayın: `https://xxxx.ngrok-free.app`
5. Mobil cihazdan bu URL'e girin

### Seçenek 2: Cloudflare Tunnel (Alternatif)

1. `npm install -g cloudflared`
2. `cloudflared tunnel --url http://localhost:3001`
3. Çıkan URL'i kullanın

### ✅ HTTPS ile test edin:
```
https://xxxx.ngrok-free.app/depo/mobile-dashboard
```

Artık kamera izni çalışacak! 📸
