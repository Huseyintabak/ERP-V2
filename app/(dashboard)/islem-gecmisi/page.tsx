'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
  Search, 
  Filter, 
  Eye, 
  Calendar,
  User,
  Database,
  Activity,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';
import { tr } from 'date-fns/locale';
import { useAuthStore } from '@/stores/auth-store';

interface AuditLog {
  id: string;
  table_name: string;
  action: string;
  old_values: any;
  new_values: any;
  user_id: string;
  created_at: string;
  users: {
    name: string;
    email: string;
  };
}

interface AuditLogsResponse {
  data: AuditLog[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  filters: {
    tables: string[];
    actions: string[];
  };
}

export default function IslemGecmisiPage() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });
  const [filters, setFilters] = useState({
    search: '',
    table_name: '',
    action: '',
    user_id: '',
    start_date: '',
    end_date: '',
  });
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [availableFilters, setAvailableFilters] = useState({
    tables: [] as string[],
    actions: [] as string[],
  });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchAuditLogs();
  }, [pagination.page, filters]);

  const fetchAuditLogs = async () => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      Object.entries(filters).forEach(([key, value]) => {
        if (value) params.set(key, value);
      });

      const response = await fetch(`/api/audit-logs?${params.toString()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error('Audit logs yüklenemedi');
      }

      const data: AuditLogsResponse = await response.json();
      setAuditLogs(data.data);
      setPagination(data.pagination);
      setAvailableFilters(data.filters);
    } catch (error: any) {
      toast.error(error.message || 'Audit logs yüklenirken hata oluştu');
      console.error('Error fetching audit logs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, page }));
  };

  const handleViewDetails = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  const getActionBadgeColor = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'bg-green-100 text-green-800';
      case 'UPDATE':
        return 'bg-blue-100 text-blue-800';
      case 'DELETE':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getActionDisplayName = (action: string) => {
    switch (action) {
      case 'INSERT':
        return 'Ekleme';
      case 'UPDATE':
        return 'Güncelleme';
      case 'DELETE':
        return 'Silme';
      default:
        return action;
    }
  };

  const getTableDisplayName = (tableName: string) => {
    const tableNames: Record<string, string> = {
      'users': 'Kullanıcılar',
      'raw_materials': 'Hammaddeler',
      'semi_finished_products': 'Yarı Mamuller',
      'finished_products': 'Nihai Ürünler',
      'bom': 'Ürün Ağacı',
      'orders': 'Siparişler',
      'production_plans': 'Üretim Planları',
      'production_logs': 'Üretim Kayıtları',
      'stock_movements': 'Stok Hareketleri',
      'notifications': 'Bildirimler',
    };
    return tableNames[tableName] || tableName;
  };

  const formatJsonDiff = (oldValues: any, newValues: any) => {
    if (!oldValues && !newValues) return null;
    
    const changes: Array<{ field: string; old: any; new: any }> = [];
    
    if (oldValues && newValues) {
      const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
      allKeys.forEach(key => {
        if (oldValues[key] !== newValues[key]) {
          changes.push({
            field: key,
            old: oldValues[key],
            new: newValues[key],
          });
        }
      });
    } else if (newValues) {
      Object.entries(newValues).forEach(([key, value]) => {
        changes.push({
          field: key,
          old: null,
          new: value,
        });
      });
    } else if (oldValues) {
      Object.entries(oldValues).forEach(([key, value]) => {
        changes.push({
          field: key,
          old: value,
          new: null,
        });
      });
    }
    
    return changes;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">İşlem Geçmişi</h1>
          <p className="text-muted-foreground">
            Sistemdeki tüm işlemleri takip edin ve denetleyin
          </p>
        </div>
        <Button onClick={fetchAuditLogs} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Yenile
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam İşlem</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {auditLogs.filter(log => {
                const today = new Date();
                const logDate = new Date(log.created_at);
                return logDate.toDateString() === today.toDateString();
              }).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ekleme</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {auditLogs.filter(log => log.action === 'INSERT').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Güncelleme</CardTitle>
            <User className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {auditLogs.filter(log => log.action === 'UPDATE').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="mr-2 h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Kullanıcı veya tablo ara..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Tablo</label>
              <Select value={filters.table_name} onValueChange={(value) => handleFilterChange('table_name', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tablo seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm Tablolar</SelectItem>
                  {availableFilters.tables.map(table => (
                    <SelectItem key={table} value={table}>
                      {getTableDisplayName(table)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">İşlem</label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="İşlem seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Tüm İşlemler</SelectItem>
                  {availableFilters.actions.map(action => (
                    <SelectItem key={action} value={action}>
                      {getActionDisplayName(action)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle>İşlem Geçmişi</CardTitle>
          <CardDescription>
            Toplam {pagination.total} işlemden {auditLogs.length} tanesi gösteriliyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Tablo</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Değişiklikler</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {auditLogs.map((log) => {
                  const changes = formatJsonDiff(log.old_values, log.new_values);
                  const changeCount = changes ? changes.length : 0;
                  
                  return (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.users.name}</div>
                          <div className="text-sm text-muted-foreground">{log.users.email}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {getTableDisplayName(log.table_name)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className={getActionBadgeColor(log.action)}>
                          {getActionDisplayName(log.action)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {changeCount > 0 ? (
                            <span className="text-blue-600 font-medium">
                              {changeCount} alan değişti
                            </span>
                          ) : (
                            <span className="text-gray-500">Değişiklik yok</span>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDistanceToNow(new Date(log.created_at), {
                          addSuffix: true,
                          locale: tr,
                        })}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewDetails(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {pagination.page} / {pagination.pages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.pages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}

      {/* Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>İşlem Detayları</DialogTitle>
            <DialogDescription>
              {selectedLog && `${getTableDisplayName(selectedLog.table_name)} - ${getActionDisplayName(selectedLog.action)}`}
            </DialogDescription>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <h4 className="font-medium mb-2">Kullanıcı</h4>
                  <p className="text-sm">{selectedLog.users.name} ({selectedLog.users.email})</p>
                </div>
                <div>
                  <h4 className="font-medium mb-2">Tarih</h4>
                  <p className="text-sm">
                    {new Date(selectedLog.created_at).toLocaleString('tr-TR')}
                  </p>
                </div>
              </div>
              
              <div>
                <h4 className="font-medium mb-2">Değişiklikler</h4>
                <div className="bg-gray-50 p-4 rounded-lg">
                  {formatJsonDiff(selectedLog.old_values, selectedLog.new_values)?.map((change, index) => (
                    <div key={index} className="mb-2 p-2 bg-white rounded border">
                      <div className="font-medium text-sm">{change.field}</div>
                      <div className="text-xs text-gray-600">
                        {change.old !== null && (
                          <div className="text-red-600">
                            <strong>Eski:</strong> {JSON.stringify(change.old)}
                          </div>
                        )}
                        {change.new !== null && (
                          <div className="text-green-600">
                            <strong>Yeni:</strong> {JSON.stringify(change.new)}
                          </div>
                        )}
                      </div>
                    </div>
                  )) || (
                    <p className="text-gray-500 text-sm">Değişiklik bulunamadı</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

