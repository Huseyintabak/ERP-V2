'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Package, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  Zap,
  ArrowUpDown,
  Calendar,
  DollarSign,
  Activity
} from 'lucide-react';
import { useRealtime } from '@/lib/hooks/use-realtime';
import { QuickStockEntryDialog } from '@/components/stock/quick-stock-entry-dialog';
import { InventoryCountDialog } from '@/components/stock/inventory-count-dialog';
// import { useMemoryLeakDetector } from '@/lib/hooks/use-memory-leak-detector';
// import { usePerformanceMonitor } from '@/lib/hooks/use-performance-monitor';
// import { useStoreSync } from '@/lib/hooks/use-store-sync';

interface DepoStats {
  // Stock Count KPIs
  rawMaterials: number;
  semiFinished: number;
  finished: number;
  totalStock: number;
  
  // Total Stock Quantities
  totalRawQuantity: number;
  totalSemiQuantity: number;
  totalFinishedQuantity: number;
  
  // Stock Movement KPIs
  dailyInbound: number;
  dailyOutbound: number;
  stockTurnover: { high: number; medium: number; low: number };
  
  // Critical Stock KPIs
  criticalStock: number;
  reservedStock: number;
  
  // Value & Age KPIs
  totalStockValue: number;
  averageStockAge: number;
  oldestStock: number;
  newestStock: number;
  
  // Movement Trends
  weeklyInbound: number;
  weeklyOutbound: number;
  stockMovementTrend: number;
}

