'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { logger } from '@/lib/utils/logger';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  FileText, 
  Filter,
  Search,
  BarChart3,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';

interface ExcelError {
  id: string;
  file_name: string;
  file_type: string;
  operation_type: string;
  error_type: string;
  error_code: string;
  error_message: string;
  error_details: any;
  row_number: number;
  column_name: string;
  cell_value: string;
  expected_format: string;
  solution_suggestion: string;
  severity: string;
  status: string;
  created_at: string;
  resolved_at: string;
  resolution_notes: string;
  users: {
    id: string;
    name: string;
    email: string;
  };
  resolved_user?: {
    id: string;
    name: string;
    email: string;
  };
}

interface ErrorStats {
  total_errors: number;
  recent_errors: number;
  errors_by_type: Record<string, number>;
  errors_by_severity: Record<string, number>;
  period_days: number;
  timestamp: string;
}

export default function ExcelErrorManager() {
  const [errors, setErrors] = useState<ExcelError[]>([]);
  const [stats, setStats] = useState<ErrorStats | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info', text: string } | null>(null);
  
  // Filtreler
  const [filters, setFilters] = useState({
    error_type: 'all',
    severity: 'all',
    status: 'all',
    user_id: '',
    page: 1,
    limit: 50
  });
  
  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0
  });

  // Dialog states
  const [selectedError, setSelectedError] = useState<ExcelError | null>(null);
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [resolutionNotes, setResolutionNotes] = useState('');

  const fetchErrors = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value !== 'all') params.append(key, value.toString());
      });

      const response = await fetch(`/api/excel-errors?${params}`);
      const data = await response.json();
      
      if (data.data) {
        setErrors(data.data);
        setPagination(data.pagination);
      }
    } catch (error) {
      logger.error('Error fetching errors:', error);
      setMessage({ type: 'error', text: 'Hatalar yüklenemedi' });
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/excel-errors/stats');
      const data = await response.json();
      
      if (data.data?.success) {
        setStats(data.data.stats);
      }
    } catch (error) {
      logger.error('Error fetching stats:', error);
    }
  };

  const resolveError = async (errorId: string, notes: string) => {
    try {
      setLoading(true);
      const response = await fetch('/api/excel-errors/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          error_id: errorId,
          resolution_notes: notes
        })
      });
      
      const data = await response.json();
      
      if (data.data?.success) {
        setMessage({ type: 'success', text: 'Hata başarıyla çözüldü olarak işaretlendi' });
        setResolveDialogOpen(false);
        setResolutionNotes('');
        await fetchErrors();
        await fetchStats();
      } else {
        setMessage({ type: 'error', text: data.data?.message || 'Hata çözülemedi' });
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'Hata çözme işlemi başarısız' });
    } finally {
      setLoading(false);
    }
  };

  const handleResolve = (error: ExcelError) => {
    setSelectedError(error);
    setResolveDialogOpen(true);
  };

  const handleFilterChange = (key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value, page: 1 }));
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'bg-green-500';
      case 'unresolved': return 'bg-red-500';
      case 'ignored': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'resolved': return 'Çözüldü';
      case 'unresolved': return 'Çözülmedi';
      case 'ignored': return 'Yok Sayıldı';
      default: return 'Bilinmiyor';
    }
  };

  useEffect(() => {
    fetchErrors();
    fetchStats();
  }, [filters]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Excel Hata Yönetimi</h1>
          <p className="text-muted-foreground">
            Excel import/export hatalarını izleyin ve yönetin
          </p>
        </div>
        <Button onClick={() => { fetchErrors(); fetchStats(); }} disabled={loading}>
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

      {/* İstatistikler */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Toplam Hata</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Son 7 Gün</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.recent_errors}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Kritik Hatalar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {stats.errors_by_severity?.critical || 0}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Çözülmemiş</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {stats.errors_by_severity?.unresolved || 0}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filtreler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label htmlFor="error-type">Hata Türü</Label>
              <Select value={filters.error_type} onValueChange={(value) => handleFilterChange('error_type', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Hata türü seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="format">Format</SelectItem>
                  <SelectItem value="validation">Validasyon</SelectItem>
                  <SelectItem value="data">Veri</SelectItem>
                  <SelectItem value="system">Sistem</SelectItem>
                  <SelectItem value="permission">İzin</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="severity">Şiddet</Label>
              <Select value={filters.severity} onValueChange={(value) => handleFilterChange('severity', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Şiddet seçin" />
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
              <Label htmlFor="status">Durum</Label>
              <Select value={filters.status} onValueChange={(value) => handleFilterChange('status', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="unresolved">Çözülmemiş</SelectItem>
                  <SelectItem value="resolved">Çözülmüş</SelectItem>
                  <SelectItem value="ignored">Yok Sayılmış</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="limit">Sayfa Başına</Label>
              <Select value={filters.limit.toString()} onValueChange={(value) => handleFilterChange('limit', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Sayfa başına seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                  <SelectItem value="100">100</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hata Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Hata Listesi</CardTitle>
          <CardDescription>
            Toplam {pagination.total} hata, sayfa {pagination.page}/{pagination.pages}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dosya</TableHead>
                <TableHead>Hata Türü</TableHead>
                <TableHead>Şiddet</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>Kullanıcı</TableHead>
                <TableHead>Tarih</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {errors.map((error) => (
                <TableRow key={error.id}>
                  <TableCell>
                    <div>
                      <div className="font-medium">{error.file_name}</div>
                      <div className="text-sm text-muted-foreground">
                        {error.operation_type} - {error.file_type}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline">{error.error_type}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getSeverityColor(error.severity)} text-white`}>
                      {error.severity}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge className={`${getStatusColor(error.status)} text-white`}>
                      {getStatusText(error.status)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div>
                      <div className="font-medium">{error.users.name}</div>
                      <div className="text-sm text-muted-foreground">{error.users.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>
                    {new Date(error.created_at).toLocaleString('tr-TR')}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button variant="outline" size="sm">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl">
                          <DialogHeader>
                            <DialogTitle>Hata Detayları</DialogTitle>
                            <DialogDescription>
                              {error.error_message}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label>Dosya:</Label>
                              <p className="font-medium">{error.file_name}</p>
                            </div>
                            <div>
                              <Label>Hata Kodu:</Label>
                              <p className="font-mono text-sm">{error.error_code}</p>
                            </div>
                            {error.row_number && (
                              <div>
                                <Label>Satır:</Label>
                                <p>{error.row_number}</p>
                              </div>
                            )}
                            {error.column_name && (
                              <div>
                                <Label>Sütun:</Label>
                                <p>{error.column_name}</p>
                              </div>
                            )}
                            {error.cell_value && (
                              <div>
                                <Label>Hücre Değeri:</Label>
                                <p className="font-mono text-sm">{error.cell_value}</p>
                              </div>
                            )}
                            <div>
                              <Label>Çözüm Önerisi:</Label>
                              <p className="text-sm text-muted-foreground">{error.solution_suggestion}</p>
                            </div>
                            {error.error_details && (
                              <div>
                                <Label>Detaylar:</Label>
                                <pre className="text-xs bg-muted p-2 rounded">
                                  {JSON.stringify(error.error_details, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                      {error.status === 'unresolved' && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleResolve(error)}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-between mt-4">
              <div className="text-sm text-muted-foreground">
                Sayfa {pagination.page} / {pagination.pages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', (pagination.page - 1).toString())}
                  disabled={pagination.page <= 1}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFilterChange('page', (pagination.page + 1).toString())}
                  disabled={pagination.page >= pagination.pages}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Çözüm Dialog */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Hatayı Çöz</DialogTitle>
            <DialogDescription>
              Bu hatayı çözüldü olarak işaretlemek istediğinizden emin misiniz?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedError && (
              <div>
                <Label>Hata:</Label>
                <p className="font-medium">{selectedError.error_message}</p>
              </div>
            )}
            <div>
              <Label htmlFor="resolution-notes">Çözüm Notları</Label>
              <Textarea
                id="resolution-notes"
                value={resolutionNotes}
                onChange={(e) => setResolutionNotes(e.target.value)}
                placeholder="Hatayı nasıl çözdüğünüzü açıklayın..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
                İptal
              </Button>
              <Button 
                onClick={() => selectedError && resolveError(selectedError.id, resolutionNotes)}
                disabled={loading}
              >
                Çözüldü Olarak İşaretle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
