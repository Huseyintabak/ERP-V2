'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { logger } from '@/lib/utils/logger';
import { 
  Database, 
  Trash2, 
  RefreshCw, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  HardDrive,
  Users,
  Package,
  FileText,
  Bell
} from 'lucide-react';

interface SystemMetrics {
  users: number;
  orders: number;
  production_plans: number;
  stock_movements: number;
  audit_logs: number;
  notifications: number;
  database_size: string;
  timestamp: string;
}

interface HealthMetrics {
  critical_stock_items: number;
  pending_orders: number;
  active_production_plans: number;
  recent_errors: number;
  timestamp: string;
}

export default function SystemMaintenance() {
  const [metrics, setMetrics] = useState<SystemMetrics | null>(null);
  const [health, setHealth] = useState<HealthMetrics | null>(null);
  const [healthStatus, setHealthStatus] = useState<string>('unknown');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Cleanup parameters
  const [auditDays, setAuditDays] = useState(90);
  const [notificationDays, setNotificationDays] = useState(30);

  const fetchMetrics = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance?action=metrics');
      const data = await response.json();
      
      if (data.data) {
        setMetrics(data.data);
      }
    } catch (error) {
      logger.error('Error fetching metrics:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchHealth = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance?action=health');
      const data = await response.json();
      
      if (data.data) {
        setHealth(data.data);
        setHealthStatus(data.data.status || 'healthy');
      }
    } catch (error) {
      logger.error('Error fetching health:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateStats = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance?action=stats');
      const data = await response.json();
      
      if (data.data?.success) {
        setMessage({ type: 'success', text: 'Database istatistikleri güncellendi' });
        await fetchMetrics();
      } else {
        setMessage({ type: 'error', text: data.data?.message || 'İstatistik güncelleme hatası' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'İstatistik güncelleme hatası' });
    } finally {
      setLoading(false);
    }
  };

  const cleanAuditLogs = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clean_audit_logs',
          params: { days: auditDays }
        })
      });
      
      const data = await response.json();
      
      if (data.data?.success) {
        setMessage({ 
          type: 'success', 
          text: `${data.data.deleted_count} audit log temizlendi` 
        });
        await fetchMetrics();
      } else {
        setMessage({ type: 'error', text: data.data?.message || 'Audit log temizleme hatası' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Audit log temizleme hatası' });
    } finally {
      setLoading(false);
    }
  };

  const cleanNotifications = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'clean_notifications',
          params: { days: notificationDays }
        })
      });
      
      const data = await response.json();
      
      if (data.data?.success) {
        setMessage({ 
          type: 'success', 
          text: `${data.data.deleted_count} bildirim temizlendi` 
        });
        await fetchMetrics();
      } else {
        setMessage({ type: 'error', text: data.data?.message || 'Bildirim temizleme hatası' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Bildirim temizleme hatası' });
    } finally {
      setLoading(false);
    }
  };

  const fullCleanup = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'full_cleanup',
          params: { 
            audit_days: auditDays,
            notification_days: notificationDays
          }
        })
      });
      
      const data = await response.json();
      
      if (data.data?.success) {
        setMessage({ 
          type: 'success', 
          text: `Sistem temizleme tamamlandı. ${data.data.cleaned_audit_logs} audit log, ${data.data.cleaned_notifications} bildirim temizlendi` 
        });
        await fetchMetrics();
        await fetchHealth();
      } else {
        setMessage({ type: 'error', text: data.data?.message || 'Sistem temizleme hatası' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Sistem temizleme hatası' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
    fetchHealth();
  }, []);

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getHealthStatusText = (status: string) => {
    switch (status) {
      case 'healthy': return 'Sağlıklı';
      case 'warning': return 'Uyarı';
      case 'critical': return 'Kritik';
      default: return 'Bilinmiyor';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Sistem Bakım Araçları</h1>
          <p className="text-muted-foreground">
            Sistem performansı, temizleme ve optimizasyon araçları
          </p>
        </div>
        <Button 
          onClick={() => { fetchMetrics(); fetchHealth(); }} 
          disabled={loading}
          variant="outline"
        >
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {message && (
        <Alert className={message.type === 'error' ? 'border-red-500' : 'border-green-500'}>
          <AlertDescription className={message.type === 'error' ? 'text-red-700' : 'text-green-700'}>
            {message.text}
          </AlertDescription>
        </Alert>
      )}

      {/* Sistem Sağlık Durumu */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Sistem Sağlık Durumu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <Badge className={`${getHealthStatusColor(healthStatus)} text-white`}>
              {getHealthStatusText(healthStatus)}
            </Badge>
            <span className="text-sm text-muted-foreground">
              Son güncelleme: {health?.last_check ? new Date(health.last_check).toLocaleString('tr-TR') : health?.timestamp ? new Date(health.timestamp).toLocaleString('tr-TR') : new Date().toLocaleString('tr-TR')}
            </span>
          </div>
          
          {health && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{health.critical_stock_items}</div>
                <div className="text-sm text-muted-foreground">Kritik Stok</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{health.pending_orders}</div>
                <div className="text-sm text-muted-foreground">Bekleyen Sipariş</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{health.active_production_plans}</div>
                <div className="text-sm text-muted-foreground">Aktif Plan</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{health.recent_errors}</div>
                <div className="text-sm text-muted-foreground">Son 24h Hata</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sistem Metrikleri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Database className="h-5 w-5" />
            Sistem Metrikleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {metrics ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <Users className="h-8 w-8 mx-auto mb-2 text-blue-600" />
                <div className="text-2xl font-bold">{metrics.users}</div>
                <div className="text-sm text-muted-foreground">Aktif Kullanıcı</div>
              </div>
              <div className="text-center">
                <Package className="h-8 w-8 mx-auto mb-2 text-green-600" />
                <div className="text-2xl font-bold">{metrics.orders}</div>
                <div className="text-sm text-muted-foreground">Toplam Sipariş</div>
              </div>
              <div className="text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-purple-600" />
                <div className="text-2xl font-bold">{metrics.production_plans}</div>
                <div className="text-sm text-muted-foreground">Üretim Planı</div>
              </div>
              <div className="text-center">
                <Bell className="h-8 w-8 mx-auto mb-2 text-orange-600" />
                <div className="text-2xl font-bold">{metrics.notifications}</div>
                <div className="text-sm text-muted-foreground">Bildirim</div>
              </div>
            </div>
          ) : (
            <div className="text-center py-8">
              <div className="text-muted-foreground">Metrikler yükleniyor...</div>
            </div>
          )}
          
          <div className="mt-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardDrive className="h-4 w-4" />
                <span className="text-sm">Database Boyutu: {metrics?.database_size || 'Bilinmiyor'}</span>
              </div>
              <Button onClick={updateStats} disabled={loading} size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                İstatistikleri Güncelle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Temizleme Araçları */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trash2 className="h-5 w-5" />
            Sistem Temizleme
          </CardTitle>
          <CardDescription>
            Eski verileri temizleyerek sistem performansını artırın
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="audit-days">Audit Log Temizleme (Gün)</Label>
              <Input
                id="audit-days"
                type="number"
                value={auditDays}
                onChange={(e) => setAuditDays(parseInt(e.target.value) || 90)}
                min="1"
                max="365"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notification-days">Bildirim Temizleme (Gün)</Label>
              <Input
                id="notification-days"
                type="number"
                value={notificationDays}
                onChange={(e) => setNotificationDays(parseInt(e.target.value) || 30)}
                min="1"
                max="365"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button 
              onClick={cleanAuditLogs} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Audit Logları Temizle
            </Button>
            
            <Button 
              onClick={cleanNotifications} 
              disabled={loading}
              variant="outline"
              size="sm"
            >
              <Bell className="h-4 w-4 mr-2" />
              Bildirimleri Temizle
            </Button>
            
            <Button 
              onClick={fullCleanup} 
              disabled={loading}
              variant="destructive"
              size="sm"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Tam Sistem Temizliği
            </Button>
          </div>

          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Dikkat:</strong> Temizleme işlemleri geri alınamaz. 
              Önemli verilerinizi yedeklediğinizden emin olun.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}
