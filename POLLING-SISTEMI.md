# Polling Sistemi - WebSocket Alternatifi

## 🔴 Problem

Supabase WebSocket bağlantıları sürekli kesiliyor:
- `WebSocket is closed before the connection is established` hatası
- Bağlantı sürekli kopuyor ve tekrar deniyor
- Gerçek zamanlı güncellemeler çalışmıyor
- Kullanıcı deneyimi kötü

## ✅ Çözüm: Polling Sistemi

WebSocket yerine **basit ve güvenilir polling** sistemi kullanıyoruz.

### Polling Nedir?

Polling, belirli aralıklarla sunucudan veri çekme yöntemidir. WebSocket'ten farklı olarak:
- ✅ Sürekli bağlantı gerektirmez
- ✅ Ağ kesintilerinden etkilenmez
- ✅ Tüm tarayıcılarda çalışır
- ✅ Daha basit ve bakımı kolay
- ✅ Sunucu yükü daha az

### Nasıl Çalışıyor?

```typescript
import { usePolling } from '@/lib/hooks/use-polling';

// 5 saniyede bir veri çek
const { isActive, lastUpdate, refresh } = usePolling(
  async () => {
    await fetchData();
  },
  {
    interval: 5000,  // 5 saniye
    enabled: true
  }
);
```

## 📊 Kullanım Örnekleri

### 1. Operator Dashboard
- **Güncelleme Sıklığı**: 5 saniye
- **Güncellenen Veriler**: 
  - Üretim planları
  - Aktif görevler
  - Duraklatılan görevler
  - Operatör istatistikleri

```typescript
// Operator Dashboard
usePolling(fetchAllData, { interval: 5000 });
```

### 2. Bildirimler Sayfası
- **Güncelleme Sıklığı**: 10 saniye
- **Güncellenen Veriler**: 
  - Yeni bildirimler
  - Okunmamış bildirim sayısı
  - Bildirim durumları

```typescript
// Bildirimler
usePolling(refreshNotifications, { interval: 10000 });
```

## 🎯 Özellikler

### 1. Otomatik Güncelleme
- Belirtilen aralıklarla otomatik veri çeker
- Arka planda çalışır
- Kullanıcı müdahalesi gerektirmez

### 2. Manuel Yenileme
```typescript
<Button onClick={refresh}>
  Manuel Yenile
</Button>
```

### 3. Durum Göstergesi
- Yeşil nokta: Aktif polling
- Gri nokta: Devre dışı
- Animasyonlu pulse efekti

### 4. Son Güncelleme Zamanı
```
Son güncelleme: 14:30:45
```

## 🔧 Konfigürasyon

### Polling Aralığı Ayarlama

```typescript
// Hızlı güncelleme (3 saniye)
usePolling(fetchData, { interval: 3000 });

// Normal güncelleme (5 saniye)
usePolling(fetchData, { interval: 5000 });

// Yavaş güncelleme (30 saniye)
usePolling(fetchData, { interval: 30000 });
```

### Polling'i Durdurma/Başlatma

```typescript
const { startPolling, stopPolling } = usePolling(fetchData);

// Durdur
stopPolling();

// Başlat
startPolling();
```

## 📈 Performans

### Sunucu Yükü
- **WebSocket**: Sürekli açık bağlantı, event dinleme
- **Polling**: Sadece belirtilen aralıklarda istek

### Ağ Kullanımı
- **5 saniyelik polling**: 12 istek/dakika
- **10 saniyelik polling**: 6 istek/dakika
- Çok düşük veri tüketimi

### Karşılaştırma

| Özellik | WebSocket | Polling |
|---------|-----------|---------|
| Gerçek zamanlılık | Anlık | ~5-10 saniye |
| Güvenilirlik | ⚠️ Düşük | ✅ Yüksek |
| Karmaşıklık | 🔴 Yüksek | ✅ Basit |
| Ağ kesintisi | 🔴 Sorun yaratır | ✅ Etkilemez |
| Tarayıcı desteği | ⚠️ Değişken | ✅ %100 |

## 🎨 UI Bileşenleri

### Polling Status Card

```tsx
<Card>
  <CardContent className="py-4">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className={`h-3 w-3 rounded-full ${
          isPollingActive ? 'bg-green-500 animate-pulse' : 'bg-gray-500'
        }`} />
        <div>
          <div className="font-medium">
            {isPollingActive ? 'Otomatik Güncelleme Aktif' : 'Güncelleme Durduruldu'}
          </div>
          {lastUpdate && (
            <div className="text-sm text-muted-foreground">
              Son güncelleme: {lastUpdate.toLocaleTimeString('tr-TR')}
            </div>
          )}
        </div>
      </div>
      <Button onClick={manualRefresh} variant="outline" size="sm">
        <RefreshCcw className="h-4 w-4 mr-2" />
        Manuel Yenile
      </Button>
    </div>
  </CardContent>
</Card>
```

## 🚀 Migration (WebSocket'ten Polling'e Geçiş)

### Önce (WebSocket)
```typescript
import { useRealtimeUnified } from '@/lib/hooks/use-realtime-unified';

const { isConnected } = useRealtimeUnified('notifications', 
  (data) => {
    refreshData();
  }
);
```

### Sonra (Polling)
```typescript
import { usePolling } from '@/lib/hooks/use-polling';

const { isActive, refresh } = usePolling(
  async () => {
    await refreshData();
  },
  { interval: 5000 }
);
```

## 💡 Best Practices

### 1. Uygun Aralık Seçimi
- **Kritik veriler**: 3-5 saniye
- **Normal veriler**: 5-10 saniye
- **Az değişen veriler**: 30-60 saniye

### 2. Error Handling
```typescript
usePolling(
  async () => {
    try {
      await fetchData();
    } catch (error) {
      console.error('Veri çekme hatası:', error);
      // Hata yönetimi
    }
  },
  {
    interval: 5000,
    onError: (error) => {
      toast.error('Güncelleme başarısız');
    }
  }
);
```

### 3. Cleanup
Hook otomatik olarak temizlik yapar:
```typescript
useEffect(() => {
  // Polling başlar
  return () => {
    // Component unmount olduğunda polling durdurulur
  };
}, []);
```

## 📝 Notlar

- Polling sistemi tüm sayfalarda WebSocket'i tamamen değiştirir
- Daha basit, daha güvenilir, daha az sorunlu
- Kullanıcı deneyimi daha iyi
- Sunucu yükü daha düşük
- Bakım maliyeti daha az

## 🔮 Gelecek İyileştirmeler

1. **Adaptive Polling**: Kullanıcı aktivitesine göre aralık ayarlama
2. **Smart Polling**: Sadece değişiklik varsa veri çekme
3. **Background Sync**: Tarayıcı arkaplandayken polling durdurma
4. **Offline Support**: Ağ kesildiğinde graceful degradation

## 📞 Destek

Herhangi bir sorun yaşarsanız:
1. Polling durumunu kontrol edin (yeşil nokta aktif mi?)
2. Son güncelleme zamanını kontrol edin
3. Manuel yenileme butonunu deneyin
4. Console'da hata var mı kontrol edin

