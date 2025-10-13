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
  
  // Dialog states
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isInventoryDialogOpen, setIsInventoryDialogOpen] = useState(false);
  const [selectedZoneId, setSelectedZoneId] = useState<string>('');
  const [selectedZoneInventory, setSelectedZoneInventory] = useState<ZoneInventory[]>([]);
  const [selectedZone, setSelectedZone] = useState<WarehouseZone | null>(null);
  
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
      const response = await fetch('/api/warehouse/zones', {
        headers: {
          'Content-Type': 'application/json',
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
      const response = await fetch('/api/customers', {
        headers: {
          'Content-Type': 'application/json',
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

  const fetchZoneInventory = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/warehouse/zones/${zoneId}/inventory`, {
        headers: {
          'Content-Type': 'application/json',
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
      setSelectedZoneInventory(result.data || []);
      setSelectedZone(result.zone);
    } catch (error) {
      console.error('Error fetching zone inventory:', error);
      toast.error('Stok bilgileri yüklenirken hata oluştu');
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
      const response = await fetch('/api/warehouse/zones', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
    fetchZoneInventory(zoneId);
  };

  const handleTransfer = (zoneId: string) => {
    // This will be handled by the ZoneTransferDialog
    setSelectedZoneId(zoneId);
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

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Merkez Zone</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.centerZones}</div>
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
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Zone Stok Detayları
            </DialogTitle>
            <DialogDescription>
              {selectedZone?.name} - Stok durumu
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            {selectedZone && (
              <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-lg">
                <Building2 className="h-8 w-8 text-blue-600" />
                <div>
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
            
            {selectedZoneInventory.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Bu zone'da henüz ürün bulunmuyor
              </div>
            ) : (
              <div className="rounded-md border">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Ürün</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Kod</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Miktar</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Birim Fiyat</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-gray-500">Toplam Değer</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200">
                      {selectedZoneInventory.map((inventory) => (
                        <tr key={inventory.id}>
                          <td className="px-4 py-3">
                            <div className="font-medium">{inventory.product?.name || 'Ürün Yok'}</div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">
                            {inventory.product?.code || 'N/A'}
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant="secondary">{inventory.quantity} adet</Badge>
                          </td>
                          <td className="px-4 py-3">
                            {(inventory.product?.unit_price || 0).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
                          </td>
                          <td className="px-4 py-3 font-medium">
                            {(inventory.quantity * (inventory.product?.unit_price || 0)).toLocaleString('tr-TR', {
                              style: 'currency',
                              currency: 'TRY'
                            })}
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
    </div>
  );
}
