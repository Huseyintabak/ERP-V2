'use client';

import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { 
  Search, 
  Filter, 
  Download, 
  RefreshCw, 
  Eye, 
  Calendar,
  User,
  Database,
  Activity,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { tr } from 'date-fns/locale';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

interface AuditLog {
  id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: any;
  new_values: any;
  description: string;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: string;
}

interface AuditLogViewerProps {
  onExport?: (filters: any) => void;
}

export function AuditLogViewer({ onExport }: AuditLogViewerProps) {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { user } = useAuthStore();
  
  // Filters
  const [filters, setFilters] = useState({
    search: '',
    action: 'all',
    table: 'all',
    severity: 'all',
    user: 'all',
    dateFrom: '',
    dateTo: '',
    limit: '50'
  });

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Load audit logs
  const loadAuditLogs = async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      
      const queryParams = new URLSearchParams({
        page: currentPage.toString(),
        limit: filters.limit,
        ...(filters.search && { search: filters.search }),
        ...(filters.action !== 'all' && { action: filters.action }),
        ...(filters.table !== 'all' && { table: filters.table }),
        ...(filters.severity !== 'all' && { severity: filters.severity }),
        ...(filters.user !== 'all' && { user: filters.user }),
        ...(filters.dateFrom && { dateFrom: filters.dateFrom }),
        ...(filters.dateTo && { dateTo: filters.dateTo }),
      });

      const response = await fetch(`/api/audit-logs?${queryParams}`, {
        headers: {
          'x-user-id': user.id
        }
      });
      if (!response.ok) {
        throw new Error('Audit log verisi yüklenemedi');
      }

      const data = await response.json();
      setAuditLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch (error: any) {
      logger.error('Error loading audit logs:', error);
      toast.error(error.message || 'Audit log verisi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAuditLogs();
  }, [currentPage, filters]);

  // Get severity badge
  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge variant="destructive">Kritik</Badge>;
      case 'high':
        return <Badge className="bg-red-600">Yüksek</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-600">Orta</Badge>;
      case 'low':
        return <Badge variant="outline">Düşük</Badge>;
      default:
        return <Badge variant="secondary">Bilinmiyor</Badge>;
    }
  };

  // Get action badge
  const getActionBadge = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <Badge className="bg-green-600">Ekleme</Badge>;
      case 'UPDATE':
        return <Badge className="bg-blue-600">Güncelleme</Badge>;
      case 'DELETE':
        return <Badge className="bg-red-600">Silme</Badge>;
      case 'LOGIN':
        return <Badge className="bg-purple-600">Giriş</Badge>;
      case 'LOGOUT':
        return <Badge className="bg-gray-600">Çıkış</Badge>;
      default:
        return <Badge variant="outline">{action}</Badge>;
    }
  };

  // Get action icon
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'INSERT':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'UPDATE':
        return <Activity className="h-4 w-4 text-blue-600" />;
      case 'DELETE':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'LOGIN':
        return <User className="h-4 w-4 text-purple-600" />;
      case 'LOGOUT':
        return <User className="h-4 w-4 text-gray-600" />;
      default:
        return <Activity className="h-4 w-4 text-gray-600" />;
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return auditLogs.filter(log => {
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        return (
          log.description.toLowerCase().includes(searchLower) ||
          log.table_name.toLowerCase().includes(searchLower) ||
          log.user_name?.toLowerCase().includes(searchLower) ||
          log.user_email?.toLowerCase().includes(searchLower)
        );
      }
      return true;
    });
  }, [auditLogs, filters.search]);

  // Handle filter change
  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  // Handle export
  const handleExport = () => {
    onExport?.(filters);
    toast.success('Audit log export edildi');
  };

  // Handle log detail
  const handleLogDetail = (log: AuditLog) => {
    setSelectedLog(log);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Database className="h-6 w-6" />
            Audit Log Sistemi
          </h2>
          <p className="text-muted-foreground">
            Tüm sistem işlemlerinin detaylı kaydı ve izlenmesi
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={loadAuditLogs} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="search">Arama</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="search"
                  placeholder="Ara..."
                  value={filters.search}
                  onChange={(e) => handleFilterChange('search', e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="action">İşlem</Label>
              <Select value={filters.action} onValueChange={(value) => handleFilterChange('action', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="İşlem seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="INSERT">Ekleme</SelectItem>
                  <SelectItem value="UPDATE">Güncelleme</SelectItem>
                  <SelectItem value="DELETE">Silme</SelectItem>
                  <SelectItem value="LOGIN">Giriş</SelectItem>
                  <SelectItem value="LOGOUT">Çıkış</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="table">Tablo</Label>
              <Select value={filters.table} onValueChange={(value) => handleFilterChange('table', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Tablo seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="users">Kullanıcılar</SelectItem>
                  <SelectItem value="orders">Siparişler</SelectItem>
                  <SelectItem value="production_plans">Üretim Planları</SelectItem>
                  <SelectItem value="raw_materials">Hammaddeler</SelectItem>
                  <SelectItem value="semi_finished_products">Yarı Mamuller</SelectItem>
                  <SelectItem value="finished_products">Nihai Ürünler</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="severity">Önem</Label>
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Önem seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="critical">Kritik</SelectItem>
                  <SelectItem value="high">Yüksek</SelectItem>
                  <SelectItem value="medium">Orta</SelectItem>
                  <SelectItem value="low">Düşük</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dateFrom">Başlangıç Tarihi</Label>
              <Input
                id="dateFrom"
                type="date"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="dateTo">Bitiş Tarihi</Label>
              <Input
                id="dateTo"
                type="date"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>

            <div>
              <Label htmlFor="limit">Kayıt Sayısı</Label>
              <Select value={filters.limit} onValueChange={(value) => handleFilterChange('limit', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Kayıt sayısı" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                  <SelectItem value="250">250</SelectItem>
                  <SelectItem value="500">500</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => setFilters({
                  search: '',
                  action: 'all',
                  table: 'all',
                  severity: 'all',
                  user: 'all',
                  dateFrom: '',
                  dateTo: '',
                  limit: '50'
                })}
              >
                <Filter className="h-4 w-4 mr-2" />
                Temizle
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audit Logs Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Audit Log Kayıtları
            <Badge variant="outline">{filteredLogs.length} kayıt</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <RefreshCw className="h-8 w-8 animate-spin" />
              <span className="ml-2">Yükleniyor...</span>
            </div>
          ) : (
            <div className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>İşlem</TableHead>
                    <TableHead>Kullanıcı</TableHead>
                    <TableHead>Tablo</TableHead>
                    <TableHead>Açıklama</TableHead>
                    <TableHead>Önem</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getActionIcon(log.action)}
                          {getActionBadge(log.action)}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <div>
                          <div className="font-medium">{log.user_name || 'Bilinmeyen'}</div>
                          <div className="text-sm text-muted-foreground">{log.user_email}</div>
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Badge variant="outline">{log.table_name}</Badge>
                      </TableCell>
                      
                      <TableCell>
                        <div className="max-w-xs truncate" title={log.description}>
                          {log.description}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        {getSeverityBadge(log.severity)}
                      </TableCell>
                      
                      <TableCell>
                        <div className="text-sm">
                          {format(parseISO(log.created_at), 'dd MMM yyyy HH:mm', { locale: tr })}
                        </div>
                      </TableCell>
                      
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleLogDetail(log)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between">
                  <div className="text-sm text-muted-foreground">
                    Sayfa {currentPage} / {totalPages}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                      disabled={currentPage === 1}
                    >
                      Önceki
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                      disabled={currentPage === totalPages}
                    >
                      Sonraki
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Log Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Audit Log Detayı
            </DialogTitle>
          </DialogHeader>
          
          {selectedLog && (
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">İşlem</Label>
                  <div className="flex items-center gap-2 mt-1">
                    {getActionIcon(selectedLog.action)}
                    {getActionBadge(selectedLog.action)}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Önem</Label>
                  <div className="mt-1">
                    {getSeverityBadge(selectedLog.severity)}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Kullanıcı</Label>
                  <div className="mt-1">
                    <div className="font-medium">{selectedLog.user_name || 'Bilinmeyen'}</div>
                    <div className="text-sm text-muted-foreground">{selectedLog.user_email}</div>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Tarih</Label>
                  <div className="mt-1 text-sm">
                    {format(parseISO(selectedLog.created_at), 'dd MMMM yyyy HH:mm:ss', { locale: tr })}
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Tablo</Label>
                  <div className="mt-1">
                    <Badge variant="outline">{selectedLog.table_name}</Badge>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Kayıt ID</Label>
                  <div className="mt-1 font-mono text-sm">{selectedLog.record_id}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <Label className="text-sm font-medium">Açıklama</Label>
                <div className="mt-1 p-3 bg-muted rounded-lg">
                  {selectedLog.description}
                </div>
              </div>

              {/* Values */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-medium">Eski Değerler</Label>
                  <div className="mt-1 p-3 bg-red-50 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedLog.old_values, null, 2)}
                    </pre>
                  </div>
                </div>
                
                <div>
                  <Label className="text-sm font-medium">Yeni Değerler</Label>
                  <div className="mt-1 p-3 bg-green-50 rounded-lg">
                    <pre className="text-xs overflow-auto max-h-32">
                      {JSON.stringify(selectedLog.new_values, null, 2)}
                    </pre>
                  </div>
                </div>
              </div>

              {/* Technical Info */}
              {(selectedLog.ip_address || selectedLog.user_agent) && (
                <div>
                  <Label className="text-sm font-medium">Teknik Bilgiler</Label>
                  <div className="mt-1 space-y-2">
                    {selectedLog.ip_address && (
                      <div className="text-sm">
                        <span className="font-medium">IP Adresi:</span> {selectedLog.ip_address}
                      </div>
                    )}
                    {selectedLog.user_agent && (
                      <div className="text-sm">
                        <span className="font-medium">User Agent:</span> {selectedLog.user_agent}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
