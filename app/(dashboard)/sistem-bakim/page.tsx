'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Settings,
  Database,
  HardDrive,
  Activity,
  CheckCircle,
  XCircle,
  AlertTriangle,
  RefreshCw,
  Play,
  Download,
  Trash2,
  Wrench,
  Shield,
  Clock,
  BarChart3,
  HardDriveIcon,
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemHealth {
  overall: 'healthy' | 'warning' | 'critical';
  database: {
    status: 'connected' | 'disconnected' | 'slow';
    connectionTime: number;
    queryTime: number;
    activeConnections: number;
  };
  diskSpace: {
    total: number;
    used: number;
    available: number;
    percentage: number;
  };
  performance: {
    avgQueryTime: number;
    slowQueries: number;
    cacheHitRatio: number;
    indexUsage: number;
  };
  recommendations: string[];
}

interface MaintenanceResult {
  operation: string;
  status: 'success' | 'error' | 'warning';
  message: string;
  details?: any;
  executionTime: number;
  timestamp: string;
}

const MAINTENANCE_OPERATIONS = [
  {
    id: 'cleanup_logs',
    name: 'Audit Log Temizliği',
    description: 'Eski audit log kayıtlarını siler',
    icon: Trash2,
    category: 'Temizlik',
    estimatedTime: '2-5 dk',
    risk: 'low',
  },
  {
    id: 'optimize_database',
    name: 'Veritabanı Optimizasyonu',
    description: 'Veritabanı performansını artırır',
    icon: Database,
    category: 'Performans',
    estimatedTime: '5-15 dk',
    risk: 'medium',
  },
  {
    id: 'backup_database',
    name: 'Veritabanı Yedekleme',
    description: 'Tam veritabanı yedeği oluşturur',
    icon: Download,
    category: 'Yedekleme',
    estimatedTime: '10-30 dk',
    risk: 'low',
  },
  {
    id: 'vacuum_analyze',
    name: 'VACUUM ANALYZE',
    description: 'Veritabanı tablolarını optimize eder',
    icon: Wrench,
    category: 'Performans',
    estimatedTime: '3-8 dk',
    risk: 'low',
  },
  {
    id: 'update_statistics',
    name: 'İstatistik Güncelleme',
    description: 'Veritabanı istatistiklerini günceller',
    icon: BarChart3,
    category: 'Performans',
    estimatedTime: '1-3 dk',
    risk: 'low',
  },
  {
    id: 'validate_data_integrity',
    name: 'Veri Bütünlüğü Kontrolü',
    description: 'Veri tutarlılığını kontrol eder',
    icon: Shield,
    category: 'Güvenlik',
    estimatedTime: '3-10 dk',
    risk: 'low',
  },
];

