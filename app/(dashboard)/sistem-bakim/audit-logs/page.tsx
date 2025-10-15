'use client';

import { useState } from 'react';
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

export default function AuditLogsPage() {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('viewer');

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
                <div className="text-2xl font-bold text-blue-600">1,247</div>
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
                <div className="text-2xl font-bold text-red-600">23</div>
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
                <div className="text-2xl font-bold text-green-600">98.5%</div>
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
                <div className="text-2xl font-bold text-purple-600">45</div>
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
                <p>Analitik özelliği geliştiriliyor...</p>
                <p className="text-sm mt-2">
                  İşlem trendleri, kullanıcı aktiviteleri ve sistem metrikleri
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Uyarı Sistemi
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  <Card className="border-red-200 bg-red-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        <div>
                          <div className="font-medium text-red-900">Kritik İşlemler</div>
                          <div className="text-sm text-red-700">Silme ve güvenlik işlemleri</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-yellow-200 bg-yellow-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <Clock className="h-5 w-5 text-yellow-600" />
                        <div>
                          <div className="font-medium text-yellow-900">Geç Saat İşlemler</div>
                          <div className="text-sm text-yellow-700">22:00 sonrası aktiviteler</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border-blue-200 bg-blue-50">
                    <CardContent className="p4">
                      <div className="flex items-center gap-3">
                        <Users className="h-5 w-5 text-blue-600" />
                        <div>
                          <div className="font-medium text-blue-900">Kullanıcı Değişiklikleri</div>
                          <div className="text-sm text-blue-700">Yetki ve profil değişiklikleri</div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Uyarı sistemi geliştiriliyor...</p>
                  <p className="text-sm mt-2">
                    Otomatik uyarılar, email bildirimleri ve real-time monitoring
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Audit Log Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12 text-muted-foreground">
                <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Ayarlar paneli geliştiriliyor...</p>
                <p className="text-sm mt-2">
                  Log seviyeleri, saklama süreleri ve bildirim tercihleri
                </p>
              </div>
            </CardContent>
          </Card>
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
            {[
              { 
                action: 'DELETE', 
                description: 'Kullanıcı silindi: admin@example.com', 
                user: 'Sistem Yöneticisi', 
                time: '2 dakika önce',
                severity: 'critical'
              },
              { 
                action: 'UPDATE', 
                description: 'Üretim planı iptal edildi: #12345', 
                user: 'Planlama Uzmanı', 
                time: '15 dakika önce',
                severity: 'high'
              },
              { 
                action: 'INSERT', 
                description: 'Yeni operatör eklendi: Ahmet Yılmaz', 
                user: 'İK Uzmanı', 
                time: '1 saat önce',
                severity: 'medium'
              },
              { 
                action: 'LOGIN', 
                description: 'Başarısız giriş denemesi: 192.168.1.100', 
                user: 'Bilinmeyen', 
                time: '2 saat önce',
                severity: 'high'
              },
            ].map((event, index) => (
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
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
