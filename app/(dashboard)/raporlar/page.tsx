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
  Filter
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
      // Gerçek API'ler eklenecek - şimdilik mock data
      setProductionData([
        { date: '2024-10-01', planned: 45, completed: 42, efficiency: 93.3, revenue: 125000 },
        { date: '2024-10-02', planned: 52, completed: 48, efficiency: 92.3, revenue: 142000 },
        { date: '2024-10-03', planned: 38, completed: 36, efficiency: 94.7, revenue: 98000 },
        { date: '2024-10-04', planned: 61, completed: 58, efficiency: 95.1, revenue: 168000 },
        { date: '2024-10-05', planned: 47, completed: 45, efficiency: 95.7, revenue: 132000 },
        { date: '2024-10-06', planned: 55, completed: 52, efficiency: 94.5, revenue: 155000 },
        { date: '2024-10-07', planned: 43, completed: 41, efficiency: 95.3, revenue: 118000 },
      ]);

      setStockData([
        { material: 'Çelik Sac', currentStock: 850, criticalLevel: 100, status: 'normal', lastMovement: '2024-10-06', movementType: 'in' },
        { material: 'Alüminyum Profil', currentStock: 45, criticalLevel: 50, status: 'low', lastMovement: '2024-10-05', movementType: 'out' },
        { material: 'Vida Seti', currentStock: 25, criticalLevel: 30, status: 'critical', lastMovement: '2024-10-04', movementType: 'out' },
        { material: 'Boyama Malzemesi', currentStock: 120, criticalLevel: 80, status: 'normal', lastMovement: '2024-10-07', movementType: 'in' },
        { material: 'Elektrik Kablosu', currentStock: 35, criticalLevel: 40, status: 'low', lastMovement: '2024-10-03', movementType: 'out' },
      ]);

      setOperatorData([
        { name: 'Thunder Operatör', totalProductions: 156, completedProductions: 150, efficiency: 96.2, avgTime: 45, revenue: 85000 },
        { name: 'ThunderPro Operatör', totalProductions: 142, completedProductions: 135, efficiency: 95.1, avgTime: 48, revenue: 78000 },
        { name: 'Operatör 3', totalProductions: 128, completedProductions: 118, efficiency: 92.2, avgTime: 52, revenue: 68000 },
        { name: 'Operatör 4', totalProductions: 134, completedProductions: 125, efficiency: 93.3, avgTime: 49, revenue: 72000 },
      ]);

      setOrderData([
        { orderNumber: 'ORD-2024-001', customer: 'ABC Şirketi', totalValue: 45000, status: 'Tamamlandı', orderDate: '2024-10-01', deliveryDate: '2024-10-05' },
        { orderNumber: 'ORD-2024-002', customer: 'XYZ Ltd.', totalValue: 78000, status: 'Üretimde', orderDate: '2024-10-02', deliveryDate: '2024-10-08' },
        { orderNumber: 'ORD-2024-003', customer: 'DEF A.Ş.', totalValue: 32000, status: 'Beklemede', orderDate: '2024-10-03', deliveryDate: '2024-10-10' },
        { orderNumber: 'ORD-2024-004', customer: 'GHI Sanayi', totalValue: 95000, status: 'Tamamlandı', orderDate: '2024-10-04', deliveryDate: '2024-10-07' },
        { orderNumber: 'ORD-2024-005', customer: 'JKL Ticaret', totalValue: 28000, status: 'Üretimde', orderDate: '2024-10-05', deliveryDate: '2024-10-12' },
      ]);

      setLoading(false);
    } catch (error) {
      console.error('Rapor verileri yüklenemedi:', error);
      setLoading(false);
    }
  };

  const exportReport = (type: string) => {
    // Export functionality - Excel/PDF export
    console.log(`Exporting ${type} report...`);
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
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
              +12.5% bu hafta
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
              %{Math.round(operatorData.reduce((sum, item) => sum + item.efficiency, 0) / operatorData.length)}
            </div>
            <p className="text-xs text-muted-foreground flex items-center">
              <TrendingUp className="inline h-3 w-3 mr-1 text-green-600" />
              +2.1% bu hafta
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
                <CardTitle className="flex items-center">
                  <Factory className="w-5 h-5 mr-2" />
                  Günlük Üretim Trendi
                </CardTitle>
                <CardDescription>
                  Planlanan vs Tamamlanan üretim miktarları
                </CardDescription>
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
              <CardTitle className="flex items-center">
                <Package className="w-5 h-5 mr-2" />
                Stok Durumu Raporu
              </CardTitle>
              <CardDescription>
                Kritik stok seviyeleri ve hareket analizi
              </CardDescription>
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
              <CardTitle className="flex items-center">
                <Calendar className="w-5 h-5 mr-2" />
                Sipariş Raporu
              </CardTitle>
              <CardDescription>
                Sipariş durumları ve teslim analizi
              </CardDescription>
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