export default function DepoDashboard() {
  const router = useRouter();
  
  // Performance and memory monitoring - DISABLED FOR NOW
  // const memoryDetector = useMemoryLeakDetector('DepoDashboard');
  // const performanceMonitor = usePerformanceMonitor('DepoDashboard');
  // const { syncStatus, manualSync, hasSyncErrors, getSyncHealthScore } = useStoreSync({
  //   autoSync: true,
  //   syncInterval: 30000,
  //   retryAttempts: 3,
  //   retryDelay: 1000,
  // });

  const [stats, setStats] = useState<DepoStats>({
    rawMaterials: 0,
    semiFinished: 0,
    finished: 0,
    totalStock: 0,
    totalRawQuantity: 0,
    totalSemiQuantity: 0,
    totalFinishedQuantity: 0,
    dailyInbound: 0,
    dailyOutbound: 0,
    stockTurnover: { high: 0, medium: 0, low: 0 },
    criticalStock: 0,
    reservedStock: 0,
    totalStockValue: 0,
    averageStockAge: 0,
    oldestStock: 0,
    newestStock: 0,
    weeklyInbound: 0,
    weeklyOutbound: 0,
    stockMovementTrend: 0,
  });

  const [stockEntryOpen, setStockEntryOpen] = useState(false);
  const [stockExitOpen, setStockExitOpen] = useState(false);
  const [inventoryCountOpen, setInventoryCountOpen] = useState(false);

  // Real-time subscriptions
  useRealtime('raw_materials', fetchStats);
  useRealtime('semi_finished_products', fetchStats);
  useRealtime('finished_products', fetchStats);
  useRealtime('stock_movements', fetchStats);

  useEffect(() => {
    fetchStats();
  }, []);

  async function fetchStats() {
    try {
      // Fetch real statistics from new API endpoint
      const response = await fetch('/api/dashboard/depo-stats');
      
      if (!response.ok) {
        console.error('Failed to fetch depo stats:', response.status);
        return;
      }

      const text = await response.text();
      if (text === '/login' || text.trim() === '' || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }

      const result = JSON.parse(text);
      
      if (result.data) {
        setStats(result.data);
      }
    } catch (error) {
      console.error('Depo Dashboard Stats fetch error:', error);
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-blue-500 rounded-lg p-6 text-white">
        <h1 className="text-3xl font-bold">Depo Dashboard</h1>
        <p className="text-green-100">Stok Yönetimi ve Envanter Takibi</p>
      </div>

      {/* Core Stock KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hammaddeler</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.rawMaterials}</div>
            <p className="text-xs text-muted-foreground">Çeşit sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yarı Mamuller</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.semiFinished}</div>
            <p className="text-xs text-muted-foreground">Çeşit sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nihai Ürünler</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.finished}</div>
            <p className="text-xs text-muted-foreground">Çeşit sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Stok</CardTitle>
            <Package className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalStock}</div>
            <p className="text-xs text-muted-foreground">Toplam çeşit</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Movement KPIs */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Giriş</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailyInbound}</div>
            <p className="text-xs text-muted-foreground">Bugün gelen</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Çıkış</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailyOutbound}</div>
            <p className="text-xs text-muted-foreground">Bugün giden</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-indigo-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rezerve Stok</CardTitle>
            <Package className="h-4 w-4 text-indigo-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.reservedStock.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Rezerve edilmiş ürün</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-teal-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Hareket</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-teal-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.dailyInbound + stats.dailyOutbound}</div>
            <p className="text-xs text-muted-foreground">Bugünkü giriş + çıkış</p>
          </CardContent>
        </Card>
      </div>

      {/* Total Stock Quantities */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hammade Toplam Stok</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalRawQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Toplam miktar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yarı Mamuller Toplam Stok</CardTitle>
            <Package className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalSemiQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Toplam miktar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nihai Ürün Toplam Stok</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFinishedQuantity.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">Toplam miktar</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
            <AlertTriangle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.criticalStock}</div>
            <p className="text-xs text-muted-foreground">Minimum altında</p>
          </CardContent>
        </Card>
      </div>

      {/* Stock Analysis */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-blue-600" />
              Stok Devir Hızı Analizi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Yüksek Devir Hızı</span>
                <div className="flex items-center gap-2">
                  <Badge variant="default">{stats.stockTurnover.high}</Badge>
                  <span className="text-xs text-muted-foreground">ürün</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Orta Devir Hızı</span>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{stats.stockTurnover.medium}</Badge>
                  <span className="text-xs text-muted-foreground">ürün</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Düşük Devir Hızı</span>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{stats.stockTurnover.low}</Badge>
                  <span className="text-xs text-muted-foreground">ürün</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Haftalık Hareket Trendi</span>
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-3 w-3 text-green-500" />
                  <Badge variant="default">+{stats.stockMovementTrend}%</Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-orange-600" />
              Haftalık Stok Hareketleri
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Haftalık Giriş</span>
                <Badge variant="default">{stats.weeklyInbound} ürün</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Haftalık Çıkış</span>
                <Badge variant="secondary">{stats.weeklyOutbound} ürün</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">En Eski Stok</span>
                <Badge variant="destructive">{stats.oldestStock} gün</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">En Yeni Stok</span>
                <Badge variant="outline">{stats.newestStock} gün</Badge>
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
              className="h-auto p-4 hover:bg-green-50 hover:border-green-300 transition-colors"
              onClick={() => setStockEntryOpen(true)}
            >
              <div className="text-left">
                <div className="font-medium">Stok Girişi</div>
                <div className="text-sm text-muted-foreground">Yeni stok ekle</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-red-50 hover:border-red-300 transition-colors"
              onClick={() => setStockExitOpen(true)}
            >
              <div className="text-left">
                <div className="font-medium">Stok Çıkışı</div>
                <div className="text-sm text-muted-foreground">Stok çıkış işlemi</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-orange-50 hover:border-orange-300 transition-colors"
              onClick={() => setInventoryCountOpen(true)}
            >
              <div className="text-left">
                <div className="font-medium">Envanter Sayımı</div>
                <div className="text-sm text-muted-foreground">Fiziki stok sayımı</div>
              </div>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto p-4 hover:bg-blue-50 hover:border-blue-300 transition-colors"
              onClick={() => router.push('/stok/hareketler')}
            >
              <div className="text-left">
                <div className="font-medium">Stok Hareketleri</div>
                <div className="text-sm text-muted-foreground">Hareket geçmişini gör</div>
              </div>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Stock Entry/Exit Dialogs */}
      <QuickStockEntryDialog 
        open={stockEntryOpen} 
        onClose={() => setStockEntryOpen(false)} 
        type="giris" 
      />
      <QuickStockEntryDialog 
        open={stockExitOpen} 
        onClose={() => setStockExitOpen(false)} 
        type="cikis" 
      />
      
      {/* Inventory Count Dialog */}
      <InventoryCountDialog
        open={inventoryCountOpen}
        onOpenChange={setInventoryCountOpen}
        onSuccess={fetchStats}
      />
    </div>
  );
}
