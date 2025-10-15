'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  BarChart3, 
  TrendingUp, 
  TrendingDown, 
  PieChart, 
  LineChart,
  Download,
  RefreshCw,
  Calendar,
  Filter,
  Target,
  Factory,
  Package,
  Users,
  DollarSign
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js';
import { Line, Bar, Pie, Doughnut } from 'react-chartjs-2';
import { format, subDays, subMonths, subYears, startOfDay, endOfDay } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';

// Register Chart.js components
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
);

interface ReportData {
  production: {
    daily: Array<{ date: string; quantity: number; value: number }>;
    monthly: Array<{ month: string; quantity: number; value: number }>;
    byOperator: Array<{ operator: string; quantity: number; efficiency: number }>;
  };
  sales: {
    daily: Array<{ date: string; revenue: number; orders: number }>;
    monthly: Array<{ month: string; revenue: number; orders: number }>;
    byProduct: Array<{ product: string; revenue: number; quantity: number }>;
  };
  inventory: {
    stockLevels: Array<{ category: string; current: number; min: number; max: number }>;
    movements: Array<{ date: string; in: number; out: number; net: number }>;
    critical: Array<{ product: string; current: number; min: number; status: string }>;
  };
  operators: {
    performance: Array<{ operator: string; efficiency: number; quality: number; production: number }>;
    workload: Array<{ operator: string; active: number; completed: number; pending: number }>;
  };
}

interface AdvancedReportingProps {
  onExport?: (reportType: string, data: any) => void;
}

