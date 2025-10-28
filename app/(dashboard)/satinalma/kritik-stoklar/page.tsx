'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  AlertTriangle, 
  Package, 
  ShoppingCart,
  Clock,
  CheckCircle,
  TrendingDown,
  Filter,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { PurchaseRequestsTable } from '@/components/purchase/purchase-requests-table';
import { useAuthStore } from '@/stores/auth-store';

interface PurchaseRequest {
  id: string;
  material_type: 'raw' | 'semi_finished' | 'finished';
  material_id: string;
  material_name: string;
  material_code: string;
  material_unit: string;
  current_stock: number;
  requested_quantity: number;
  approved_quantity?: number;
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'cancelled' | 'beklemede' | 'iptal_edildi';
  priority: 'low' | 'normal' | 'high' | 'critical';
  notes?: string;
  created_at: string;
  approved_at?: string;
  ordered_at?: string;
  received_at?: string;
}

export default function KritikStoklarPage() {
  const [requests, setRequests] = useState<PurchaseRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuthStore();
  
  // Filters
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [search, setSearch] = useState('');

  // KPI data
  const [kpiData, setKpiData] = useState({
    total: 0,
    pending: 0,
    critical: 0,
    approved: 0
  });

  useEffect(() => {
    fetchRequests();
  }, [page, statusFilter, priorityFilter, search]);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(statusFilter && statusFilter !== 'all' && { status: statusFilter }),
        ...(priorityFilter && priorityFilter !== 'all' && { priority: priorityFilter }),
      });

      const response = await fetch(`/api/purchase/requests?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch purchase requests');

      const result = await response.json();
      let filteredData = result.data || [];

      // Apply search filter
      if (search) {
        filteredData = filteredData.filter((req: PurchaseRequest) =>
          req.material_name.toLowerCase().includes(search.toLowerCase()) ||
          req.material_code.toLowerCase().includes(search.toLowerCase())
        );
      }

      setRequests(filteredData);
      setTotalPages(result.pagination?.totalPages || 1);

      // Calculate KPIs
      const total = result.pagination?.total || 0;
      const pending = filteredData.filter((req: PurchaseRequest) => req.status === 'pending').length;
      const critical = filteredData.filter((req: PurchaseRequest) => req.priority === 'critical').length;
      const approved = filteredData.filter((req: PurchaseRequest) => req.status === 'approved').length;

      setKpiData({ total, pending, critical, approved });
    } catch (error) {
      console.error('Error fetching purchase requests:', error);
      toast.error('Sipariş talepleri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateRequest = async (requestId: string, updates: Partial<PurchaseRequest>) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/purchase/requests/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) throw new Error('Failed to update request');

      const result = await response.json();
      
      // Update local state
      setRequests(prev => prev.map(req => 
        req.id === requestId ? { ...req, ...result.data } : req
      ));

      toast.success('Sipariş talebi başarıyla güncellendi');
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error updating request:', error);
      toast.error('Sipariş talebi güncellenirken hata oluştu');
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/purchase/requests/${requestId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) throw new Error('Failed to delete request');

      toast.success('Sipariş talebi başarıyla silindi');
      fetchRequests(); // Refresh data
    } catch (error) {
      console.error('Error deleting request:', error);
      toast.error('Sipariş talebi silinirken hata oluştu');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setPriorityFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Kritik Stok Yönetimi</h1>
          <p className="text-muted-foreground">Sipariş talepleri ve kritik stok durumu</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Talep</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Talepler</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.pending}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Kritik Öncelik</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.critical}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onaylanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.approved}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Malzeme adı veya kodu ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={statusFilter} onValueChange={(value) => setStatusFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Durumlar</SelectItem>
                <SelectItem value="pending">Bekliyor</SelectItem>
                <SelectItem value="approved">Onaylandı</SelectItem>
                <SelectItem value="rejected">Reddedildi</SelectItem>
                <SelectItem value="ordered">Sipariş Verildi</SelectItem>
                <SelectItem value="received">Teslim Alındı</SelectItem>
                <SelectItem value="cancelled">İptal Edildi</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={(value) => setPriorityFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Öncelik seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Öncelikler</SelectItem>
                <SelectItem value="low">Düşük</SelectItem>
                <SelectItem value="normal">Normal</SelectItem>
                <SelectItem value="high">Yüksek</SelectItem>
                <SelectItem value="critical">Kritik</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Purchase Requests Table */}
      <PurchaseRequestsTable
        requests={requests}
        onUpdateRequest={handleUpdateRequest}
        onDeleteRequest={handleDeleteRequest}
      />

      {/* Pagination */}
      {totalPages > 1 && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Sayfa {page} / {totalPages}
              </div>
              <div className="flex space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                >
                  Önceki
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(page + 1)}
                  disabled={page === totalPages}
                >
                  Sonraki
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
