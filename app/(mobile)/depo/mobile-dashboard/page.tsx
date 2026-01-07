'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  PackagePlus,
  PackageMinus,
  ClipboardList,
  ArrowLeftRight,
  Search,
  Package,
  AlertTriangle,
  TrendingUp,
  BarChart3,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { usePullToRefresh } from '@/hooks/use-pull-to-refresh';

interface Activity {
  id: string;
  type: string;
  productName: string;
  productCode: string;
  quantity: number;
  description: string;
  createdAt: string;
}

interface Stats {
  todayEntries: number;
  todayExits: number;
  lowStockItems: number;
  criticalStockCount: number;
}

export default function MobileDashboardPage() {
  const [isPWA, setIsPWA] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState<Stats>({
    todayEntries: 0,
    todayExits: 0,
    lowStockItems: 0,
    criticalStockCount: 0,
  });
  const [recentActivities, setRecentActivities] = useState<Activity[]>([]);

  useEffect(() => {
    // Check if running as PWA
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
    setIsPWA(isStandalone);

    // Fetch data
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      // Fetch stats and activities in parallel
      const [statsResponse, activitiesResponse] = await Promise.all([
        fetch('/api/dashboard/depo-stats'),
        fetch('/api/dashboard/recent-activities?limit=5'),
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats({
          todayEntries: statsData.data?.dailyInbound || 0,
          todayExits: statsData.data?.dailyOutbound || 0,
          lowStockItems: statsData.data?.lowStockItems || 0,
          criticalStockCount: statsData.data?.criticalStockCount || 0,
        });
      }

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setRecentActivities(activitiesData.data || []);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Veriler yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
    });
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      giris: 'Giriş',
      cikis: 'Çıkış',
      transfer: 'Transfer',
    };
    return labels[type] || type;
  };

  const quickActions = [
    {
      title: 'Stok Giriş',
      icon: PackagePlus,
      href: '/depo/stok-giris',
      color: 'bg-green-500',
      description: 'Stok girişi yap',
    },
    {
      title: 'Transfer',
      icon: ArrowLeftRight,
      href: '/depo/zone-transfer',
      color: 'bg-orange-500',
      description: 'Zone transferi yap',
    },
    {
      title: 'Ürün Ara',
      icon: Search,
      href: '/depo/urun-ara',
      color: 'bg-cyan-500',
      description: 'Ürün sorgula',
    },
  ];

  const pullToRefresh = usePullToRefresh({
    onRefresh: async () => {
      await fetchDashboardData();
      toast.success('Veriler güncellendi');
    },
    threshold: 80,
  });

  return (
    <div
      ref={pullToRefresh.containerRef}
      className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100"
    >
      {/* Pull to Refresh Indicator */}
      {(pullToRefresh.isPulling || pullToRefresh.isRefreshing) && (
        <div
          className="fixed top-0 left-0 right-0 z-50 flex justify-center transition-all duration-200"
          style={{
            transform: `translateY(${pullToRefresh.isRefreshing ? '16px' : Math.max(0, pullToRefresh.pullDistance - 60)}px)`,
          }}
        >
          <div className="bg-white rounded-full shadow-lg p-3 flex items-center gap-2">
            <RefreshCw
              className={`h-5 w-5 text-blue-600 transition-transform duration-200 ${
                pullToRefresh.isRefreshing ? 'animate-spin' : ''
              }`}
              style={{
                transform: pullToRefresh.isRefreshing
                  ? 'rotate(0deg)'
                  : `rotate(${pullToRefresh.progress * 3.6}deg)`
              }}
            />
            <span className="text-sm font-medium text-gray-700">
              {pullToRefresh.isRefreshing
                ? 'Güncelleniyor...'
                : pullToRefresh.shouldRefresh
                ? 'Bırakın yenilensin'
                : 'Yenilemek için çekin'}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 rounded-b-3xl shadow-lg">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold">Depo Yönetim</h1>
            <p className="text-blue-100 text-sm mt-1">
              Hoş geldiniz 👋
            </p>
          </div>
          {isPWA && (
            <Badge variant="secondary" className="bg-white/20 text-white border-0">
              <Package className="w-3 h-3 mr-1" />
              PWA
            </Badge>
          )}
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Bugün Giriş</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.todayEntries
                  )}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-blue-200" />
            </div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Bugün Çıkış</p>
                <p className="text-2xl font-bold mt-1">
                  {isLoading ? (
                    <Loader2 className="h-6 w-6 animate-spin" />
                  ) : (
                    stats.todayExits
                  )}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-blue-200" />
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      {!isLoading && stats.criticalStockCount > 0 && (
        <div className="mx-4 mt-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <p className="font-semibold text-amber-900 text-sm">
                Kritik Stok Uyarısı
              </p>
              <p className="text-amber-700 text-xs mt-1">
                {stats.criticalStockCount} ürün kritik stok seviyesinde
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
    <div className="px-4 mt-6">
      <h2 className="text-lg font-bold text-gray-900 mb-4">Hızlı İşlemler</h2>
      <div className="grid grid-cols-2 gap-3">
          {quickActions.map((action) => (
            <Link key={action.href} href={action.href}>
              <Card className="hover:shadow-lg transition-all duration-200 active:scale-95 border-0 shadow-md h-full">
                <CardContent className="p-4">
                  <div
                    className={`${action.color} w-12 h-12 rounded-xl flex items-center justify-center mb-3`}
                  >
                    <action.icon className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="font-semibold text-gray-900 text-sm">
                    {action.title}
                  </h3>
                  <p className="text-xs text-gray-500 mt-1">
                    {action.description}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>

      {/* Recent Activity */}
      <div className="px-4 mt-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-gray-900">Son İşlemler</h2>
          {!isLoading && (
            <Button
              variant="ghost"
              size="sm"
              onClick={fetchDashboardData}
              className="text-xs h-8"
            >
              Yenile
            </Button>
          )}
        </div>
        <Card className="border-0 shadow-md">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 flex items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              </div>
            ) : recentActivities.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm text-gray-500">Henüz işlem bulunmuyor</p>
              </div>
            ) : (
              recentActivities.map((activity, index) => (
                <div
                  key={activity.id}
                  className={`p-4 flex items-center justify-between ${
                    index !== recentActivities.length - 1
                      ? 'border-b border-gray-100'
                      : ''
                  }`}
                >
                  <div className="flex items-start gap-3 flex-1">
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        activity.type === 'giris'
                          ? 'bg-green-100'
                          : activity.type === 'cikis'
                          ? 'bg-red-100'
                          : 'bg-orange-100'
                      }`}
                    >
                      {activity.type === 'giris' ? (
                        <TrendingUp className="w-5 h-5 text-green-600" />
                      ) : activity.type === 'cikis' ? (
                        <Package className="w-5 h-5 text-red-600" />
                      ) : (
                        <ArrowLeftRight className="w-5 h-5 text-orange-600" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">
                        {activity.productName}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {getMovementTypeLabel(activity.type)} • {activity.quantity} adet
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-gray-400 flex-shrink-0 ml-2">
                    {formatTimeAgo(activity.createdAt)}
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {/* PWA Install Hint */}
      {!isPWA && (
        <div className="px-4 mb-6">
          <Card className="border-2 border-dashed border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Package className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-blue-900 text-sm">
                    Ana Ekrana Ekle
                  </p>
                  <p className="text-blue-700 text-xs mt-1">
                    Daha hızlı erişim için uygulamayı ana ekranınıza ekleyin.
                    Tarayıcınızın menüsünden "Ana ekrana ekle" seçeneğini
                    kullanın.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

    </div>
  );
}
