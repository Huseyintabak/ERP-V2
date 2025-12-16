'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Package, AlertTriangle, CheckCircle, Clock, ArrowUp, ArrowDown } from 'lucide-react';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

interface Reservation {
  id: string;
  order_id: string;
  plan_id?: string;
  order_type?: string;
  material_id: string;
  material_type: 'raw' | 'semi' | 'finished';
  reserved_quantity: number;
  consumed_quantity: number;
  status: 'active' | 'completed' | 'cancelled';
  created_at: string;
  material_name?: string;
  material_code?: string;
  unit?: string;
  order_info?: {
    order_number: string;
    customer_name: string;
  };
}

interface ReservationManagerProps {
  orderId?: string;
  onReservationCreated?: () => void;
}

export default function ReservationManager({ orderId, onReservationCreated }: ReservationManagerProps) {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterOrderId, setFilterOrderId] = useState(orderId || '');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [autoRefresh, setAutoRefresh] = useState(false); // Otomatik yenileme kapalı, manuel yenileme kullanılacak
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10000, // Show all reservations by default
    total: 0,
    totalPages: 0,
  });
  const [sortField, setSortField] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const { user } = useAuthStore();

  // Rezervasyonları getir
  const fetchReservations = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const params = new URLSearchParams();
      if (filterOrderId) params.append('order_id', filterOrderId);
      if (filterStatus !== 'all') params.append('status', filterStatus);
      // Get all data for client-side sorting (use high limit)
      params.append('page', '1');
      params.append('limit', '10000');
      
      logger.log('🔍 Fetching reservations with params:', params.toString());
      
      const response = await fetch(`/api/reservations?${params.toString()}`, {
        headers: {
          'x-user-id': user.id
        }
      });
      logger.log('📡 API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        logger.error('❌ API error response:', errorText);
        throw new Error('Rezervasyonlar getirilemedi');
      }
      
      const data = await response.json();
      logger.log('📦 API response data:', data);
      
      // Debug: Log first 5 order numbers from API response
      if (data.data && data.data.length > 0) {
        const firstFive = data.data.slice(0, 5).map((r: any) => ({
          order_number: r.order_info?.order_number || 'N/A',
          order_id: r.order_id?.slice(0, 8) || 'N/A'
        }));
        logger.log('🔍 Frontend: First 5 reservations from API:', firstFive);
      }
      
      setReservations(data.data || []);
      if (data.pagination) {
        setPagination(prev => ({
          ...prev,
          total: data.pagination.total,
          totalPages: data.pagination.totalPages
        }));
      }
    } catch (err: any) {
      logger.error('❌ Fetch error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReservations();
    
    // Auto-refresh every 30 seconds for real-time updates
    let intervalId: NodeJS.Timeout | undefined;
    
    if (autoRefresh) {
      intervalId = setInterval(() => {
        logger.log('🔄 Auto-refreshing reservations...');
        fetchReservations();
      }, 30000); // 30 seconds
    }
    
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [filterOrderId, filterStatus, autoRefresh, pagination.page]);

  // Rezervasyon durumu badge'i
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge variant="default" className="bg-blue-100 text-blue-800"><Clock className="w-3 h-3 mr-1" />Aktif</Badge>;
      case 'completed':
        return <Badge variant="default" className="bg-green-100 text-green-800"><CheckCircle className="w-3 h-3 mr-1" />Tamamlandı</Badge>;
      case 'cancelled':
        return <Badge variant="destructive">İptal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Malzeme tipi badge'i
  const getMaterialTypeBadge = (type: string) => {
    switch (type) {
      case 'raw':
        return <Badge variant="outline" className="text-orange-600 border-orange-200">Hammadde</Badge>;
      case 'semi':
        return <Badge variant="outline" className="text-blue-600 border-blue-200">Yarı Mamul</Badge>;
      case 'finished':
        return <Badge variant="outline" className="text-green-600 border-green-200">Nihai Ürün</Badge>;
      default:
        return <Badge variant="outline">{type}</Badge>;
    }
  };

  // Handle column sorting
  const handleSort = (field: string) => {
    // Reset to page 1 when sorting changes
    setPagination(prev => ({ ...prev, page: 1 }));
    
    if (sortField === field) {
      // Toggle direction: desc -> asc -> null (no sort)
      if (sortDirection === 'desc') {
        setSortDirection('asc');
      } else {
        setSortField(null);
        setSortDirection('desc');
      }
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  // Filter and sort reservations
  let filteredReservations = [...reservations];
  
  // Apply status filter (client-side since we get all data)
  if (filterStatus !== 'all') {
    filteredReservations = filteredReservations.filter(r => r.status === filterStatus);
  }
  
  // Apply manual sorting
  if (sortField) {
    filteredReservations.sort((a: any, b: any) => {
      let aVal: any;
      let bVal: any;
      
      switch (sortField) {
        case 'order_number':
          const orderNumA = a.order_info?.order_number || '';
          const orderNumB = b.order_info?.order_number || '';
          // Extract numeric part (e.g., "ORD-2025-386" -> 386)
          const matchA = orderNumA.match(/-(\d+)$/);
          const matchB = orderNumB.match(/-(\d+)$/);
          aVal = matchA ? parseInt(matchA[1], 10) : 0;
          bVal = matchB ? parseInt(matchB[1], 10) : 0;
          break;
        case 'material_name':
          aVal = (a.material_name || '').toLowerCase();
          bVal = (b.material_name || '').toLowerCase();
          break;
        case 'material_code':
          aVal = (a.material_code || '').toLowerCase();
          bVal = (b.material_code || '').toLowerCase();
          break;
        case 'material_type':
          aVal = a.material_type || '';
          bVal = b.material_type || '';
          break;
        case 'reserved_quantity':
          aVal = a.reserved_quantity || 0;
          bVal = b.reserved_quantity || 0;
          break;
        case 'consumed_quantity':
          aVal = a.consumed_quantity || 0;
          bVal = b.consumed_quantity || 0;
          break;
        case 'remaining':
          aVal = (a.reserved_quantity || 0) - (a.consumed_quantity || 0);
          bVal = (b.reserved_quantity || 0) - (b.consumed_quantity || 0);
          break;
        case 'status':
          aVal = a.status || '';
          bVal = b.status || '';
          break;
        case 'created_at':
          aVal = new Date(a.created_at || 0).getTime();
          bVal = new Date(b.created_at || 0).getTime();
          break;
        default:
          return 0;
      }
      
      if (typeof aVal === 'string' && typeof bVal === 'string') {
        return sortDirection === 'asc' 
          ? aVal.localeCompare(bVal)
          : bVal.localeCompare(aVal);
      } else {
        return sortDirection === 'asc'
          ? (aVal > bVal ? 1 : aVal < bVal ? -1 : 0)
          : (aVal < bVal ? 1 : aVal > bVal ? -1 : 0);
      }
    });
  }
  
  // Don't paginate - show all reservations
  const paginatedReservations = filteredReservations;
  
  // Update pagination total
  const totalFiltered = filteredReservations.length;

  // Tüketim yüzdesi hesapla
  const getConsumptionPercentage = (reserved: number, consumed: number) => {
    if (reserved === 0) return 0;
    return Math.round((consumed / reserved) * 100);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin mr-2" />
            <span>Rezervasyonlar yükleniyor...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Filtreler */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Rezervasyon Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="orderId">Sipariş ID</Label>
              <Input
                id="orderId"
                value={filterOrderId}
                onChange={(e) => {
                  setFilterOrderId(e.target.value);
                  setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filter changes
                }}
                placeholder="Sipariş ID ile filtrele"
              />
            </div>
            <div>
              <Label htmlFor="status">Durum</Label>
              <Select 
                value={filterStatus} 
                onValueChange={(value) => {
                  setFilterStatus(value);
                  setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page when filter changes
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="completed">Tamamlandı</SelectItem>
                  <SelectItem value="cancelled">İptal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button 
                variant={autoRefresh ? "default" : "outline"} 
                onClick={() => setAutoRefresh(!autoRefresh)}
              >
                {autoRefresh ? '⏸️ Duraklat' : '▶️ Başlat'}
              </Button>
              <Button onClick={fetchReservations} className="flex-1">
                🔄 Yenile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Hata mesajı */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Rezervasyon listesi */}
      <Card>
        <CardHeader>
          <CardTitle>
            Rezervasyonlar ({totalFiltered})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {totalFiltered === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Rezervasyon bulunamadı</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      onClick={() => handleSort('order_number')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Sipariş ID
                      {sortField === 'order_number' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('material_name')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Malzeme
                      {sortField === 'material_name' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('material_type')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Tip
                      {sortField === 'material_type' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('reserved_quantity')}
                      className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                    >
                      Rezerve
                      {sortField === 'reserved_quantity' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('consumed_quantity')}
                      className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                    >
                      Tüketilen
                      {sortField === 'consumed_quantity' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('remaining')}
                      className="flex items-center gap-1 hover:text-primary transition-colors ml-auto"
                    >
                      Kalan
                      {sortField === 'remaining' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('status')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Durum
                      {sortField === 'status' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button
                      onClick={() => handleSort('created_at')}
                      className="flex items-center gap-1 hover:text-primary transition-colors"
                    >
                      Tarih
                      {sortField === 'created_at' && (
                        sortDirection === 'asc' ? <ArrowUp className="w-3 h-3" /> : <ArrowDown className="w-3 h-3" />
                      )}
                    </button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedReservations.map((reservation) => {
                  const remaining = reservation.reserved_quantity - reservation.consumed_quantity;
                  const consumptionPercentage = getConsumptionPercentage(
                    reservation.reserved_quantity, 
                    reservation.consumed_quantity
                  );
                  
                  return (
                    <TableRow key={reservation.id}>
                      <TableCell className="font-mono text-sm">
                        {reservation.order_info?.order_number || (reservation.order_id ? reservation.order_id.slice(0, 8) + '...' : 'N/A')}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{reservation.material_name || 'Bilinmiyor'}</div>
                          <div className="text-sm text-gray-500">{reservation.material_code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {getMaterialTypeBadge(reservation.material_type)}
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div>{reservation.reserved_quantity.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{reservation.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className="font-medium">{reservation.consumed_quantity.toLocaleString()}</div>
                          <div className="text-sm text-gray-500">{reservation.unit}</div>
                          {/* Progress bar */}
                          <div className="mt-2 w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden ml-auto">
                            <div 
                              className={`h-full transition-all ${
                                consumptionPercentage < 50 ? 'bg-green-500' :
                                consumptionPercentage < 90 ? 'bg-yellow-500' : 'bg-orange-500'
                              }`}
                              style={{ width: `${Math.min(consumptionPercentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-right">
                          <div className={`font-medium ${remaining < 0 ? 'text-red-600' : remaining < 10 ? 'text-orange-600' : ''}`}>
                            {remaining.toLocaleString()}
                          </div>
                          <div className="text-sm text-gray-500">{reservation.unit}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getStatusBadge(reservation.status)}
                          <div className={`text-xs font-medium ${
                            consumptionPercentage === 0 ? 'text-gray-500' :
                            consumptionPercentage < 50 ? 'text-green-600' :
                            consumptionPercentage < 90 ? 'text-yellow-600' : 'text-orange-600'
                          }`}>
                            %{consumptionPercentage} tüketildi
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {new Date(reservation.created_at).toLocaleDateString('tr-TR')}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(reservation.created_at).toLocaleTimeString('tr-TR')}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}

          {/* Show total count - no pagination needed */}
          <div className="flex items-center justify-center mt-4 pt-4 border-t">
            <p className="text-sm text-muted-foreground">
              Toplam {totalFiltered} rezervasyon gösteriliyor
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
