'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  TrendingDown, 
  Package, 
  Factory, 
  Users, 
  AlertTriangle,
  DollarSign,
  BarChart3,
  PieChart,
  Activity
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface DashboardStats {
  totalStockValue: number;
  activeProductions: number;
  totalOperators: number;
  criticalAlerts: number;
  monthlyRevenue: number;
  monthlyGrowth: number;
}

interface ProductionTrend {
  date: string;
  planned: number;
  completed: number;
  efficiency: number;
}

interface OperatorPerformance {
  name: string;
  completed: number;
  efficiency: number;
  avgTime: number;
}

interface StockLevel {
  material: string;
  current: number;
  critical: number;
  status: 'normal' | 'low' | 'critical';
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6'];

export default function YoneticiDashboard() {
  const [stats, setStats] = useState<DashboardStats>({
    totalStockValue: 0,
    activeProductions: 0,
    totalOperators: 0,
    criticalAlerts: 0,
    monthlyRevenue: 0,
    monthlyGrowth: 0,
  });

  const [productionTrends, setProductionTrends] = useState<ProductionTrend[]>([]);
  const [operatorPerformance, setOperatorPerformance] = useState<OperatorPerformance[]>([]);
  const [stockLevels, setStockLevels] = useState<StockLevel[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Mock data - gerçek API'ler eklenecek
      setStats({
        totalStockValue: 1250000,
        activeProductions: 12,
        totalOperators: 8,
        criticalAlerts: 3,
        monthlyRevenue: 850000,
        monthlyGrowth: 12.5,
      });

      setProductionTrends([
        { date: '01/10', planned: 45, completed: 42, efficiency: 93.3 },
        { date: '02/10', planned: 52, completed: 48, efficiency: 92.3 },
        { date: '03/10', planned: 38, completed: 36, efficiency: 94.7 },
        { date: '04/10', planned: 61, completed: 58, efficiency: 95.1 },
        { date: '05/10', planned: 47, completed: 45, efficiency: 95.7 },
        { date: '06/10', planned: 55, completed: 52, efficiency: 94.5 },
        { date: '07/10', planned: 43, completed: 41, efficiency: 95.3 },
      ]);

      setOperatorPerformance([
        { name: 'Thunder Operatör', completed: 156, efficiency: 96.2, avgTime: 45 },
        { name: 'ThunderPro Operatör', completed: 142, efficiency: 94.8, avgTime: 48 },
        { name: 'Operatör 3', completed: 128, efficiency: 92.1, avgTime: 52 },
        { name: 'Operatör 4', completed: 134, efficiency: 93.5, avgTime: 49 },
        { name: 'Operatör 5', completed: 119, efficiency: 91.8, avgTime: 55 },
      ]);

      // 300 ürün için test verisi
      const mockStockLevels = [
        { material: 'Çelik Sac', current: 850, critical: 100, status: 'normal' as const },
        { material: 'Alüminyum Profil', current: 45, critical: 50, status: 'low' as const },
        { material: 'Vida Seti', current: 25, critical: 30, status: 'critical' as const },
        { material: 'Boyama Malzemesi', current: 120, critical: 80, status: 'normal' as const },
        { material: 'Elektrik Kablosu', current: 35, critical: 40, status: 'low' as const },
        { material: 'Plastik Parça A', current: 200, critical: 150, status: 'normal' as const },
        { material: 'Metal Bileşen B', current: 15, critical: 25, status: 'critical' as const },
        { material: 'Kauçuk Conta', current: 80, critical: 60, status: 'normal' as const },
        { material: 'Cam Levha', current: 30, critical: 35, status: 'low' as const },
        { material: 'Seramik İzolatör', current: 10, critical: 15, status: 'critical' as const },
        { material: 'Kablo Konektörü', current: 150, critical: 100, status: 'normal' as const },
        { material: 'Termik Sigorta', current: 5, critical: 20, status: 'critical' as const },
        { material: 'Led Diyot', current: 500, critical: 200, status: 'normal' as const },
        { material: 'Kondansatör', current: 25, critical: 30, status: 'low' as const },
        { material: 'Transistör', current: 8, critical: 12, status: 'critical' as const },
      ];
      
      setStockLevels(mockStockLevels);
    } catch (error) {
      console.error('Dashboard verileri yüklenemedi:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Kritik';
      case 'low': return 'Düşük';
      default: return 'Normal';
    }
  };

  return (
    <div className="space-y-6 max-w-[calc(100vw-40px)] ml-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Yönetici Dashboard</h1>
          <p className="text-muted-foreground">
            Sistem geneli performans ve analiz raporları
          </p>
        </div>
        <Badge variant="outline" className="text-sm">
          <Activity className="w-4 h-4 mr-2" />
          Canlı Veri
        </Badge>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Stok Değeri</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₺{stats.totalStockValue.toLocaleString('tr-TR')}
            </div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
              +2.5% bu ay
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Üretimler</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeProductions}</div>
            <p className="text-xs text-muted-foreground">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
              +3 bu hafta
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Operatörler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalOperators}</div>
            <p className="text-xs text-muted-foreground">
              Kapasite: %87
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Uyarılar</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.criticalAlerts}</div>
            <p className="text-xs text-muted-foreground">
              Stok seviyelerinde
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList>
          <TabsTrigger value="production">Üretim Trendleri</TabsTrigger>
          <TabsTrigger value="operators">Operatör Performansı</TabsTrigger>
          <TabsTrigger value="stock">Stok Analizi</TabsTrigger>
          <TabsTrigger value="revenue">Gelir Analizi</TabsTrigger>
        </TabsList>

        <TabsContent value="production" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart3 className="w-5 h-5 mr-2" />
                Haftalık Üretim Trendleri
              </CardTitle>
              <CardDescription>
                Planlanan vs Tamamlanan üretim miktarları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={productionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="planned" fill="#3b82f6" name="Planlanan" />
                    <Bar dataKey="completed" fill="#10b981" name="Tamamlanan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Üretim Verimliliği</CardTitle>
              <CardDescription>
                Günlük verimlilik oranları (%)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productionTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis domain={[90, 100]} />
                    <Tooltip formatter={(value) => [`${value}%`, 'Verimlilik']} />
                    <Legend />
                    <Line 
                      type="monotone" 
                      dataKey="efficiency" 
                      stroke="#f59e0b" 
                      strokeWidth={3}
                      name="Verimlilik (%)"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="operators" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Users className="w-5 h-5 mr-2" />
                Operatör Performans Karşılaştırması
              </CardTitle>
              <CardDescription>
                Tamamlanan üretim miktarları ve verimlilik oranları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={operatorPerformance} layout="horizontal">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis dataKey="name" type="category" width={120} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="completed" fill="#3b82f6" name="Tamamlanan" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Verimlilik Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[250px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <RechartsPieChart>
                      <Pie
                        data={operatorPerformance.map(op => ({
                          name: op.name,
                          value: op.efficiency
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(1)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {operatorPerformance.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </RechartsPieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ortalama İşlem Süresi</CardTitle>
                <CardDescription>Dakika cinsinden</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {operatorPerformance.map((op, index) => (
                    <div key={op.name} className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: COLORS[index % COLORS.length] }}
                        />
                        <span className="text-sm font-medium">{op.name}</span>
                      </div>
                      <Badge variant="outline">{op.avgTime} dk</Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Stok Seviye Analizi
              </CardTitle>
              <CardDescription>
                Mevcut stok vs kritik seviye karşılaştırması (Toplam: 300 ürün)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <table className="w-full">
                  <thead>
                    <tr className="border-b bg-muted/50">
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Durum
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Malzeme Adı
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Mevcut Stok
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Kritik Seviye
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Durum
                      </th>
                      <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                        Eylem
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stockLevels.map((stock, index) => (
                      <tr key={stock.material} className="border-b transition-colors hover:bg-muted/50">
                        <td className="p-4 align-middle">
                          <div 
                            className="w-3 h-3 rounded-full mx-auto" 
                            style={{ 
                              backgroundColor: stock.status === 'critical' ? '#ef4444' : 
                                              stock.status === 'low' ? '#f59e0b' : '#10b981' 
                            }}
                          />
                        </td>
                        <td className="p-4 align-middle font-medium">
                          {stock.material}
                        </td>
                        <td className="p-4 align-middle">
                          <span className={`font-medium ${
                            stock.status === 'critical' ? 'text-red-600' : 
                            stock.status === 'low' ? 'text-yellow-600' : 'text-green-600'
                          }`}>
                            {stock.current.toLocaleString('tr-TR')}
                          </span>
                        </td>
                        <td className="p-4 align-middle text-muted-foreground">
                          {stock.critical.toLocaleString('tr-TR')}
                        </td>
                        <td className="p-4 align-middle">
                          <Badge variant={getStatusColor(stock.status) as any}>
                            {getStatusText(stock.status)}
                          </Badge>
                        </td>
                        <td className="p-4 align-middle">
                          {stock.status === 'critical' && (
                            <Badge variant="destructive" className="cursor-pointer hover:bg-red-700">
                              Acil Sipariş
                            </Badge>
                          )}
                          {stock.status === 'low' && (
                            <Badge variant="secondary" className="cursor-pointer hover:bg-yellow-600 hover:text-white">
                              Planla
                            </Badge>
                          )}
                          {stock.status === 'normal' && (
                            <Badge variant="outline" className="text-green-600">
                              Yeterli
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              <div className="flex items-center justify-between space-x-2 py-4">
                <div className="flex-1 text-sm text-muted-foreground">
                  Toplam 300 üründen 1-15 arası gösteriliyor (Sayfa 1/20)
                </div>
                <div className="flex items-center space-x-2">
                  <button className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <div className="flex items-center space-x-1">
                    <button className="h-9 w-9 border border-input bg-primary text-primary-foreground hover:bg-primary/90 rounded-md flex items-center justify-center">
                      1
                    </button>
                    <button className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center">
                      2
                    </button>
                    <button className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center">
                      3
                    </button>
                    <span className="px-2 text-muted-foreground">...</span>
                    <button className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center">
                      60
                    </button>
                  </div>
                  <button className="h-9 w-9 border border-input bg-background hover:bg-accent hover:text-accent-foreground rounded-md flex items-center justify-center">
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="revenue" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="w-5 h-5 mr-2" />
                  Aylık Gelir
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  ₺{stats.monthlyRevenue.toLocaleString('tr-TR')}
                </div>
                <p className="text-sm text-muted-foreground flex items-center">
                  <TrendingUp className="w-4 h-4 mr-1 text-green-600" />
                  +%{stats.monthlyGrowth} bu ay
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Gelir Trendi</CardTitle>
                <CardDescription>Son 6 ay</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[200px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={[
                      { month: 'May', revenue: 720000 },
                      { month: 'Jun', revenue: 780000 },
                      { month: 'Jul', revenue: 820000 },
                      { month: 'Aug', revenue: 790000 },
                      { month: 'Sep', revenue: 850000 },
                      { month: 'Oct', revenue: 850000 },
                    ]}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="month" />
                      <YAxis />
                      <Tooltip formatter={(value) => [`₺${value.toLocaleString('tr-TR')}`, 'Gelir']} />
                      <Line type="monotone" dataKey="revenue" stroke="#10b981" strokeWidth={3} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
