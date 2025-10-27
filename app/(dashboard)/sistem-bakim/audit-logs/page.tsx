'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Database, 
  Activity, 
  Download, 
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  Users,
  FileText,
  Settings,
  BarChart3
} from 'lucide-react';
import { AuditLogViewer } from '@/components/audit/audit-log-viewer';
import { useAuthStore } from '@/stores/auth-store';

interface AuditStats {
  todayCount: number;
  criticalCount: number;
  systemHealth: number;
  activeUsers: number;
}

interface CriticalEvent {
  action: string;
  description: string;
  user: string;
  time: string;
  severity: string;
}

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('viewer');
  const [stats, setStats] = useState<AuditStats>({
    todayCount: 0,
    criticalCount: 0,
    systemHealth: 0,
    activeUsers: 0
  });
  const [criticalEvents, setCriticalEvents] = useState<CriticalEvent[]>([]);
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [settings, setSettings] = useState({
    retentionDays: 90,
    alertThreshold: 5,
    autoDelete: false
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStats();
    fetchCriticalEvents();
    fetchAnalytics();
    fetchAlerts();
    
    // Refresh every 30 seconds
    const interval = setInterval(() => {
      fetchStats();
      fetchCriticalEvents();
      if (activeTab === 'analytics') {
        fetchAnalytics();
      }
      if (activeTab === 'alerts') {
        fetchAlerts();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [activeTab]);

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/audit-logs?stats=true');
      const data = await response.json();
      
      if (data.stats) {
        setStats(data.stats);
      }
    } catch (error) {
      console.error('Error fetching audit stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCriticalEvents = async () => {
    try {
      const response = await fetch('/api/audit-logs?limit=4&severity=high');
      const data = await response.json();
      
      if (data.logs && Array.isArray(data.logs)) {
        const events = data.logs.map((log: any) => ({
          action: log.action || 'UNKNOWN',
          description: log.description || 'No description',
          user: log.user_name || 'Unknown',
          time: formatTimeAgo(log.created_at),
          severity: log.severity || 'medium'
        }));
        setCriticalEvents(events);
      }
    } catch (error) {
      console.error('Error fetching critical events:', error);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch('/api/audit-logs?analytics=true');
      const data = await response.json();
      
      if (data && !data.error) {
        setAnalyticsData(data);
      }
    } catch (error) {
      console.error('Error fetching analytics:', error);
    }
  };

  const fetchAlerts = async () => {
    try {
      // Fetch all critical and high severity events
      const response = await fetch('/api/audit-logs?limit=20&severity=high,critical');
      const data = await response.json();
      
      if (data.logs && Array.isArray(data.logs)) {
        setAlerts(data.logs);
      }
    } catch (error) {
      console.error('Error fetching alerts:', error);
    }
  };

  const formatTimeAgo = (timestamp: string) => {
    if (!timestamp) return 'Bilinmiyor';
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (minutes < 1) return 'Az önce';
    if (minutes < 60) return `${minutes} dakika önce`;
    if (hours < 24) return `${hours} saat önce`;
    return `${days} gün önce`;
  };

  const handleExport = (filters: any) => {
    // Export functionality
    console.log('Exporting audit logs with filters:', filters);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Audit Log Sistemi</h1>
          <p className="text-muted-foreground">
            Tüm sistem işlemlerinin detaylı kaydı, izlenmesi ve analizi
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="flex items-center gap-1">
            <Activity className="h-3 w-3" />
            Canlı İzleme
          </Badge>
          <Button variant="outline">
            <Settings className="h-4 w-4 mr-2" />
            Ayarlar
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-blue-600">
                  {loading ? '...' : stats.todayCount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Bugünkü İşlemler</div>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-red-600">
                  {loading ? '...' : stats.criticalCount.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Kritik İşlemler</div>
              </div>
              <AlertTriangle className="h-8 w-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-green-600">
                  {loading ? '...' : `${stats.systemHealth.toFixed(1)}%`}
                </div>
                <div className="text-sm text-muted-foreground">Sistem Sağlığı</div>
              </div>
              <CheckCircle className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl font-bold text-purple-600">
                  {loading ? '...' : stats.activeUsers.toLocaleString()}
                </div>
                <div className="text-sm text-muted-foreground">Aktif Kullanıcı</div>
              </div>
              <Users className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="viewer" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Log Görüntüleyici
          </TabsTrigger>
          <TabsTrigger value="analytics" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Analitik
          </TabsTrigger>
          <TabsTrigger value="alerts" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Uyarılar
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Ayarlar
          </TabsTrigger>
        </TabsList>

        <TabsContent value="viewer">
          <AuditLogViewer onExport={handleExport} />
        </TabsContent>

        <TabsContent value="analytics">
          <div className="space-y-4">
            {analyticsData ? (
              <>
                {/* Action Trends */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">İşlem Türleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.actionTrends?.map((trend: any, index: number) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <span className="font-medium">{trend.action}</span>
                          <Badge variant="outline">{trend.count} işlem</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Severity Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Önem Seviyeleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {analyticsData.severityDistribution?.map((item: any, index: number) => (
                        <div key={index} className="flex items-center gap-3 p-3 border rounded-lg">
                          <Badge variant={
                            item.severity === 'critical' ? 'destructive' :
                            item.severity === 'high' ? 'default' :
                            item.severity === 'medium' ? 'secondary' : 'outline'
                          }>
                            {item.severity}
                          </Badge>
                          <span className="flex-1">{item.count} işlem</span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Total Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Genel İstatistikler</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-blue-600">{analyticsData.totalLogs}</div>
                        <div className="text-sm text-muted-foreground">Toplam Log (30 gün)</div>
                      </div>
                      <div className="p-4 border rounded-lg text-center">
                        <div className="text-2xl font-bold text-purple-600">{analyticsData.userActivity?.length || 0}</div>
                        <div className="text-sm text-muted-foreground">Aktif Kullanıcı</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Audit Log Analitik
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Analitik verileri yükleniyor...</p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="alerts">
          <div className="space-y-4">
            {/* Stats Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-red-200 bg-red-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                    <div>
                      <div className="text-2xl font-bold text-red-900">{stats.criticalCount}</div>
                      <div className="text-sm text-red-700">Kritik Uyarı</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-yellow-200 bg-yellow-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Clock className="h-8 w-8 text-yellow-600" />
                    <div>
                      <div className="text-2xl font-bold text-yellow-900">{alerts.length}</div>
                      <div className="text-sm text-yellow-700">Aktif Uyarı</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-blue-200 bg-blue-50">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Users className="h-8 w-8 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">{stats.activeUsers}</div>
                      <div className="text-sm text-blue-700">İzlenen Kullanıcı</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Alert List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Aktif Uyarılar
                  </span>
                  <Badge variant="outline">{alerts.length} Uyarı</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {alerts.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500 opacity-50" />
                    <p>Aktif uyarı yok</p>
                    <p className="text-sm mt-2">Tüm sistem normal çalışıyor</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {alerts.map((alert, index) => (
                      <div key={index} className={`p-4 border rounded-lg ${
                        alert.severity === 'critical' ? 'border-red-200 bg-red-50' :
                        alert.severity === 'high' ? 'border-orange-200 bg-orange-50' :
                        'border-yellow-200 bg-yellow-50'
                      }`}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <AlertTriangle className={`h-4 w-4 ${
                                alert.severity === 'critical' ? 'text-red-600' :
                                'text-orange-600'
                              }`} />
                              <span className="font-semibold">{alert.description}</span>
                              <Badge variant={
                                alert.severity === 'critical' ? 'destructive' :
                                alert.severity === 'high' ? 'default' : 'secondary'
                              }>
                                {alert.action}
                              </Badge>
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {alert.user_name} • {new Date(alert.created_at).toLocaleString('tr-TR')}
                            </div>
                          </div>
                          <Badge variant={
                            alert.severity === 'critical' ? 'destructive' :
                            alert.severity === 'high' ? 'default' : 'secondary'
                          }>
                            {alert.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="settings">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5" />
                  Audit Log Ayarları
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Retention Settings */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Saklama Süresi</label>
                    <p className="text-sm text-muted-foreground">Log verileri ne kadar süre saklanacak?</p>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-blue-600">{settings.retentionDays} gün</span>
                        <Badge variant="outline">Aktif</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Uyarı Eşiği */}
                  <div>
                    <label className="text-sm font-medium">Uyarı Eşiği</label>
                    <p className="text-sm text-muted-foreground">Günlük kritik işlem eşiği</p>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className="text-2xl font-bold text-orange-600">{settings.alertThreshold} işlem</span>
                        <Badge variant="outline">Aktif</Badge>
                      </div>
                    </div>
                  </div>

                  {/* Otomatik Silme */}
                  <div>
                    <label className="text-sm font-medium">Otomatik Temizlik</label>
                    <p className="text-sm text-muted-foreground">Eski loglar otomatik silinecek</p>
                    <div className="mt-2 p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <span className={`text-lg font-medium ${settings.autoDelete ? 'text-red-600' : 'text-green-600'}`}>
                          {settings.autoDelete ? 'Aktif' : 'Pasif'}
                        </span>
                        <Badge variant={settings.autoDelete ? 'destructive' : 'default'}>
                          {settings.autoDelete ? 'Etkin' : 'Devre Dışı'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Stats Info */}
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Toplam Log</div>
                    <div className="text-2xl font-bold">{analyticsData?.totalLogs || 0}</div>
                  </div>
                  <div className="p-4 bg-muted rounded-lg">
                    <div className="text-sm text-muted-foreground">Aktif Kullanıcı</div>
                    <div className="text-2xl font-bold">{stats.activeUsers}</div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button variant="outline" className="flex-1">
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Temizle
                  </Button>
                  <Button variant="outline" className="flex-1">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* System Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Sistem Bilgileri</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Log Sistemi Durumu</span>
                    <Badge variant="default" className="bg-green-500">Aktif</Badge>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Veritabanı</span>
                    <span className="font-medium">PostgreSQL (Supabase)</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Son Güncelleme</span>
                    <span className="font-medium">{new Date().toLocaleString('tr-TR')}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Recent Critical Events */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" />
            Son Kritik Olaylar
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {criticalEvents.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Kritik olay bulunamadı</p>
                <p className="text-sm mt-2">Tüm sistem normal çalışıyor</p>
              </div>
            ) : (
              criticalEvents.map((event, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${
                    event.severity === 'critical' ? 'bg-red-500' :
                    event.severity === 'high' ? 'bg-orange-500' :
                    event.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`} />
                  <div>
                    <div className="font-medium">{event.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {event.user} • {event.time}
                    </div>
                  </div>
                </div>
                <Badge variant={
                  event.severity === 'critical' ? 'destructive' :
                  event.severity === 'high' ? 'default' : 'outline'
                }>
                  {event.action}
                </Badge>
              </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
