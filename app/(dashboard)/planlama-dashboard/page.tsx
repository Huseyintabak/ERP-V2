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
  Calendar,
  Target,
  TrendingUp,
  AlertTriangle,
  Package,
  Timer,
  BarChart3,
  Zap,
  Users
} from 'lucide-react';
import { useRealtime } from '@/lib/hooks/use-realtime';
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
  useRealtime('raw_materials', fetchStats);
  useRealtime('semi_finished_products', fetchStats);
  useRealtime('finished_products', fetchStats);
  useRealtime('production_plans', fetchStats);
  useRealtime('orders', fetchStats);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
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
        movements
      ] = await Promise.all([
        // Stok sayıları
        fetch('/api/stock/raw?limit=1').then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        fetch('/api/stock/semi?limit=1').then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        fetch('/api/stock/finished?limit=1').then(r => r.ok ? r.json() : { pagination: { total: 0 }, data: [] }),
        
        // Aktif üretim planları
        fetch('/api/production/plans?status=planlandi,devam_ediyor&limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        
        // Bekleyen siparişler
        fetch('/api/orders?status=beklemede&limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        
        // Bugün tamamlanan planlar
        fetch('/api/production/plans?status=tamamlandi&limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        
        // Tüm planlar (haftalık hesap için)
        fetch('/api/production/plans?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        
        // Operatörler
        fetch('/api/operators').then(r => r.ok ? r.json() : []),
        
        // Rezervasyonlar
        fetch('/api/stock/raw?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        
        // Son 7 günün hareketleri
        fetch('/api/stock/movements?limit=1000').then(r => r.ok ? r.json() : { data: [] })
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
      const totalStockItems = (raw.pagination?.total || 0) + (semi.pagination?.total || 0);
      const criticalStock = raw.data?.filter((m: any) => m.quantity <= m.critical_level).length || 0;
      const materialAvailability = totalStockItems > 0 
        ? ((totalStockItems - criticalStock) / totalStockItems) * 100 
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

      // Düşük stok (gerçek)
      const lowStockItems = (raw.data?.filter((m: any) => 
        m.quantity <= m.min_level && m.quantity > m.critical_level
      ).length || 0);

      // Toplam stok çeşidi
      const totalStock = (raw.pagination?.total || 0) + (semi.pagination?.total || 0) + (finished.pagination?.total || 0);

      // Operators state'e kaydet
      if (Array.isArray(operators)) {
        setOperators(operators);
      }

      setStats({
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
        totalStockVarieties: totalStock,
        lowStockItems,
        reservedMaterials: totalStockItems,
      });
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

      {/* Weekly Performance */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-blue-600" />
              Haftalık Performans
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Haftalık Hedef</span>
                <Badge variant="outline">{stats.weeklyTarget} sipariş</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gerçekleşen</span>
                <Badge variant={stats.weeklyActual >= stats.weeklyTarget ? "default" : "destructive"}>
                  {stats.weeklyActual} sipariş
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Tamamlama Oranı</span>
                <Badge variant="secondary">
                  {stats.weeklyTarget > 0 
                    ? ((stats.weeklyActual / stats.weeklyTarget) * 100).toFixed(1) 
                    : '0.0'}%
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Gecikme Oranı</span>
                <Badge variant="destructive">{stats.delayRate}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              Sipariş Öncelik Dağılımı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Acil Siparişler</span>
                <Badge variant="destructive">{stats.orderPriority.urgent}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Normal Siparişler</span>
                <Badge variant="default">{stats.orderPriority.normal}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Düşük Öncelik</span>
                <Badge variant="secondary">{stats.orderPriority.low}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Toplam Bekleyen</span>
                <Badge variant="outline">{stats.pendingOrders}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Stock & Material Status */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-green-600" />
              Stok Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Toplam Stok Çeşidi</span>
                <Badge variant="outline">{stats.totalStockVarieties}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Düşük Stok</span>
                <Badge variant="destructive">{stats.lowStockItems}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Rezerve Malzemeler</span>
                <Badge variant="secondary">{stats.reservedMaterials}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-purple-600" />
              Operatör Durumu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Aktif Operatör</span>
                <Badge variant="default">{stats.activeProduction > 0 ? Math.min(stats.activeProduction, Array.isArray(operators) ? operators.length : 0) : 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Toplam Operatör</span>
                <Badge variant="secondary">{Array.isArray(operators) ? operators.length : 0}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Kapasite Kullanımı</span>
                <Badge variant="outline">{stats.capacityUtilization.toFixed(1)}%</Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-yellow-600" />
              Hızlı İşlemler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start hover:bg-blue-50"
                onClick={() => router.push('/uretim/siparisler')}
              >
                <Calendar className="h-4 w-4 mr-2" />
                Yeni Sipariş Oluştur
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start hover:bg-orange-50"
                onClick={() => router.push('/uretim/planlar')}
              >
                <Factory className="h-4 w-4 mr-2" />
                Üretim Planları
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start hover:bg-green-50"
                onClick={() => router.push('/stok/hammaddeler')}
              >
                <Package className="h-4 w-4 mr-2" />
                Stok Kontrolü
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full justify-start hover:bg-purple-50"
                onClick={() => router.push('/raporlar')}
              >
                <BarChart3 className="h-4 w-4 mr-2" />
                Raporlar
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
