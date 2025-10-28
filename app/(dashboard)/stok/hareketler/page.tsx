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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  ArrowUpDown, 
  Package, 
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Filter,
  Search,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface StockMovement {
  id: string;
  material_type: 'raw' | 'semi' | 'finished';
  material_id: string;
  material_name: string;
  movement_type: 'giris' | 'cikis' | 'uretim' | 'transfer';
  movement_type_label: string;
  quantity: number;
  movement_source: string;
  movement_source_label: string;
  user_id: string;
  user_name: string;
  before_quantity: number;
  after_quantity: number;
  description: string;
  created_at: string;
}

export default function StokHareketleriPage() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { user } = useAuthStore();
  
  // Filters
  const [materialTypeFilter, setMaterialTypeFilter] = useState('');
  const [movementTypeFilter, setMovementTypeFilter] = useState('');
  const [search, setSearch] = useState('');

  // KPI data
  const [kpiData, setKpiData] = useState({
    total: 0,
    entries: 0,
    exits: 0,
    production: 0
  });

  useEffect(() => {
    fetchMovements();
  }, [page, materialTypeFilter, movementTypeFilter, search]);

  const fetchMovements = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50',
        ...(materialTypeFilter && materialTypeFilter !== 'all' && { type: materialTypeFilter }),
        ...(movementTypeFilter && movementTypeFilter !== 'all' && { movementType: movementTypeFilter }),
      });

      const response = await fetch(`/api/stock/movements?${params}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      if (!response.ok) throw new Error('Failed to fetch stock movements');

      const result = await response.json();
      let filteredData = result.data || [];

      // Apply search filter
      if (search) {
        filteredData = filteredData.filter((movement: StockMovement) =>
          movement.material_name?.toLowerCase().includes(search.toLowerCase()) ||
          movement.description?.toLowerCase().includes(search.toLowerCase())
        );
      }

      setMovements(filteredData);
      setTotalPages(result.pagination?.totalPages || 1);

      // Calculate KPIs
      const total = result.pagination?.total || 0;
      const entries = filteredData.filter((m: StockMovement) => m.movement_type === 'giris').length;
      const exits = filteredData.filter((m: StockMovement) => m.movement_type === 'cikis').length;
      const production = filteredData.filter((m: StockMovement) => m.movement_type === 'uretim').length;

      setKpiData({ total, entries, exits, production });
    } catch (error) {
      console.error('Error fetching stock movements:', error);
      toast.error('Stok hareketleri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getMovementTypeIcon = (movementType: string) => {
    switch (movementType) {
      case 'giris':
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'cikis':
        return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'uretim':
        return <Package className="h-4 w-4 text-blue-600" />;
      case 'transfer':
        return <ArrowRight className="h-4 w-4 text-purple-600" />;
      default:
        return <ArrowUpDown className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementTypeBadge = (movementType: string, movementTypeLabel: string) => {
    const variants = {
      'giris': 'default' as const,
      'cikis': 'destructive' as const,
      'uretim': 'secondary' as const,
      'transfer': 'outline' as const,
    };
    
    return (
      <Badge variant={variants[movementType as keyof typeof variants] || 'secondary'}>
        {movementTypeLabel}
      </Badge>
    );
  };

  const getMaterialTypeBadge = (materialType: string) => {
    const variants = {
      'raw': { label: 'Hammadde', variant: 'secondary' as const },
      'semi': { label: 'Yarı Mamul', variant: 'default' as const },
      'finished': { label: 'Nihai Ürün', variant: 'outline' as const },
    };
    
    const config = variants[materialType as keyof typeof variants] || { 
      label: materialType, 
      variant: 'secondary' as const 
    };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const clearFilters = () => {
    setMaterialTypeFilter('');
    setMovementTypeFilter('');
    setSearch('');
    setPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Stok Hareketleri</h1>
          <p className="text-muted-foreground">Tüm stok hareketlerini görüntüleyin ve yönetin</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Hareket</CardTitle>
            <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.total}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Giriş Hareketi</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{kpiData.entries}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Çıkış Hareketi</CardTitle>
            <TrendingDown className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{kpiData.exits}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Üretim Hareketi</CardTitle>
            <Package className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{kpiData.production}</div>
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
                placeholder="Malzeme adı veya açıklama ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={materialTypeFilter} onValueChange={(value) => setMaterialTypeFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Malzeme türü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Malzemeler</SelectItem>
                <SelectItem value="raw">Hammadde</SelectItem>
                <SelectItem value="semi">Yarı Mamul</SelectItem>
                <SelectItem value="finished">Nihai Ürün</SelectItem>
              </SelectContent>
            </Select>

            <Select value={movementTypeFilter} onValueChange={(value) => setMovementTypeFilter(value === 'all' ? '' : value)}>
              <SelectTrigger>
                <SelectValue placeholder="Hareket türü seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tüm Hareketler</SelectItem>
                <SelectItem value="giris">Giriş</SelectItem>
                <SelectItem value="cikis">Çıkış</SelectItem>
                <SelectItem value="uretim">Üretim</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" onClick={clearFilters}>
              <Filter className="h-4 w-4 mr-2" />
              Temizle
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Movements Table */}
      <Card>
        <CardHeader>
          <CardTitle>Stok Hareketleri</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-8">Yükleniyor...</div>
          ) : movements.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Stok hareketi bulunamadı
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Malzeme</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Hareket</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Önceki Stok</TableHead>
                    <TableHead>Sonraki Stok</TableHead>
                    <TableHead>Kaynak</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Açıklama</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {movements.map((movement) => (
                    <TableRow key={movement.id}>
                      <TableCell>
                        <div className="font-medium">{movement.material_name || 'Bilinmeyen Malzeme'}</div>
                      </TableCell>
                      <TableCell>
                        {getMaterialTypeBadge(movement.material_type)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getMovementTypeIcon(movement.movement_type)}
                          {getMovementTypeBadge(movement.movement_type, movement.movement_type_label || 'Bilinmeyen')}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className={`font-medium ${
                          movement.movement_type === 'giris' ? 'text-green-600' : 
                          movement.movement_type === 'cikis' ? 'text-red-600' : 'text-blue-600'
                        }`}>
                          {movement.movement_type === 'giris' ? '+' : '-'}{movement.quantity || 0}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-muted-foreground">{movement.before_quantity ?? '-'}</span>
                      </TableCell>
                      <TableCell>
                        <span className="font-medium">{movement.after_quantity ?? '-'}</span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">{movement.movement_source_label || 'Manuel'}</Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-sm">
                            {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {new Date(movement.created_at).toLocaleTimeString('tr-TR')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground max-w-xs truncate block">
                          {movement.description || '-'}
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

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