export function AdvancedReporting({ onExport }: AdvancedReportingProps) {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [reportType, setReportType] = useState('production');
  const [chartType, setChartType] = useState('line');

  // Load report data
  const loadReportData = async () => {
    try {
      setLoading(true);
      
      const startDate = subDays(new Date(), parseInt(dateRange));
      const endDate = new Date();

      const response = await fetch('/api/reports/advanced', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
          reportType
        }),
      });

      if (!response.ok) {
        throw new Error('Rapor verisi yüklenemedi');
      }

      const data = await response.json();
      setReportData(data);
    } catch (error: any) {
      console.error('Error loading report data:', error);
      toast.error(error.message || 'Rapor verisi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportData();
  }, [dateRange, reportType]);

  // Chart configurations
  const chartOptions = {
    responsive: true,
    plugins: {
      legend: {
        position: 'top' as const,
      },
      title: {
        display: true,
        text: 'Üretim Raporu',
      },
    },
    scales: {
      y: {
        beginAtZero: true,
      },
    },
  };

  // Production charts
  const productionLineData = useMemo(() => {
    if (!reportData?.production.daily) return null;

    return {
      labels: reportData.production.daily.map(item => format(new Date(item.date), 'dd MMM', { locale: tr })),
      datasets: [
        {
          label: 'Üretim Miktarı',
          data: reportData.production.daily.map(item => item.quantity),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Üretim Değeri (₺)',
          data: reportData.production.daily.map(item => item.value),
          borderColor: 'rgb(34, 197, 94)',
          backgroundColor: 'rgba(34, 197, 94, 0.1)',
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  }, [reportData]);

  const productionBarData = useMemo(() => {
    if (!reportData?.production.byOperator) return null;

    return {
      labels: reportData.production.byOperator.map(item => item.operator),
      datasets: [
        {
          label: 'Üretim Miktarı',
          data: reportData.production.byOperator.map(item => item.quantity),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Verimlilik (%)',
          data: reportData.production.byOperator.map(item => item.efficiency),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
          yAxisID: 'y1',
        },
      ],
    };
  }, [reportData]);

  // Sales charts
  const salesLineData = useMemo(() => {
    if (!reportData?.sales.daily) return null;

    return {
      labels: reportData.sales.daily.map(item => format(new Date(item.date), 'dd MMM', { locale: tr })),
      datasets: [
        {
          label: 'Günlük Ciro (₺)',
          data: reportData.sales.daily.map(item => item.revenue),
          borderColor: 'rgb(168, 85, 247)',
          backgroundColor: 'rgba(168, 85, 247, 0.1)',
          tension: 0.4,
        },
        {
          label: 'Sipariş Sayısı',
          data: reportData.sales.daily.map(item => item.orders),
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          yAxisID: 'y1',
        },
      ],
    };
  }, [reportData]);

  const salesPieData = useMemo(() => {
    if (!reportData?.sales.byProduct) return null;

    return {
      labels: reportData.sales.byProduct.map(item => item.product),
      datasets: [
        {
          data: reportData.sales.byProduct.map(item => item.revenue),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(168, 85, 247, 0.8)',
          ],
        },
      ],
    };
  }, [reportData]);

  // Inventory charts
  const inventoryBarData = useMemo(() => {
    if (!reportData?.inventory.stockLevels) return null;

    return {
      labels: reportData.inventory.stockLevels.map(item => item.category),
      datasets: [
        {
          label: 'Mevcut Stok',
          data: reportData.inventory.stockLevels.map(item => item.current),
          backgroundColor: 'rgba(59, 130, 246, 0.8)',
        },
        {
          label: 'Minimum Stok',
          data: reportData.inventory.stockLevels.map(item => item.min),
          backgroundColor: 'rgba(239, 68, 68, 0.8)',
        },
        {
          label: 'Maksimum Stok',
          data: reportData.inventory.stockLevels.map(item => item.max),
          backgroundColor: 'rgba(34, 197, 94, 0.8)',
        },
      ],
    };
  }, [reportData]);

  // Operator charts
  const operatorDoughnutData = useMemo(() => {
    if (!reportData?.operators.workload) return null;

    return {
      labels: reportData.operators.workload.map(item => item.operator),
      datasets: [
        {
          data: reportData.operators.workload.map(item => item.active),
          backgroundColor: [
            'rgba(59, 130, 246, 0.8)',
            'rgba(34, 197, 94, 0.8)',
            'rgba(245, 158, 11, 0.8)',
            'rgba(239, 68, 68, 0.8)',
            'rgba(168, 85, 247, 0.8)',
          ],
        },
      ],
    };
  }, [reportData]);

  const handleExport = (type: string) => {
    if (!reportData) return;
    
    onExport?.(type, reportData);
    toast.success(`${type} raporu export edildi`);
  };

  const renderChart = () => {
    if (loading) {
      return (
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Yükleniyor...</span>
        </div>
      );
    }

    if (!reportData) {
      return (
        <div className="flex items-center justify-center h-64 text-muted-foreground">
          <BarChart3 className="h-8 w-8 mr-2" />
          Veri bulunamadı
        </div>
      );
    }

    switch (reportType) {
      case 'production':
        if (chartType === 'line' && productionLineData) {
          return <Line data={productionLineData} options={chartOptions} />;
        } else if (chartType === 'bar' && productionBarData) {
          return <Bar data={productionBarData} options={chartOptions} />;
        }
        break;
      case 'sales':
        if (chartType === 'line' && salesLineData) {
          return <Line data={salesLineData} options={chartOptions} />;
        } else if (chartType === 'pie' && salesPieData) {
          return <Pie data={salesPieData} options={chartOptions} />;
        }
        break;
      case 'inventory':
        if (chartType === 'bar' && inventoryBarData) {
          return <Bar data={inventoryBarData} options={chartOptions} />;
        }
        break;
      case 'operators':
        if (chartType === 'doughnut' && operatorDoughnutData) {
          return <Doughnut data={operatorDoughnutData} options={chartOptions} />;
        }
        break;
    }

    return <div>Grafik verisi bulunamadı</div>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Gelişmiş Raporlama
          </h2>
          <p className="text-muted-foreground">
            Interaktif grafikler ve detaylı analiz raporları
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadReportData} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button variant="outline" onClick={() => handleExport(reportType)}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="report-type">Rapor Türü</Label>
              <Select value={reportType} onValueChange={setReportType}>
                <SelectTrigger>
                  <SelectValue placeholder="Rapor seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="production">
                    <div className="flex items-center gap-2">
                      <Factory className="h-4 w-4" />
                      Üretim Raporu
                    </div>
                  </SelectItem>
                  <SelectItem value="sales">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4" />
                      Satış Raporu
                    </div>
                  </SelectItem>
                  <SelectItem value="inventory">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      Envanter Raporu
                    </div>
                  </SelectItem>
                  <SelectItem value="operators">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4" />
                      Operatör Raporu
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="chart-type">Grafik Türü</Label>
              <Select value={chartType} onValueChange={setChartType}>
                <SelectTrigger>
                  <SelectValue placeholder="Grafik seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line">
                    <div className="flex items-center gap-2">
                      <LineChart className="h-4 w-4" />
                      Çizgi Grafik
                    </div>
                  </SelectItem>
                  <SelectItem value="bar">
                    <div className="flex items-center gap-2">
                      <BarChart3 className="h-4 w-4" />
                      Bar Grafik
                    </div>
                  </SelectItem>
                  <SelectItem value="pie">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Pasta Grafik
                    </div>
                  </SelectItem>
                  <SelectItem value="doughnut">
                    <div className="flex items-center gap-2">
                      <PieChart className="h-4 w-4" />
                      Halka Grafik
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="date-range">Tarih Aralığı</Label>
              <Select value={dateRange} onValueChange={setDateRange}>
                <SelectTrigger>
                  <SelectValue placeholder="Tarih seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="7">Son 7 Gün</SelectItem>
                  <SelectItem value="30">Son 30 Gün</SelectItem>
                  <SelectItem value="90">Son 3 Ay</SelectItem>
                  <SelectItem value="365">Son 1 Yıl</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="custom-date">Özel Tarih</Label>
              <Input
                type="date"
                placeholder="Özel tarih seçin"
                disabled
                className="opacity-50"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {reportType === 'production' && <Factory className="h-5 w-5" />}
            {reportType === 'sales' && <DollarSign className="h-5 w-5" />}
            {reportType === 'inventory' && <Package className="h-5 w-5" />}
            {reportType === 'operators' && <Users className="h-5 w-5" />}
            {reportType === 'production' && 'Üretim Analizi'}
            {reportType === 'sales' && 'Satış Analizi'}
            {reportType === 'inventory' && 'Envanter Analizi'}
            {reportType === 'operators' && 'Operatör Analizi'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            {renderChart()}
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      {reportData && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {reportType === 'production' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.production.daily.reduce((sum, item) => sum + item.quantity, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Üretim</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ₺{reportData.production.daily.reduce((sum, item) => sum + item.value, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Değer</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {reportData.production.byOperator.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Aktif Operatör</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {Math.round(reportData.production.byOperator.reduce((sum, item) => sum + item.efficiency, 0) / reportData.production.byOperator.length)}%
                  </div>
                  <div className="text-sm text-muted-foreground">Ortalama Verimlilik</div>
                </CardContent>
              </Card>
            </>
          )}

          {reportType === 'sales' && (
            <>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    ₺{reportData.sales.daily.reduce((sum, item) => sum + item.revenue, 0).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Ciro</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {reportData.sales.daily.reduce((sum, item) => sum + item.orders, 0)}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Sipariş</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-purple-600">
                    {reportData.sales.byProduct.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Ürün Çeşidi</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    ₺{Math.round(reportData.sales.daily.reduce((sum, item) => sum + item.revenue, 0) / reportData.sales.daily.length).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">Günlük Ortalama</div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      )}
    </div>
  );
}
