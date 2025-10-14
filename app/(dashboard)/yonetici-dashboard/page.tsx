'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  CheckCircle, 
  Clock, 
  Users, 
  AlertTriangle,
  BarChart3,
  Factory,
  Target,
  Activity,
  Zap
} from 'lucide-react';
import { useDashboardStats, useDashboardActions, useDashboardLoading } from '@/stores/dashboard-stats-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';
import { InventoryApprovalList } from '@/components/stock/inventory-approval-list';
// import { useMemoryLeakDetector } from '@/lib/hooks/use-memory-leak-detector';
// import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
// import { useStoreSync } from '@/lib/hooks/use-store-sync';

export default function YoneticiDashboard() {
  const router = useRouter();
  const { user } = useAuthStore();
  const stats = useDashboardStats('yonetici');
  const loading = useDashboardLoading('yonetici');
  const actions = useDashboardActions();

  // Performance and memory monitoring - DISABLED FOR NOW
  // const memoryDetector = useMemoryLeakDetector('YoneticiDashboard');
  // const performanceMonitor = usePerformanceMonitor('YoneticiDashboard');
  // const { syncStatus, manualSync, hasSyncErrors, getSyncHealthScore } = useStoreSync({
  //   autoSync: true,
  //   syncInterval: 30000,
  //   retryAttempts: 3,
  //   retryDelay: 1000,
  // });

  // Real-time subscriptions for yönetici role
  useRoleBasedRealtime('yonetici');

  useEffect(() => {
    actions.fetchStats('yonetici');
  }, [actions]);

  // Show loading state
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Dashboard yükleniyor...</p>
        </div>
      </div>
    );
  }

  // Default stats if not loaded
  const defaultStats = {
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalStockValue: 0,
    pendingOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    activeProductionPlans: 0,
    totalRawMaterials: 0,
    totalSemiFinished: 0,
    totalFinished: 0,
    criticalStockItems: 0,
    lowStockItems: 0,
    productionEfficiency: 0,
    onTimeDelivery: 0,
    operatorUtilization: 0,
  };

  const currentStats = stats || defaultStats;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Yönetici Dashboard</h1>
        <p className="text-blue-100">Thunder ERP - Executive Overview & Analytics</p>
      </div>

      {/* Financial KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aylık Ciro</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{currentStats.monthlyRevenue.toLocaleString()}</div>
            <div className="flex items-center text-xs">
              <TrendingUp className="h-3 w-3 text-green-500 mr-1" />
              <span className="text-green-600">+12.5%</span>
              <span className="text-muted-foreground ml-2">geçen aya göre</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Ciro</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{currentStats.averageOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Ortalama sipariş değeri</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Değeri</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{currentStats.totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Toplam stok değeri</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Verimlilik Oranı</CardTitle>
            <Target className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.productionEfficiency.toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">Üretim verimliliği</p>
          </CardContent>
        </Card>
      </div>

      {/* Operational KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.completedOrders}</div>
            <p className="text-xs text-muted-foreground">Tamamlanan sipariş</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <Clock className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.pendingOrders}</div>
            <p className="text-xs text-muted-foreground">Onay bekliyor</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Üretim</CardTitle>
            <Factory className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.activeProductionPlans}</div>
            <p className="text-xs text-muted-foreground">Üretim planı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currentStats.criticalStockItems}</div>
            <p className="text-xs text-muted-foreground">Minimum altında</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Analytics */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Stok Analizi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Hammaddeler</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{currentStats.totalRawMaterials}</span>
                  <Badge variant="outline">₺{(currentStats.totalRawMaterials * 800).toLocaleString()}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Yarı Mamuller</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{currentStats.totalSemiFinished}</span>
                  <Badge variant="outline">₺{(currentStats.totalSemiFinished * 1200).toLocaleString()}</Badge>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Nihai Ürünler</span>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{currentStats.totalFinished}</span>
                  <Badge variant="outline">₺{(currentStats.totalFinished * 2000).toLocaleString()}</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Factory className="h-5 w-5 text-orange-600" />
              Performans Metrikleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Toplam Sipariş</span>
                <Badge variant="secondary">{currentStats.totalOrders}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Zamanında Teslimat</span>
                <Badge variant="default">{currentStats.onTimeDelivery.toFixed(1)}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Operatör Kullanımı</span>
                <Badge variant="outline">{currentStats.operatorUtilization.toFixed(1)}%</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Üretimde Sipariş</span>
                <Badge variant="destructive">{currentStats.inProductionOrders} sipariş</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-600" />
            Hızlı İşlemler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => router.push('/uretim/siparisler')}
            >
              <div className="text-left">
                <div className="font-medium">Sipariş Onayla</div>
                <div className="text-sm text-muted-foreground">Bekleyen siparişleri incele</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => router.push('/raporlar')}
            >
              <div className="text-left">
                <div className="font-medium">Stok Raporu</div>
                <div className="text-sm text-muted-foreground">Detaylı stok analizi</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-orange-50 hover:border-orange-300 transition-colors"
              onClick={() => router.push('/uretim/planlar')}
            >
              <div className="text-left">
                <div className="font-medium">Üretim Planı</div>
                <div className="text-sm text-muted-foreground">Üretim planlarını görüntüle</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-purple-50 hover:border-purple-300 transition-colors"
              onClick={() => router.push('/kullanicilar')}
            >
              <div className="text-left">
                <div className="font-medium">Kullanıcı Yönetimi</div>
                <div className="text-sm text-muted-foreground">Sistem kullanıcılarını yönet</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Envanter Sayım Onayları */}
      <InventoryApprovalList />
    </div>
  );
}
