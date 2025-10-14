'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line,
  AreaChart,
  Area,
  PieChart, 
  Pie, 
  Cell,
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Download, 
  FileText, 
  TrendingUp, 
  TrendingDown,
  Package,
  Factory,
  Users,
  AlertTriangle,
  Calendar,
  Filter,
  FileSpreadsheet
} from 'lucide-react';

interface ProductionReport {
  date: string;
  planned: number;
  completed: number;
  efficiency: number;
  revenue: number;
}

interface StockReport {
  material: string;
  currentStock: number;
  criticalLevel: number;
  status: 'normal' | 'low' | 'critical';
  lastMovement: string;
  movementType: 'in' | 'out';
}

interface OperatorReport {
  name: string;
  totalProductions: number;
  completedProductions: number;
  efficiency: number;
  avgTime: number;
  revenue: number;
}

interface OrderReport {
  orderNumber: string;
  customer: string;
  totalValue: number;
  status: string;
  orderDate: string;
  deliveryDate: string;
}

const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#8b5cf6'];

export default function RaporlarPage() {
  const [productionData, setProductionData] = useState<ProductionReport[]>([]);
  const [stockData, setStockData] = useState<StockReport[]>([]);
  const [operatorData, setOperatorData] = useState<OperatorReport[]>([]);
  const [orderData, setOrderData] = useState<OrderReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReportData();
  }, []);

  const fetchReportData = async () => {
    try {
      // Gerçek API çağrıları
      const [plans, operators, rawMaterials, semiFinished, finishedProducts, orders, movements] = await Promise.all([
        fetch('/api/production/plans?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/operators').then(r => r.ok ? r.json() : []),
        fetch('/api/stock/raw?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/stock/semi?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/stock/finished?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/orders?limit=1000').then(r => r.ok ? r.json() : { data: [] }),
        fetch('/api/stock/movements?limit=1000').then(r => r.ok ? r.json() : { data: [] })
      ]);

      // 1. PRODUCTION REPORT - Son 7 günün günlük üretim raporu
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date.toISOString().split('T')[0];
      });

      const productionReport = last7Days.map(date => {
        const dayPlans = plans.data?.filter((p: any) => 
          p.created_at && p.created_at.startsWith(date)
        ) || [];
        
        const dayCompleted = plans.data?.filter((p: any) => 
          p.completed_at && p.completed_at.startsWith(date)
        ) || [];

        const planned = dayPlans.reduce((sum: number, p: any) => sum + (p.planned_quantity || 0), 0);
        const completed = dayCompleted.reduce((sum: number, p: any) => sum + (p.produced_quantity || 0), 0);
        const efficiency = planned > 0 ? (completed / planned) * 100 : 0;
        const revenue = completed * 3000; // Ortalama ürün fiyatı (gerçek fiyat sistemi eklenebilir)

        return { 
          date, 
          planned: Math.round(planned), 
          completed: Math.round(completed), 
          efficiency: Math.round(efficiency * 10) / 10, 
          revenue 
        };
      });

      setProductionData(productionReport);

      // 2. STOCK REPORT - Tüm malzemelerin durumu
      const allMaterials = [
        ...(rawMaterials.data || []).map((m: any) => ({ ...m, type: 'raw' })),
        ...(semiFinished.data || []).map((m: any) => ({ ...m, type: 'semi' })),
        ...(finishedProducts.data || []).map((m: any) => ({ ...m, type: 'finished' }))
      ];

      const stockReport = allMaterials.map((m: any) => {
        let status: 'normal' | 'low' | 'critical' = 'normal';
        if (m.quantity <= m.critical_level) status = 'critical';
        else if (m.quantity <= m.min_level) status = 'low';

        // Son hareket
        const lastMovement = movements.data?.find((mv: any) => 
          mv.material_id === m.id && mv.material_type === m.type
        );

        return {
          material: m.name,
          currentStock: m.quantity,
          criticalLevel: m.critical_level,
          status,
          lastMovement: lastMovement?.created_at?.split('T')[0] || 'N/A',
          movementType: lastMovement?.movement_type === 'giris' ? 'in' as const : 'out' as const
        };
      }).slice(0, 20); // İlk 20 malzeme

      setStockData(stockReport);

      // 3. OPERATOR REPORT - Operatör performansları
      const operatorReport = Array.isArray(operators) 
        ? await Promise.all(operators.map(async (op: any) => {
            // Operatörün planları
            const opPlans = plans.data?.filter((p: any) => p.assigned_operator_id === op.id) || [];
            const completed = opPlans.filter((p: any) => p.status === 'tamamlandi');
            
            // Ortalama süre hesaplama
            const timesWithDuration = completed.filter((p: any) => p.started_at && p.completed_at);
            const avgTime = timesWithDuration.length > 0
              ? timesWithDuration.reduce((sum: number, p: any) => {
                  const duration = (new Date(p.completed_at).getTime() - new Date(p.started_at).getTime()) / (1000 * 60); // dakika
                  return sum + duration;
                }, 0) / timesWithDuration.length
              : 0;

            const efficiency = opPlans.length > 0 ? (completed.length / opPlans.length) * 100 : 0;
            const totalProduced = completed.reduce((sum: number, p: any) => sum + (p.produced_quantity || 0), 0);
            const revenue = totalProduced * 3000; // Ortalama ürün fiyatı

            return {
              name: op.name || 'Operatör',
              totalProductions: opPlans.length,
              completedProductions: completed.length,
              efficiency: Math.round(efficiency * 10) / 10,
              avgTime: Math.round(avgTime),
              revenue
            };
          }))
        : [];

      setOperatorData(operatorReport);

      // 4. ORDER REPORT - Sipariş detayları
      const orderReport = (orders.data || []).map((order: any) => ({
        orderNumber: order.order_number,
        customer: order.customer?.name || order.customer_name || 'Müşteri Yok',
        totalValue: order.total_quantity * 3000, // Ortalama ürün fiyatı
        status: order.status === 'beklemede' ? 'Beklemede' 
              : order.status === 'onaylandi' ? 'Üretimde'
              : order.status === 'tamamlandi' ? 'Tamamlandı'
              : 'Bilinmiyor',
        orderDate: order.created_at?.split('T')[0] || 'N/A',
        deliveryDate: order.delivery_date?.split('T')[0] || 'N/A'
      })).slice(0, 20); // İlk 20 sipariş

      setOrderData(orderReport);
      setLoading(false);
    } catch (error) {
      console.error('Rapor verileri yüklenemedi:', error);
      setLoading(false);
    }
  };

  const exportReport = async (type: string) => {
    try {
      let url = '';
      
      switch (type) {
        case 'production':
          url = '/api/reports/export/production';
          break;
        case 'stock':
          url = '/api/reports/export/stock';
          break;
        case 'operators':
          url = '/api/reports/export/operators';
          break;
        case 'orders':
          url = '/api/reports/export/orders';
          break;
        case 'all':
          // Tümünü sırayla indir
          await exportReport('production');
          await new Promise(resolve => setTimeout(resolve, 500));
          await exportReport('stock');
          await new Promise(resolve => setTimeout(resolve, 500));
          await exportReport('operators');
          await new Promise(resolve => setTimeout(resolve, 500));
          await exportReport('orders');
          return;
        default:
          console.log(`Exporting ${type} report...`);
          return;
      }

      // Excel dosyasını indir
      const response = await fetch(url);
      
      if (!response.ok) {
        throw new Error('Export hatası');
      }

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = `${type}-raporu-${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);

    } catch (error) {
      console.error('Export error:', error);
      alert('Rapor indirilemedi. Lütfen tekrar deneyin.');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'destructive';
      case 'low': return 'secondary';
      case 'Tamamlandı': return 'default';
      case 'Üretimde': return 'secondary';
      case 'Beklemede': return 'outline';
      default: return 'default';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'critical': return 'Kritik';
      case 'low': return 'Düşük';
      case 'normal': return 'Normal';
      default: return status;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Raporlar yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Raporlar & Analiz</h1>
          <p className="text-muted-foreground">
            Detaylı üretim, stok ve operatör performans raporları
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => exportReport('all')}>
            <Download className="w-4 h-4 mr-2" />
            Tümünü İndir
          </Button>
          <Button onClick={() => exportReport('summary')}>
            <FileText className="w-4 h-4 mr-2" />
            Özet Rapor
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Üretim</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {productionData.reduce((sum, item) => sum + item.completed, 0)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {(() => {
                const thisWeek = productionData.slice(-7).reduce((sum, item) => sum + item.completed, 0);
                const lastWeek = productionData.slice(-14, -7).reduce((sum, item) => sum + item.completed, 0);
                const trend = lastWeek > 0 ? ((thisWeek - lastWeek) / lastWeek) * 100 : 0;
                const isPositive = trend >= 0;
                return (
                  <>
                    {isPositive ? (
                      <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                    ) : (
                      <TrendingDown className="inline h-3 w-3 mr-1 text-red-600" />
                    )}
                    {isPositive ? '+' : ''}{trend.toFixed(1)}% bu hafta
                  </>
                );
              })()}
            </p>
          </CardContent>
        </Card>


        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Stok</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {stockData.filter(item => item.status === 'critical').length}
            </div>
            <p className="text-xs text-muted-foreground">
              Malzeme kritik seviyede
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Verimlilik</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              %{operatorData.length > 0 ? Math.round(operatorData.reduce((sum, item) => sum + item.efficiency, 0) / operatorData.length) : 0}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              {operatorData.length > 0 ? (
                <>
                  {operatorData.reduce((sum, item) => sum + item.efficiency, 0) / operatorData.length >= 90 ? (
                    <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
                  ) : (
                    <TrendingDown className="inline h-3 w-3 mr-1 text-orange-600" />
                  )}
                  {operatorData.length} aktif operatör
                </>
              ) : (
                'Operatör yok'
              )}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Reports */}
      <Tabs defaultValue="production" className="space-y-4">
        <TabsList>
          <TabsTrigger value="production">Üretim Raporları</TabsTrigger>
          <TabsTrigger value="stock">Stok Raporları</TabsTrigger>
          <TabsTrigger value="operators">Operatör Raporları</TabsTrigger>
          <TabsTrigger value="orders">Sipariş Raporları</TabsTrigger>
        </TabsList>

        {/* Production Reports */}
        <TabsContent value="production" className="space-y-4">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Factory className="w-5 h-5 mr-2" />
                      Günlük Üretim Trendi
                    </CardTitle>
                    <CardDescription>
                      Planlanan vs Tamamlanan üretim miktarları
                    </CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => exportReport('production')}
                    className="gap-2"
                  >
                    <FileSpreadsheet className="w-4 h-4" />
                    Excel İndir
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={productionData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Area 
                        type="monotone" 
                        dataKey="planned" 
                        stackId="1" 
                        stroke="#3b82f6" 
                        fill="#3b82f6" 
                        fillOpacity={0.6}
                        name="Planlanan" 
                      />
                      <Area 
                        type="monotone" 
                        dataKey="completed" 
                        stackId="1" 
                        stroke="#10b981" 
                        fill="#10b981" 
                        fillOpacity={0.8}
                        name="Tamamlanan" 
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

          </div>

          <Card>
            <CardHeader>
              <CardTitle>Verimlilik Analizi</CardTitle>
              <CardDescription>
                Günlük verimlilik oranları
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={productionData}>
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

        {/* Stock Reports */}
        <TabsContent value="stock" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Package className="w-5 h-5 mr-2" />
                    Stok Durumu Raporu
                  </CardTitle>
                  <CardDescription>
                    Kritik stok seviyeleri ve hareket analizi
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('stock')}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel İndir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Malzeme</TableHead>
                      <TableHead>Mevcut Stok</TableHead>
                      <TableHead>Kritik Seviye</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Son Hareket</TableHead>
                      <TableHead>Tarih</TableHead>
                      <TableHead>Eylem</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stockData.map((stock, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{stock.material}</TableCell>
                        <TableCell className={stock.status === 'critical' ? 'text-red-600 font-medium' : ''}>
                          {stock.currentStock.toLocaleString('tr-TR')}
                        </TableCell>
                        <TableCell>{stock.criticalLevel.toLocaleString('tr-TR')}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(stock.status) as any}>
                            {getStatusText(stock.status)}
                          </Badge>
                        </TableCell>
                        <TableCell className="flex items-center">
                          {stock.movementType === 'in' ? (
                            <TrendingUp className="w-4 h-4 text-green-600 mr-1" />
                          ) : (
                            <TrendingDown className="w-4 h-4 text-red-600 mr-1" />
                          )}
                          {stock.movementType === 'in' ? 'Giriş' : 'Çıkış'}
                        </TableCell>
                        <TableCell>{new Date(stock.lastMovement).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>
                          {stock.status === 'critical' && (
                            <Button variant="destructive" size="sm">
                              Acil Sipariş
                            </Button>
                          )}
                          {stock.status === 'low' && (
                            <Button variant="secondary" size="sm">
                              Planla
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Operator Reports */}
        <TabsContent value="operators" className="space-y-4">
          <div className="flex justify-end mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportReport('operators')}
              className="gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              Operatör Raporu İndir
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="w-5 h-5 mr-2" />
                  Operatör Performansı
                </CardTitle>
                <CardDescription>
                  Üretim miktarları ve verimlilik oranları
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={operatorData} layout="horizontal">
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis type="number" />
                      <YAxis dataKey="name" type="category" width={120} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="completedProductions" fill="#3b82f6" name="Tamamlanan" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Verimlilik Dağılımı</CardTitle>
                <CardDescription>
                  Operatör verimlilik karşılaştırması
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={operatorData.map(op => ({
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
                        {operatorData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Detaylı Operatör Raporu</CardTitle>
              <CardDescription>
                Operatör bazında detaylı performans analizi
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Operatör</TableHead>
                      <TableHead>Toplam Üretim</TableHead>
                      <TableHead>Tamamlanan</TableHead>
                      <TableHead>Verimlilik</TableHead>
                      <TableHead>Ort. Süre (dk)</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {operatorData.map((operator, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{operator.name}</TableCell>
                        <TableCell>{operator.totalProductions}</TableCell>
                        <TableCell className="text-green-600 font-medium">
                          {operator.completedProductions}
                        </TableCell>
                        <TableCell>
                          <Badge variant={operator.efficiency >= 95 ? 'default' : 'secondary'}>
                            %{operator.efficiency}
                          </Badge>
                        </TableCell>
                        <TableCell>{operator.avgTime}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Order Reports */}
        <TabsContent value="orders" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2" />
                    Sipariş Raporu
                  </CardTitle>
                  <CardDescription>
                    Sipariş durumları ve teslim analizi
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => exportReport('orders')}
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  Excel İndir
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Sipariş No</TableHead>
                      <TableHead>Müşteri</TableHead>
                      <TableHead>Durum</TableHead>
                      <TableHead>Sipariş Tarihi</TableHead>
                      <TableHead>Teslim Tarihi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orderData.map((order, index) => (
                      <TableRow key={index}>
                        <TableCell className="font-medium">{order.orderNumber}</TableCell>
                        <TableCell>{order.customer}</TableCell>
                        <TableCell>
                          <Badge variant={getStatusColor(order.status) as any}>
                            {order.status}
                          </Badge>
                        </TableCell>
                        <TableCell>{new Date(order.orderDate).toLocaleDateString('tr-TR')}</TableCell>
                        <TableCell>{new Date(order.deliveryDate).toLocaleDateString('tr-TR')}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