export default function SistemBakimPage() {
  const [health, setHealth] = useState<SystemHealth | null>(null);
  const [isHealthLoading, setIsHealthLoading] = useState(false);
  const [isMaintenanceLoading, setIsMaintenanceLoading] = useState(false);
  const [maintenanceResults, setMaintenanceResults] = useState<MaintenanceResult[]>([]);
  const [selectedOperation, setSelectedOperation] = useState<string>('');
  const [showOperationDialog, setShowOperationDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [operationParams, setOperationParams] = useState({
    retentionDays: 30,
    backupType: 'full',
    optimizeMode: 'quick',
  });
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    fetchSystemHealth();
  }, []);

  const fetchSystemHealth = async () => {
    setIsHealthLoading(true);
    try {
      const response = await fetch('/api/system/maintenance');
      const data = await response.json();
      
      if (response.ok) {
        setHealth(data.health);
      } else {
        toast.error(data.error || 'Sistem sağlık kontrolü başarısız');
      }
    } catch (error) {
      toast.error('Sistem sağlık kontrolü sırasında hata oluştu');
      console.error('Health check error:', error);
    } finally {
      setIsHealthLoading(false);
    }
  };

  const performMaintenance = async (operationId: string) => {
    setIsMaintenanceLoading(true);
    setProgress(0);

    try {
      const operation = MAINTENANCE_OPERATIONS.find(op => op.id === operationId);
      if (!operation) {
        throw new Error('Geçersiz işlem');
      }

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 500);

      const response = await fetch('/api/system/maintenance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          operation: operationId,
          parameters: operationParams,
        }),
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setMaintenanceResults(prev => [...data.results, ...prev]);
        toast.success(`${operation.name} başarıyla tamamlandı`);
        
        // Refresh health after maintenance
        setTimeout(() => {
          fetchSystemHealth();
        }, 1000);
      } else {
        toast.error(data.error || 'Bakım işlemi başarısız');
      }
    } catch (error) {
      toast.error('Bakım işlemi sırasında hata oluştu');
      console.error('Maintenance error:', error);
    } finally {
      setIsMaintenanceLoading(false);
      setProgress(0);
      setShowConfirmDialog(false);
      setShowOperationDialog(false);
    }
  };

  const getHealthIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'critical':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <Activity className="h-5 w-5 text-gray-500" />;
    }
  };

  const getHealthBadge = (status: string) => {
    switch (status) {
      case 'healthy':
        return <Badge variant="default" className="bg-green-100 text-green-800">Sağlıklı</Badge>;
      case 'warning':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Uyarı</Badge>;
      case 'critical':
        return <Badge variant="destructive">Kritik</Badge>;
      default:
        return <Badge variant="outline">Bilinmiyor</Badge>;
    }
  };

  const getRiskBadge = (risk: string) => {
    switch (risk) {
      case 'low':
        return <Badge variant="default" className="bg-green-100 text-green-800">Düşük</Badge>;
      case 'medium':
        return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Orta</Badge>;
      case 'high':
        return <Badge variant="destructive">Yüksek</Badge>;
      default:
        return <Badge variant="outline">Bilinmiyor</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Activity className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatBytes = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Sistem Bakım</h1>
          <p className="text-muted-foreground">
            Sistem sağlığını kontrol edin ve bakım işlemlerini gerçekleştirin
          </p>
        </div>
        <Button onClick={fetchSystemHealth} disabled={isHealthLoading}>
          <RefreshCw className={`mr-2 h-4 w-4 ${isHealthLoading ? 'animate-spin' : ''}`} />
          Sağlık Kontrolü
        </Button>
      </div>

      {/* System Health Overview */}
      {health && (
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Genel Durum</CardTitle>
              {getHealthIcon(health.overall)}
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{getHealthBadge(health.overall)}</div>
              <p className="text-xs text-muted-foreground">
                Sistem sağlığı durumu
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Veritabanı</CardTitle>
              <Database className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {health.database.status === 'connected' ? 'Bağlı' : 
                 health.database.status === 'slow' ? 'Yavaş' : 'Bağlı Değil'}
              </div>
              <p className="text-xs text-muted-foreground">
                {health.database.connectionTime}ms bağlantı süresi
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Disk Alanı</CardTitle>
              <HardDrive className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">%{health.diskSpace.percentage}</div>
              <p className="text-xs text-muted-foreground">
                {formatBytes(health.diskSpace.used)} / {formatBytes(health.diskSpace.total)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Performans</CardTitle>
              <Activity className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                %{Math.round(health.performance.cacheHitRatio * 100)}
              </div>
              <p className="text-xs text-muted-foreground">
                Cache hit oranı
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Recommendations */}
      {health && health.recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-yellow-500" />
              Öneriler
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {health.recommendations.map((recommendation, index) => (
                <li key={index} className="flex items-start gap-2 text-sm">
                  <AlertTriangle className="h-4 w-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                  {recommendation}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Maintenance Operations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Bakım İşlemleri
          </CardTitle>
          <CardDescription>
            Sistem performansını artırmak ve veri bütünlüğünü korumak için bakım işlemleri
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {MAINTENANCE_OPERATIONS.map((operation) => {
              const IconComponent = operation.icon;
              return (
                <Card key={operation.id} className="cursor-pointer hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <IconComponent className="h-5 w-5 text-blue-500" />
                        <CardTitle className="text-base">{operation.name}</CardTitle>
                      </div>
                      {getRiskBadge(operation.risk)}
                    </div>
                    <CardDescription className="text-sm">
                      {operation.description}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex items-center justify-between text-sm text-muted-foreground mb-3">
                      <span>{operation.category}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {operation.estimatedTime}
                      </span>
                    </div>
                    <Button
                      size="sm"
                      className="w-full"
                      onClick={() => {
                        setSelectedOperation(operation.id);
                        setShowOperationDialog(true);
                      }}
                      disabled={isMaintenanceLoading}
                    >
                      <Play className="mr-2 h-4 w-4" />
                      Çalıştır
                    </Button>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Maintenance History */}
      {maintenanceResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Bakım Geçmişi</CardTitle>
            <CardDescription>
              Son gerçekleştirilen bakım işlemleri ve sonuçları
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Mesaj</TableHead>
                  <TableHead>Süre</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {maintenanceResults.slice(0, 10).map((result, index) => (
                  <TableRow key={index}>
                    <TableCell className="font-medium">
                      {MAINTENANCE_OPERATIONS.find(op => op.id === result.operation)?.name || result.operation}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(result.status)}
                        <Badge variant={result.status === 'success' ? 'default' : 
                                      result.status === 'warning' ? 'secondary' : 'destructive'}>
                          {result.status === 'success' ? 'Başarılı' :
                           result.status === 'warning' ? 'Uyarı' : 'Hata'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="max-w-xs truncate">
                      {result.message}
                    </TableCell>
                    <TableCell>
                      {(result.executionTime / 1000).toFixed(1)}s
                    </TableCell>
                    <TableCell>
                      {new Date(result.timestamp).toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Progress Bar */}
      {isMaintenanceLoading && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Bakım işlemi çalışıyor...</span>
                <span>{progress}%</span>
              </div>
              <Progress value={progress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Operation Configuration Dialog */}
      <Dialog open={showOperationDialog} onOpenChange={setShowOperationDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {MAINTENANCE_OPERATIONS.find(op => op.id === selectedOperation)?.name}
            </DialogTitle>
            <DialogDescription>
              {MAINTENANCE_OPERATIONS.find(op => op.id === selectedOperation)?.description}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {selectedOperation === 'cleanup_logs' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Saklama Süresi (gün)</label>
                <Select
                  value={operationParams.retentionDays.toString()}
                  onValueChange={(value) => setOperationParams(prev => ({ ...prev, retentionDays: parseInt(value) }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">7 gün</SelectItem>
                    <SelectItem value="30">30 gün</SelectItem>
                    <SelectItem value="90">90 gün</SelectItem>
                    <SelectItem value="180">180 gün</SelectItem>
                    <SelectItem value="365">365 gün</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOperation === 'backup_database' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Yedekleme Tipi</label>
                <Select
                  value={operationParams.backupType}
                  onValueChange={(value: any) => setOperationParams(prev => ({ ...prev, backupType: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full">Tam Yedek</SelectItem>
                    <SelectItem value="incremental">Artımlı Yedek</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {selectedOperation === 'optimize_database' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Optimizasyon Modu</label>
                <Select
                  value={operationParams.optimizeMode}
                  onValueChange={(value: any) => setOperationParams(prev => ({ ...prev, optimizeMode: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="quick">Hızlı</SelectItem>
                    <SelectItem value="full">Tam</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setShowOperationDialog(false)}>
                İptal
              </Button>
              <Button onClick={() => setShowConfirmDialog(true)}>
                <Play className="mr-2 h-4 w-4" />
                Çalıştır
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Bakım İşlemini Onayla</AlertDialogTitle>
            <AlertDialogDescription>
              {MAINTENANCE_OPERATIONS.find(op => op.id === selectedOperation)?.name} işlemini gerçekleştirmek istediğinizden emin misiniz?
              <br /><br />
              <strong>Uyarı:</strong> Bu işlem geri alınamaz ve sistem performansını etkileyebilir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => performMaintenance(selectedOperation)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Onayla ve Çalıştır
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
