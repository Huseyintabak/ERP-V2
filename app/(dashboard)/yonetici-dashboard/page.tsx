'use client';

import { useEffect, useState } from 'react';
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
  Zap,
  Bot,
  MessageSquare,
  Brain,
  Sparkles,
  Calendar
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
  
  const [aiStats, setAiStats] = useState<any>(null);
  const [aiCosts, setAiCosts] = useState<any>(null);
  const [aiLoading, setAiLoading] = useState(true);

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
    fetchAIStats();
    fetchAICosts();
  }, [actions]);
  
  const fetchAIStats = async () => {
    try {
      const res = await fetch('/api/ai/dashboard');
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setAiStats(data);
      }
    } catch (error) {
      console.error('AI stats fetch error:', error);
    } finally {
      setAiLoading(false);
    }
  };
  
  const fetchAICosts = async () => {
    try {
      const res = await fetch('/api/ai/costs?period=month');
      const data = await res.json();
      if (res.ok && data.success !== false) {
        setAiCosts(data);
      }
    } catch (error) {
      console.error('AI costs fetch error:', error);
    }
  };

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
    dailyRevenue: 0,
    totalOrders: 0,
    averageOrderValue: 0,
    totalStockValue: 0,
    stockValueBreakdown: {
      rawMaterials: { count: 0, quantity: 0, value: 0 },
      semiFinished: { count: 0, quantity: 0, value: 0 },
      finishedProducts: { count: 0, quantity: 0, value: 0 }
    },
    pendingOrders: 0,
    inProductionOrders: 0,
    completedOrders: 0,
    activeProductionPlans: 0,
    totalCustomers: 0,
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
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
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
            <div className="text-2xl font-bold">₺{(currentStats.dailyRevenue || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Bugün tamamlanan siparişler</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Sipariş Değeri</CardTitle>
            <TrendingUp className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{currentStats.averageOrderValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Tüm siparişler için ortalama</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stok Değeri</CardTitle>
            <BarChart3 className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₺{currentStats.totalStockValue.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mb-3">Toplam stok değeri (işçilik hariç)</p>
            
            {/* Detailed Breakdown - Table Format */}
            <div className="mt-3 pt-3 border-t">
              <div className="space-y-2">
                {/* Header */}
                <div className="grid grid-cols-4 gap-2 text-xs font-semibold text-muted-foreground pb-1 border-b">
                  <div>Tip</div>
                  <div className="text-right">Adet</div>
                  <div className="text-right">Miktar</div>
                  <div className="text-right">Değer</div>
                </div>
                
                {/* Hammaddeler */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium">Hammaddeler</div>
                  <div className="text-right">{currentStats.stockValueBreakdown?.rawMaterials?.count || 0}</div>
                  <div className="text-right">{(currentStats.stockValueBreakdown?.rawMaterials?.quantity || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                  <div className="text-right font-semibold">₺{(currentStats.stockValueBreakdown?.rawMaterials?.value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                </div>
                
                {/* Yarı Mamuller */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium">Yarı Mamuller</div>
                  <div className="text-right">{currentStats.stockValueBreakdown?.semiFinished?.count || 0}</div>
                  <div className="text-right">{(currentStats.stockValueBreakdown?.semiFinished?.quantity || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                  <div className="text-right font-semibold">₺{(currentStats.stockValueBreakdown?.semiFinished?.value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                </div>
                
                {/* Nihai Ürünler */}
                <div className="grid grid-cols-4 gap-2 text-xs">
                  <div className="font-medium">Nihai Ürünler</div>
                  <div className="text-right">{currentStats.stockValueBreakdown?.finishedProducts?.count || 0}</div>
                  <div className="text-right">{(currentStats.stockValueBreakdown?.finishedProducts?.quantity || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                  <div className="text-right font-semibold">₺{(currentStats.stockValueBreakdown?.finishedProducts?.value || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })}</div>
                </div>
              </div>
            </div>
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
            <p className="text-xs text-muted-foreground">Bugün onay bekliyor</p>
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
              <Calendar className="h-5 w-5 text-teal-600" />
              Aktif Üretim Planları
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{currentStats.activeProductionPlans}</div>
                <p className="text-sm text-muted-foreground mt-1">Devam eden plan sayısı</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">
                  {currentStats.inProductionOrders > 0 ? `${currentStats.inProductionOrders} sipariş` : 'Aktif yok'}
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Üretimdeki siparişler</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-emerald-600" />
              Toplam Müşteri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-3xl font-bold">{currentStats.totalCustomers}</div>
                <p className="text-sm text-muted-foreground mt-1">Kayıtlı müşteri sayısı</p>
              </div>
              <div className="text-right">
                <Badge variant="outline" className="text-xs">
                  Aktif
                </Badge>
                <p className="text-xs text-muted-foreground mt-2">Tüm müşteriler</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Statistics */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-purple-600" />
            AI Agent İstatistikleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="border-l-4 border-l-blue-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aktif Agent'lar</CardTitle>
                <Bot className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiLoading ? '...' : (aiStats?.agents?.length || 0)}
                </div>
                <p className="text-xs text-muted-foreground">Toplam agent sayısı</p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-green-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Konuşmalar</CardTitle>
                <MessageSquare className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiLoading ? '...' : (aiStats?.stats?.conversations?.total || 0)}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge className="bg-green-100 text-green-800 text-xs">
                    {aiStats?.stats?.conversations?.completed || 0} tamamlandı
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800 text-xs">
                    {aiStats?.stats?.conversations?.inProgress || 0} devam ediyor
                  </Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-orange-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Aylık AI Maliyeti</CardTitle>
                <DollarSign className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  ${aiLoading ? '...' : (aiCosts?.summary?.totalCost?.toFixed(4) || '0.0000')}
                </div>
                <p className="text-xs text-muted-foreground">
                  {aiCosts?.summary?.totalTokens?.toLocaleString() || 0} tokens kullanıldı
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-purple-500">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">AI Onaylar</CardTitle>
                <CheckCircle className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {aiLoading ? '...' : (aiStats?.stats?.approvals?.pending || 0)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {aiStats?.stats?.approvals?.approved || 0} onaylandı, {aiStats?.stats?.approvals?.rejected || 0} reddedildi
                </p>
              </CardContent>
            </Card>
          </div>

          {/* AI Quick Links */}
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors justify-start"
              onClick={() => router.push('/ai-dashboard')}
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <div className="text-left">
                  <div className="font-medium">AI Dashboard</div>
                  <div className="text-sm text-muted-foreground">Agent performans ve metrikler</div>
                </div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-green-50 hover:border-green-300 transition-colors justify-start"
              onClick={() => router.push('/ai-konusmalar')}
            >
              <div className="flex items-center gap-3">
                <MessageSquare className="h-5 w-5 text-green-600" />
                <div className="text-left">
                  <div className="font-medium">AI Konuşmalar</div>
                  <div className="text-sm text-muted-foreground">Agent konuşma geçmişi</div>
                </div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-orange-50 hover:border-orange-300 transition-colors justify-start"
              onClick={() => router.push('/ai-maliyetler')}
            >
              <div className="flex items-center gap-3">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                <div className="text-left">
                  <div className="font-medium">AI Maliyetler</div>
                  <div className="text-sm text-muted-foreground">Maliyet analizi ve raporlar</div>
                </div>
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
