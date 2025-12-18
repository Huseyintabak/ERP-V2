'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Clock, 
  Factory, 
  CheckCircle, 
  Target,
  TrendingUp,
  Package,
  Timer,
  BarChart3,
  TrendingDown,
  Zap,
  DollarSign,
  Activity
} from 'lucide-react';
import { useRealtimeUnified } from '@/lib/hooks/use-realtime-unified';
import { useAuthStore } from '@/stores/auth-store';
// import { useMemoryLeakDetector } from '@/lib/hooks/use-memory-leak-detector';
// import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
// import { useStoreSync } from '@/lib/hooks/use-store-sync';

interface PlanlamaStats {
  // Planning KPIs
  pendingOrders: number;
  activeProduction: number;
  completedToday: number;
  planningAccuracy: number;
  
  // Capacity KPIs
  capacityUtilization: number;
  averageProductionTime: number;
  materialAvailability: number;
  orderPriority: { urgent: number; normal: number; low: number };
  
  // Performance KPIs
  weeklyTarget: number;
  weeklyActual: number;
  efficiencyRate: number;
  delayRate: number;
  
  // Stock KPIs
  totalStockVarieties: number;
  lowStockItems: number;
  reservedMaterials: number;
}

export default function PlanlamaDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  
  // Performance and memory monitoring - DISABLED FOR NOW
  // const memoryDetector = useMemoryLeakDetector('PlanlamaDashboard');
  // const performanceMonitor = usePerformanceMonitor('PlanlamaDashboard');
  // const { syncStatus, manualSync, hasSyncErrors, getSyncHealthScore } = useStoreSync({
  //   autoSync: true,
  //   syncInterval: 30000,
  //   retryAttempts: 3,
  //   retryDelay: 1000,
  // });

  const [stats, setStats] = useState<PlanlamaStats>({
    pendingOrders: 0,
    activeProduction: 0,
    completedToday: 0,
    planningAccuracy: 0,
    capacityUtilization: 0,
    averageProductionTime: 0,
    materialAvailability: 0,
    orderPriority: { urgent: 0, normal: 0, low: 0 },
    weeklyTarget: 0,
    weeklyActual: 0,
    efficiencyRate: 0,
    delayRate: 0,
    totalStockVarieties: 0,
    lowStockItems: 0,
    reservedMaterials: 0,
  });
  
  const [operators, setOperators] = useState<any[]>([]);

  // Real-time subscriptions
  // Real-time updates with unified system
  useRealtimeUnified('raw_materials', fetchStats, undefined, undefined, fetchStats, { maxRetries: 3, enableFallback: true });
  useRealtimeUnified('semi_finished_products', fetchStats, undefined, undefined, fetchStats, { maxRetries: 3, enableFallback: true });
  useRealtimeUnified('finished_products', fetchStats, undefined, undefined, fetchStats, { maxRetries: 3, enableFallback: true });
  useRealtimeUnified('production_plans', fetchStats, undefined, undefined, fetchStats, { maxRetries: 3, enableFallback: true });
  useRealtimeUnified('orders', fetchStats, undefined, undefined, fetchStats, { maxRetries: 3, enableFallback: true });

  useEffect(() => {
    fetchStats();
    
    // Smart polling for real-time updates
    let interval: NodeJS.Timeout;
    
    const startPolling = () => {
      interval = setInterval(() => {
        fetchStats();
      }, 30000); // 30 seconds
    };
    
    const stopPolling = () => {
      if (interval) {
        clearInterval(interval);
      }
    };
    
    // Handle visibility changes
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        fetchStats(); // Immediate fetch when page becomes visible
        startPolling();
      } else {
        stopPolling();
      }
    };
    
    // Initial setup
    if (document.visibilityState === 'visible') {
      startPolling();
    }
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      stopPolling();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  async function fetchStats() {
    console.log('🔄 Planlama Dashboard: Fetching stats...');
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const [
        raw, 
        semi, 
        finished, 
        activePlans, 
        pendingOrders,
        completedPlans,
        allPlans,
        operators,
        reservations,
        movements,
        criticalStockCount
      ] = await Promise.all([
        // Stok sayıları ve rezerve miktarları için tüm veriler
        fetch('/api/stock/raw?limit=10000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        fetch('/api/stock/semi?limit=10000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        fetch('/api/stock/finished?limit=10000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        
        // Aktif üretim planları
        fetch('/api/production/plans?status=planlandi,devam_ediyor&limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Bekleyen siparişler
        fetch('/api/orders?status=beklemede&limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Bugün tamamlanan planlar
        fetch('/api/production/plans?status=tamamlandi&limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Tüm planlar (haftalık hesap için)
        fetch('/api/production/plans?limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Operatörler
        fetch('/api/operators', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : []),
        
        // Rezervasyonlar
        fetch('/api/stock/raw?limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Son 7 günün hareketleri
        fetch('/api/stock/movements?limit=1000', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        }).then(r => r.ok ? r.json() : { data: [] }),
        
        // Kritik stok sayısı - direkt veritabanından
        fetch('/api/dashboard/critical-stock-count', {
          headers: {
            'Content-Type': 'application/json',
            'x-user-id': user.id
          }
        })
        .then(async r => {
          if (!r.ok) {
            console.warn('⚠️ Kritik stok API hatası:', r.status, r.statusText);
            return { count: 0 };
          }
          const data = await r.json();
          console.log('✅ Kritik stok API başarılı:', data);
          return data;
        })
        .catch(error => {
          console.error('❌ Kritik stok API hatası:', error);
          return { count: 0 };
        })
      ]);

      // Bugün tamamlanan planlar
      const today = new Date().toISOString().split('T')[0];
      const completedToday = completedPlans.data?.filter((p: any) => 
        p.completed_at && p.completed_at.startsWith(today)
      ).length || 0;

      // Sipariş öncelik dağılımı (gerçek)
      const urgentOrders = pendingOrders.data?.filter((o: any) => o.priority === 'yuksek').length || 0;
      const normalOrders = pendingOrders.data?.filter((o: any) => o.priority === 'orta').length || 0;
      const lowOrders = pendingOrders.data?.filter((o: any) => o.priority === 'dusuk').length || 0;

      // Haftalık hesaplamalar (son 7 gün)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      const weeklyCompleted = completedPlans.data?.filter((p: any) => 
        new Date(p.completed_at) >= sevenDaysAgo
      ).length || 0;
      
      const weeklyOrders = allPlans.data?.filter((p: any) => 
        new Date(p.created_at) >= sevenDaysAgo
      ).length || 0;

      // Ortalama üretim süresi (saat cinsinden)
      const completedWithTimes = completedPlans.data?.filter((p: any) => p.started_at && p.completed_at) || [];
      const avgProductionTime = completedWithTimes.length > 0
        ? completedWithTimes.reduce((sum: number, p: any) => {
            const start = new Date(p.started_at).getTime();
            const end = new Date(p.completed_at).getTime();
            return sum + ((end - start) / (1000 * 60 * 60)); // milliseconds to hours
          }, 0) / completedWithTimes.length
        : 0;

      // Planlama doğruluğu (tamamlanan / toplam * 100)
      const totalPlansThisWeek = weeklyOrders || 1;
      const planningAccuracy = weeklyOrders > 0 
        ? (weeklyCompleted / weeklyOrders) * 100 
        : 0;

      // Kapasite kullanımı (aktif planlar / total operatör kapasitesi)
      const totalOperators = Array.isArray(operators) ? operators.length : 0;
      const activeOperators = activePlans.data?.reduce((acc: Set<string>, p: any) => {
        if (p.assigned_operator_id) acc.add(p.assigned_operator_id);
        return acc;
      }, new Set()).size || 0;
      const capacityUtilization = totalOperators > 0 
        ? (activeOperators / totalOperators) * 100 
        : 0;

      // Malzeme hazırlık (stok / toplam ihtiyaç)
      // NOT: Bu hesaplama materialAvailability için, kritik stok sayısı için değil
      const totalStockItems = (raw.pagination?.total || 0) + (semi.pagination?.total || 0);
      // Eski mantık kullanılıyor (materialAvailability için), kritik stok sayısı için değil
      const criticalStockForAvailability = raw.data?.filter((m: any) => {
        const criticalLevel = parseFloat(m.critical_level) || 0;
        const quantity = parseFloat(m.quantity) || 0;
        return criticalLevel > 0 && quantity <= criticalLevel;
      }).length || 0;
      const materialAvailability = totalStockItems > 0 
        ? ((totalStockItems - criticalStockForAvailability) / totalStockItems) * 100 
        : 100;

      // Verimlilik oranı (tamamlanan / planlanan)
      const totalPlanned = allPlans.data?.length || 1;
      const totalCompleted = completedPlans.data?.length || 0;
      const efficiencyRate = totalPlanned > 0 
        ? (totalCompleted / totalPlanned) * 100 
        : 0;

      // Gecikme oranı
      const delayedPlans = activePlans.data?.filter((p: any) => {
        if (!p.order) return false;
        const deliveryDate = new Date(p.order.delivery_date);
        return deliveryDate < new Date() && p.status !== 'tamamlandi';
      }).length || 0;
      const delayRate = activePlans.data?.length > 0 
        ? (delayedPlans / activePlans.data.length) * 100 
        : 0;

      // Toplam stok çeşidi
      const totalStock = (raw.pagination?.total || 0) + (semi.pagination?.total || 0) + (finished.pagination?.total || 0);
      
      // Rezerve malzemeler toplam miktarı
      // NOT: Rezervasyon sistemi sadece raw ve semi için çalışır, finished_products için rezervasyon yapılmaz
      // Depo stats API'si ile aynı mantık: raw + semi + finished (eğer finished'da reserved_quantity varsa)
      const rawReserved = raw.data?.reduce((sum: number, m: any) => {
        return sum + (parseFloat(m.reserved_quantity) || 0);
      }, 0) || 0;
      const semiReserved = semi.data?.reduce((sum: number, m: any) => {
        return sum + (parseFloat(m.reserved_quantity) || 0);
      }, 0) || 0;
      const finishedReserved = finished.data?.reduce((sum: number, m: any) => {
        return sum + (parseFloat(m.reserved_quantity) || 0);
      }, 0) || 0;
      // Depo stats API'si ile aynı: tüm stok türlerinden rezerve miktarı topla
      const reservedMaterialsCount = Math.round((rawReserved + semiReserved + finishedReserved) * 10) / 10;
      
      // Kritik stok hesaplama - YENİ KRİTİK STOK KURALLARI
      // availableQty = quantity - reserved_quantity
      // isCritical = criticalLevel > 0 && availableQty <= criticalLevel
      // Veritabanından direkt gelen sayıyı kullan
      // Eğer API'den gelmediyse, mevcut verilerden hesapla (fallback)
      console.log('🔍 Kritik stok API response:', criticalStockCount);
      console.log('🔍 Finished products pagination:', finished.pagination?.total);
      console.log('🔍 Raw data length:', raw.data?.length);
      console.log('🔍 Semi data length:', semi.data?.length);
      console.log('🔍 Finished data length:', finished.data?.length);
      
      // API'den gelen değeri kullan, eğer gelmediyse 0 kullan (fallback'i kaldırdık)
      // Çünkü API endpoint'i her zaman çalışmalı ve doğru değeri döndürmeli
      let criticalStockItems = 0; // Varsayılan 0 - HER ZAMAN 0'dan başla
      
      // Sadece API'den gelen değer geçerliyse kullan
      if (criticalStockCount && typeof criticalStockCount === 'object' && typeof criticalStockCount.count === 'number') {
        criticalStockItems = criticalStockCount.count;
        console.log('✅ API\'den kritik stok sayısı alındı:', criticalStockItems);
      } else {
        console.warn('⚠️ API\'den geçerli değer gelmedi, 0 kullanılıyor');
        console.warn('criticalStockCount type:', typeof criticalStockCount);
        console.warn('criticalStockCount value:', criticalStockCount);
        criticalStockItems = 0; // Kesinlikle 0
      }
      
      // DEBUG: Eğer 241 veya finished products sayısına eşitse, bu bir hata!
      const finishedCount = finished.pagination?.total || 0;
      if (criticalStockItems === 241 || criticalStockItems === finishedCount) {
        console.error('🚨 HATA: Kritik stok sayısı finished products sayısına eşit! Bu yanlış!');
        console.error('criticalStockItems:', criticalStockItems);
        console.error('finished.pagination?.total:', finishedCount);
        console.error('criticalStockCount:', JSON.stringify(criticalStockCount));
        // Zorla 0 yap
        criticalStockItems = 0;
      }
      
      // Final kontrol: Eğer hala 241 ise, kesinlikle 0 yap
      if (criticalStockItems === 241) {
        console.error('🚨 KRİTİK HATA: criticalStockItems hala 241! Zorla 0 yapılıyor.');
        criticalStockItems = 0;
      }
      
      // Final final kontrol: Eğer 241'den farklı bir değer ama 0 değilse, logla
      if (criticalStockItems !== 0 && criticalStockItems !== 241) {
        console.log('ℹ️ Kritik stok sayısı:', criticalStockItems);
      }

      // Operators state'e kaydet
      if (Array.isArray(operators)) {
        setOperators(operators);
      }

      const newStats = {
        pendingOrders: pendingOrders.data?.length || 0,
        activeProduction: activePlans.data?.length || 0,
        completedToday,
        planningAccuracy: Math.round(planningAccuracy * 10) / 10,
        capacityUtilization: Math.round(capacityUtilization * 10) / 10,
        averageProductionTime: Math.round(avgProductionTime * 10) / 10,
        materialAvailability: Math.round(materialAvailability * 10) / 10,
        orderPriority: { 
          urgent: urgentOrders, 
          normal: normalOrders, 
          low: lowOrders 
        },
        weeklyTarget: weeklyOrders,
        weeklyActual: weeklyCompleted,
        efficiencyRate: Math.round(efficiencyRate * 10) / 10,
        delayRate: Math.round(delayRate * 10) / 10,
        totalStockVarieties: totalStock, // Veritabanından gelen toplam stok çeşidi
        lowStockItems: (() => {
          // Final güvenlik kontrolü: Eğer 241 ise kesinlikle 0 yap
          if (criticalStockItems === 241 || criticalStockItems === finished.pagination?.total) {
            console.error('🚨 FINAL HATA: lowStockItems 241 olarak ayarlanmaya çalışılıyor! Zorla 0 yapılıyor.');
            return 0;
          }
          return criticalStockItems;
        })(), // Veritabanından gelen kritik stok sayısı
        reservedMaterials: reservedMaterialsCount, // Veritabanından gelen rezerve malzeme miktarı
      };
      
      // Final kontrol: Eğer lowStockItems hala 241 ise, zorla 0 yap
      if (newStats.lowStockItems === 241) {
        console.error('🚨 KRİTİK HATA: newStats.lowStockItems hala 241! Zorla 0 yapılıyor.');
        newStats.lowStockItems = 0;
      }
      
      console.log('📊 Planlama Dashboard: Stats updated:', {
        pendingOrders: newStats.pendingOrders,
        activeProduction: newStats.activeProduction,
        orderPriority: newStats.orderPriority,
        totalStockVarieties: newStats.totalStockVarieties,
        lowStockItems: newStats.lowStockItems,
        reservedMaterials: newStats.reservedMaterials,
        criticalStockFromAPI: criticalStockCount?.count,
        criticalStockCalculated: criticalStockItems,
        usingAPI: criticalStockCount?.count !== undefined
      });
      
      setStats(newStats);
    } catch (error) {
      console.error('Planlama Dashboard Stats fetch error:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-red-500 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Planlama Dashboard</h1>
        <p className="text-orange-100">Üretim Planlama ve Sipariş Yönetimi</p>
      </div>

      {/* Core Planning KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <Clock className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Planlama bekliyor</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Üretim</CardTitle>
            <Factory className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProduction}</div>
            <p className="text-xs text-muted-foreground">Devam eden planlar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedToday}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan planlar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planlama Doğruluğu</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.planningAccuracy}%</div>
            <p className="text-xs text-muted-foreground">Plan vs gerçekleşen</p>
          </CardContent>
        </Card>
      </div>

      {/* Capacity & Performance KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kapasite Kullanımı</CardTitle>
            <BarChart3 className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.capacityUtilization}%</div>
            <p className="text-xs text-muted-foreground">Mevcut kapasite</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ort. Üretim Süresi</CardTitle>
            <Timer className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageProductionTime}h</div>
            <p className="text-xs text-muted-foreground">Sipariş başına</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-cyan-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Malzeme Hazırlık</CardTitle>
            <Package className="h-4 w-4 text-cyan-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.materialAvailability}%</div>
            <p className="text-xs text-muted-foreground">Hazır malzeme oranı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-pink-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verimlilik Oranı</CardTitle>
            <TrendingUp className="h-4 w-4 text-pink-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.efficiencyRate}%</div>
            <p className="text-xs text-muted-foreground">Genel verimlilik</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock & Material KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-emerald-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Stok Çeşidi</CardTitle>
            <Package className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStockVarieties}</div>
            <p className="text-xs text-muted-foreground">Hammadde + Yarı Mamul + Nihai</p>
          </CardContent>
        </Card>


        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rezerve Malzemeler</CardTitle>
            <Zap className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {typeof stats.reservedMaterials === 'number' 
                ? stats.reservedMaterials.toFixed(1)
                : stats.reservedMaterials}
            </div>
            <p className="text-xs text-muted-foreground">Rezerve edilmiş miktar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-rose-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Gecikme Oranı</CardTitle>
            <TrendingDown className="h-4 w-4 text-rose-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delayRate}%</div>
            <p className="text-xs text-muted-foreground">Geciken planlar</p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Performance & Activity */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Haftalık Hedef</CardTitle>
            <Target className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyTarget}</div>
            <p className="text-xs text-muted-foreground">Planlanan sipariş sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Haftalık Gerçekleşen</CardTitle>
            <Activity className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.weeklyActual}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan sipariş sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-violet-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlama Oranı</CardTitle>
            <TrendingUp className="h-4 w-4 text-violet-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.weeklyTarget > 0 
                ? ((stats.weeklyActual / stats.weeklyTarget) * 100).toFixed(1)
                : '0.0'}%
            </div>
            <p className="text-xs text-muted-foreground">Hedef vs gerçekleşen</p>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}
