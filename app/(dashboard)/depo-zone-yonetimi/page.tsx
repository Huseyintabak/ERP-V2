'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Building2, 
  Users, 
  Package, 
  Plus,
  Eye,
  ArrowRightLeft,
  Search
} from 'lucide-react';
import { toast } from 'sonner';
import { ZoneList } from '@/components/warehouse/zone-list';
import { ZoneTransferDialog } from '@/components/warehouse/zone-transfer-dialog';
import { useAuthStore } from '@/stores/auth-store';

interface WarehouseZone {
  id: string;
  name: string;
  zone_type: 'center' | 'customer' | 'general';
  customer_id?: string;
  created_at: string;
  customer?: {
    id: string;
    name: string;
    email: string;
  };
  inventory_count?: number;
  total_products?: number;
}

interface Customer {
  id: string;
  name: string;
  email: string;
}

interface ZoneInventory {
  id: string;
  zone_id: string;
  product_id: string;
  quantity: number;
  latest_transfer_date?: string | null;
  latest_transfer_from?: string | null;
  product: {
    id: string;
    name: string;
    code: string;
    unit_price: number;
  };
}

export default function DepoZoneYonetimiPage() {
  const [zones, setZones] = useState<WarehouseZone[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { user } = useAuthStore();
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [isCenterInventoryDialogOpen, setIsCenterInventoryDialogOpen] = useState(false);
  const [isTransferDialogOpen, setIsTransferDialogOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedProductIdForTransfer, setSelectedProductIdForTransfer] = useState<string>('');
  const [selectedZoneInventory, setSelectedZoneInventory] = useState<ZoneInventory[]>([]);
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null);
  const [centerInventory, setCenterInventory] = useState<ZoneInventory[]>([]);
  
  // Date filter states
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');
  
  // Create zone form
  const [newZoneName, setNewZoneName] = useState('');
  const [newZoneCustomerId, setNewZoneCustomerId] = useState('');
  const [newZoneType, setNewZoneType] = useState<'general' | 'customer'>('general');

  // KPI data
  const [kpiData, setKpiData] = useState({
    totalZones: 0,
    customerZones: 0,
    centerZones: 0,
    totalProducts: 0
  });

  useEffect(() => {
    fetchZones();
    fetchCustomers();
  }, []);

  const fetchZones = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/warehouse/zones', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      const zonesData = result.data || [];
      setZones(zonesData);

      // Calculate KPIs
      const totalZones = zonesData.length;
      const customerZones = zonesData.filter((z: WarehouseZone) => z.zone_type === 'customer').length;
      const centerZones = zonesData.filter((z: WarehouseZone) => z.zone_type === 'center').length;
      const totalProducts = zonesData.reduce((sum: number, zone: WarehouseZone) => 
        sum + (zone.total_products || 0), 0
      );

      setKpiData({ totalZones, customerZones, centerZones, totalProducts });
    } catch (error) {
      console.error('Error fetching zones:', error);
      toast.error('Zone bilgileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/customers', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      setCustomers(result.data || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
    }
  };

  const fetchZoneInventory = async (zoneId: string, startDate?: string, endDate?: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      
      // Use provided dates or state dates
      const useStartDate = startDate !== undefined ? startDate : filterStartDate;
      const useEndDate = endDate !== undefined ? endDate : filterEndDate;
      
      // Build query params with date filters
      const params = new URLSearchParams();
      if (useStartDate) {
        params.append('startDate', useStartDate);
      }
      if (useEndDate) {
        params.append('endDate', useEndDate);
      }
      
      const url = `/api/warehouse/zones/${zoneId}/inventory${params.toString() ? `?${params.toString()}` : ''}`;
      
      console.log('Fetching zone inventory with filters:', { zoneId, startDate: useStartDate, endDate: useEndDate, url });
      
      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      console.log('Zone inventory result:', { count: result.data?.length, data: result.data });
      setSelectedZoneInventory(result.data || []);
      setSelectedZone(result.zone);
    } catch (error) {
      console.error('Error fetching zone inventory:', error);
      toast.error('Stok bilgileri yüklenirken hata oluştu');
    }
  };
  
  const handleApplyDateFilter = async () => {
    if (!selectedZoneId) {
      toast.error('Zone seçilmedi');
      return;
    }
    
    if (!filterStartDate && !filterEndDate) {
      toast.error('Lütfen en az bir tarih seçin');
      return;
    }
    
    console.log('Applying date filter:', { filterStartDate, filterEndDate, selectedZoneId });
    
    try {
      // Pass dates directly to avoid state timing issues
      await fetchZoneInventory(selectedZoneId, filterStartDate, filterEndDate);
      toast.success('Filtre uygulandı');
    } catch (error) {
      console.error('Filter error:', error);
      toast.error('Filtreleme sırasında hata oluştu');
    }
  };
  
  const handleClearDateFilter = async () => {
    setFilterStartDate('');
    setFilterEndDate('');
    if (selectedZoneId) {
      // Pass empty strings to clear filters
      await fetchZoneInventory(selectedZoneId, '', '');
      toast.success('Filtreler temizlendi');
    }
  };

  const fetchCenterInventory = async () => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/warehouse/zones/center/inventory', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `HTTP error! status: ${response.status}`;
        
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          // If parsing fails, use the text as is
          if (errorText && !errorText.includes('/login')) {
            errorMessage = errorText;
          }
        }
        
        if (errorText.includes('/login')) {
          console.warn('Redirect to login detected');
          return;
        }
        
        throw new Error(errorMessage);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      setCenterInventory(result.data || []);
    } catch (error: any) {
      console.error('Error fetching center inventory:', error);
      const errorMessage = error?.message || 'Merkez depo stok bilgileri yüklenirken hata oluştu';
      toast.error(errorMessage);
    }
  };

  const handleCreateZone = async () => {
    if (!newZoneName.trim()) {
      toast.error('Zone adı gerekli');
      return;
    }

    if (newZoneType === 'customer' && !newZoneCustomerId) {
      toast.error('Müşteri seçimi gerekli');
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/warehouse/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          name: newZoneName.trim(),
          customer_id: newZoneType === 'customer' ? newZoneCustomerId : null
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('/login')) {
          console.warn('Redirect to login detected');
          return;
        }
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'Failed to create zone');
      }

      toast.success('Zone başarıyla oluşturuldu');
      setIsCreateDialogOpen(false);
      setNewZoneName('');
      setNewZoneCustomerId('');
      setNewZoneType('general');
      fetchZones();
    } catch (error) {
      console.error('Error creating zone:', error);
      toast.error('Zone oluşturulurken hata oluştu');
    }
  };

  const handleViewInventory = (zoneId: string) => {
    setSelectedZoneId(zoneId);
    setIsInventoryDialogOpen(true);
    // Reset date filters when opening
    setFilterStartDate('');
    setFilterEndDate('');
    fetchZoneInventory(zoneId);
  };

  const handleTransfer = (zoneIdOrProductId: string, isCenterZone: boolean = false) => {
    if (isCenterZone) {
      // Merkez zone için transfer - merkez zone ID'sini bul ve transfer dialog'u aç
      const centerZone = zones.find(z => z.zone_type === 'center');
      if (centerZone) {
        setSelectedZoneId(centerZone.id);
        setSelectedProductIdForTransfer(zoneIdOrProductId); // product_id
        setIsTransferDialogOpen(true);
      }
    } else {
      // Normal zone için transfer
      setSelectedZoneId(zoneIdOrProductId);
      setSelectedProductIdForTransfer('');
      setIsTransferDialogOpen(true);
    }
  };

  const filteredZones = zones.filter(zone =>
    zone.name.toLowerCase().includes(search.toLowerCase()) ||
    zone.customer?.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Depo Zone Yönetimi</h1>
          <p className="text-muted-foreground">Warehouse zone'larını yönetin ve ürün transferi yapın</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Zone</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalZones}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Müşteri Zone</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.customerZones}</div>
          </CardContent>
        </Card>

        <Card 
          className="cursor-pointer hover:bg-gray-50 transition-colors"
          onClick={() => {
            fetchCenterInventory();
            setIsCenterInventoryDialogOpen(true);
          }}
        >
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nihai Stoklar Merkez</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.centerZones}</div>
            <p className="text-xs text-muted-foreground">Tüm üretilen ürünler</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalProducts}</div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Zone Yönetimi</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Zone adı veya müşteri ara..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Yeni Zone
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Yeni Zone Oluştur</DialogTitle>
                  <DialogDescription>
                    Yeni bir warehouse zone oluşturun
                  </DialogDescription>
                </DialogHeader>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="zoneName">Zone Adı</Label>
                    <Input
                      id="zoneName"
                      value={newZoneName}
                      onChange={(e) => setNewZoneName(e.target.value)}
                      placeholder="Zone adını girin"
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="zoneType">Zone Türü</Label>
                    <Select value={newZoneType} onValueChange={(value: 'general' | 'customer') => setNewZoneType(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="general">Genel Zone</SelectItem>
                        <SelectItem value="customer">Müşteri Zone</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {newZoneType === 'customer' && (
                    <div className="space-y-2">
                      <Label htmlFor="customer">Müşteri</Label>
                      <Select value={newZoneCustomerId} onValueChange={setNewZoneCustomerId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Müşteri seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    İptal
                  </Button>
                  <Button onClick={handleCreateZone}>
                    Oluştur
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* Zone List */}
      <ZoneList
        zones={filteredZones}
        onViewInventory={handleViewInventory}
        onTransfer={handleTransfer}
        allZones={zones}
        onTransferComplete={fetchZones}
      />

      {/* Zone Inventory Dialog */}
      <Dialog open={isInventoryDialogOpen} onOpenChange={setIsInventoryDialogOpen}>
        <DialogContent className="zone-stock-detail-modal flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Zone Stok Detayları
            </DialogTitle>
            <DialogDescription>
              {selectedZone?.name} - Stok durumu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            {selectedZone && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{selectedZone.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant={selectedZone.zone_type === 'center' ? 'default' : 'secondary'}>
                      {selectedZone.zone_type === 'center' ? 'Merkez Zone' : 
                       selectedZone.zone_type === 'customer' ? 'Müşteri Zone' : 'Genel Zone'}
                    </Badge>
                    {selectedZone.customer && (
                      <Badge variant="outline">{selectedZone.customer.name}</Badge>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {/* Date Filter */}
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="startDate" className="text-sm font-medium text-gray-700">
                    Başlangıç Tarihi
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    className="mt-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyDateFilter();
                      }
                    }}
                  />
                </div>
                <div>
                  <Label htmlFor="endDate" className="text-sm font-medium text-gray-700">
                    Bitiş Tarihi
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    className="mt-1"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyDateFilter();
                      }
                    }}
                  />
                </div>
                <div className="flex items-end gap-2">
                  <Button 
                    onClick={(e) => {
                      e.preventDefault();
                      handleApplyDateFilter();
                    }}
                    className="flex-1"
                    variant="default"
                    type="button"
                  >
                    Filtrele
                  </Button>
                  {(filterStartDate || filterEndDate) && (
                    <Button 
                      onClick={(e) => {
                        e.preventDefault();
                        handleClearDateFilter();
                      }}
                      variant="outline"
                      type="button"
                    >
                      Temizle
                    </Button>
                  )}
                </div>
              </div>
            </div>
            
            {selectedZoneInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu zone'da henüz ürün bulunmuyor
              </div>
            ) : (
              <div className="rounded-md border flex-1 overflow-hidden flex flex-col">
                <div className="overflow-auto flex-1">
                  <table className="w-full min-w-[800px]">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Ürün</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Kod</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Miktar</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Birim Fiyat</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Toplam Değer</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Son Sevkiyat Tarihi</th>
                        <th className="px-6 py-3 text-left text-sm font-medium text-gray-700 whitespace-nowrap">Gönderen Zone</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {selectedZoneInventory.map((inventory) => (
                        <tr key={inventory.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4">
                            <div className="font-medium">{inventory.product?.name || 'Ürün Yok'}</div>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-500 whitespace-nowrap">
                            {inventory.product?.code || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <Badge variant="secondary">{inventory.quantity} adet</Badge>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            {(inventory.product?.unit_price || 0).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </td>
                          <td className="px-6 py-4 font-medium whitespace-nowrap">
                            {(inventory.quantity * (inventory.product?.unit_price || 0)).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {inventory.latest_transfer_date ? (
                              <span className="text-gray-700">
                                {new Date(inventory.latest_transfer_date).toLocaleDateString('tr-TR', {
                                  day: '2-digit',
                                  month: '2-digit',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-sm whitespace-nowrap">
                            {inventory.latest_transfer_from ? (
                              <Badge variant="outline">{inventory.latest_transfer_from}</Badge>
                            ) : (
                              <span className="text-gray-400">-</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Merkez Zone Inventory Dialog */}
      <Dialog open={isCenterInventoryDialogOpen} onOpenChange={setIsCenterInventoryDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-6xl w-full h-[90vh] max-h-[90vh] flex flex-col">
          <DialogHeader className="flex-shrink-0">
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Nihai Stoklar Merkez
            </DialogTitle>
            <DialogDescription>
              Tüm üretilen ürünler merkez depoda - İlgi zone'a sevk edilecek
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
            <div className="flex items-center gap-4 p-4 bg-blue-50 rounded-lg flex-shrink-0">
              <Building2 className="h-8 w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <h3 className="font-semibold text-lg">Merkez Depo</h3>
                <p className="text-sm text-gray-600">
                  Tüm üretilen ürünler burada toplanır ve ilgi zone'lara sevk edilir
                </p>
              </div>
            </div>
            
            {centerInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground flex-1 flex items-center justify-center">
                Merkez depoda henüz ürün bulunmuyor
              </div>
            ) : (
              <div className="rounded-md border flex-1 overflow-hidden flex flex-col">
                <div className="overflow-x-auto overflow-y-auto flex-1">
                  <table className="w-full">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">Ürün</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">Kod</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">Miktar</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">Birim Fiyat</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">Toplam Değer</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500 whitespace-nowrap">İşlemler</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white">
                      {centerInventory.map((inventory) => (
                        <tr key={inventory.id} className="hover:bg-gray-50">
                          <td className="px-4 py-3">
                            <div className="font-medium truncate max-w-[200px]" title={inventory.product?.name || 'Ürün Yok'}>
                              {inventory.product?.name || 'Ürün Yok'}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500 whitespace-nowrap">
                            {inventory.product?.code || 'N/A'}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Badge variant="secondary">{inventory.quantity} adet</Badge>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {(inventory.product?.unit_price || 0).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </td>
                          <td className="px-4 py-3 font-medium whitespace-nowrap">
                            {(inventory.quantity * (inventory.product?.unit_price || 0)).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleTransfer(inventory.product_id || inventory.material_id, true)}
                            >
                              <ArrowRightLeft className="h-4 w-4 mr-1" />
                              Transfer
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Transfer Dialog - Controlled by isTransferDialogOpen */}
      <ZoneTransferDialog
        zones={zones}
        selectedZoneId={selectedZoneId}
        isOpen={isTransferDialogOpen}
        onOpenChange={setIsTransferDialogOpen}
        onTransferComplete={() => {
          fetchZones();
          fetchCenterInventory();
          setIsTransferDialogOpen(false);
          setSelectedZoneId('');
          setSelectedProductIdForTransfer('');
        }}
      >
        <div style={{ display: 'none' }} />
      </ZoneTransferDialog>

    </div>
  );
}
