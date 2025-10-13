'use client';

import { useEffect, useState } from 'react';
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
      const [raw, semi, finished, plans, orders] = await Promise.all([
        fetch('/api/stock/raw?limit=1').then(async r => {
          if (!r.ok) return { pagination: { total: 0 } };
          const text = await r.text();
          if (text === '/login' || text.trim() === '') return { pagination: { total: 0 } };
          try {
            return JSON.parse(text);
          } catch {
            return { pagination: { total: 0 } };
          }
        }),
        fetch('/api/stock/semi?limit=1').then(async r => {
          if (!r.ok) return { pagination: { total: 0 } };
          const text = await r.text();
          if (text === '/login' || text.trim() === '') return { pagination: { total: 0 } };
          try {
            return JSON.parse(text);
          } catch {
            return { pagination: { total: 0 } };
          }
        }),
        fetch('/api/stock/finished?limit=1').then(async r => {
          if (!r.ok) return { pagination: { total: 0 } };
          const text = await r.text();
          if (text === '/login' || text.trim() === '') return { pagination: { total: 0 } };
          try {
            return JSON.parse(text);
          } catch {
            return { pagination: { total: 0 } };
          }
        }),
        fetch('/api/production/plans?status=planlandi,devam_ediyor').then(async r => {
          if (!r.ok) return { data: [] };
          const text = await r.text();
          if (text === '/login' || text.trim() === '') return { data: [] };
          try {
            return JSON.parse(text);
          } catch {
            return { data: [] };
          }
        }),
        fetch('/api/orders?status=beklemede,onaylandi').then(async r => {
          if (!r.ok) return { data: [] };
          const text = await r.text();
          if (text === '/login' || text.trim() === '') return { data: [] };
          try {
            return JSON.parse(text);
          } catch {
            return { data: [] };
          }
        }),
      ]);

      const totalStock = (raw.pagination?.total || 0) + (semi.pagination?.total || 0) + (finished.pagination?.total || 0);
      const pendingCount = orders.data?.length || 0;
      const activeCount = plans.data?.length || 0;

      setStats({
        pendingOrders: pendingCount,
        activeProduction: activeCount,
        completedToday: Math.floor(activeCount * 0.4), // Mock calculation
        planningAccuracy: 92.5, // Mock data
        capacityUtilization: 78.3, // Mock data
        averageProductionTime: 3.8, // Mock data in hours
        materialAvailability: 88.7, // Mock data
        orderPriority: { 
          urgent: Math.floor(pendingCount * 0.2), 
          normal: Math.floor(pendingCount * 0.6), 
          low: Math.floor(pendingCount * 0.2) 
        },
        weeklyTarget: 45, // Mock data
        weeklyActual: 38, // Mock data
        efficiencyRate: 84.4, // Mock data
        delayRate: 12.3, // Mock data
        totalStockVarieties: totalStock,
        lowStockItems: Math.floor((raw.pagination?.total || 0) * 0.15), // Mock calculation
        reservedMaterials: Math.floor((raw.pagination?.total || 0) * 0.3), // Mock calculation
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
                  {((stats.weeklyActual / stats.weeklyTarget) * 100).toFixed(1)}%
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
                <Badge variant="default">2</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Boşta Operatör</span>
                <Badge variant="secondary">1</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Ort. Verimlilik</span>
                <Badge variant="outline">85%</Badge>
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
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Calendar className="h-4 w-4 mr-2" />
                Yeni Üretim Planı
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Clock className="h-4 w-4 mr-2" />
                Sipariş Önceliklendir
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <Package className="h-4 w-4 mr-2" />
                Malzeme Kontrolü
              </Button>
              <Button variant="outline" size="sm" className="w-full justify-start">
                <BarChart3 className="h-4 w-4 mr-2" />
                Kapasite Raporu
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
