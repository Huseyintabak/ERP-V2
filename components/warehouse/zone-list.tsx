'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SimpleSearchableSelect, type SearchableSelectOption } from '@/components/ui/simple-searchable-select';
import { 
  Building2, 
  Users, 
  Package, 
  ArrowRightLeft,
  Eye,
  Plus
} from 'lucide-react';
import { toast } from 'sonner';

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

interface ZoneListProps {
  zones: WarehouseZone[];
  onViewInventory: (zoneId: string) => void;
  onTransfer: (zoneId: string) => void;
  onCreateZone?: () => void;
  allZones: WarehouseZone[];
  onTransferComplete: () => void;
}

export function ZoneList({ 
  zones, 
  onViewInventory, 
  onTransfer, 
  onCreateZone,
  allZones,
  onTransferComplete
}: ZoneListProps) {
  const [transferDialogOpen, setTransferDialogOpen] = useState(false);
  const [sourceZoneId, setSourceZoneId] = useState('');
  const [targetZoneId, setTargetZoneId] = useState('');
  const [selectedProductId, setSelectedProductId] = useState('');
  const [transferQuantity, setTransferQuantity] = useState('');
  const [zoneInventory, setZoneInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // SearchableSelect için product options'ı hazırla
  const productOptions: SearchableSelectOption[] = zoneInventory.map((inventory) => ({
    value: inventory.material_id || inventory.product_id,
    label: inventory.product?.name || inventory.product?.id || inventory.material_id,
    description: inventory.product?.code || inventory.product?.id,
    badge: `${inventory.quantity} adet`,
  }));

  const handleTransferClick = async (zoneId: string) => {
    setSourceZoneId(zoneId);
    setTargetZoneId('');
    setSelectedProductId('');
    setTransferQuantity('');
    setTransferDialogOpen(true);
    
    // Fetch zone inventory
    try {
      // Check if this is center zone
      const sourceZone = allZones.find(z => z.id === zoneId);
      const isCenterZone = sourceZone?.zone_type === 'center';
      
      const apiUrl = isCenterZone 
        ? '/api/warehouse/zones/center/inventory'
        : `/api/warehouse/zones/${zoneId}/inventory`;
        
      const response = await fetch(apiUrl);
      if (response.ok) {
        const data = await response.json();
        setZoneInventory(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching inventory:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    }
  };

  const handleTransferSubmit = async () => {
    if (!sourceZoneId || !targetZoneId || !selectedProductId || !transferQuantity) {
      toast.error('Tüm alanları doldurun');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromZoneId: sourceZoneId,
          toZoneId: targetZoneId,
          productId: selectedProductId,
          quantity: parseFloat(transferQuantity)
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Transfer failed');
      }

      toast.success('Transfer başarıyla tamamlandı');
      setTransferDialogOpen(false);
      onTransferComplete();
    } catch (error: any) {
      console.error('Transfer error:', error);
      toast.error(error.message || 'Transfer sırasında hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const getZoneIcon = (zoneType: string) => {
    switch (zoneType) {
      case 'center':
        return <Building2 className="h-4 w-4" />;
      case 'customer':
        return <Users className="h-4 w-4" />;
      default:
        return <Package className="h-4 w-4" />;
    }
  };

  const getZoneTypeBadge = (zoneType: string) => {
    switch (zoneType) {
      case 'center':
        return <Badge variant="default">Merkez Depo</Badge>;
      case 'customer':
        return <Badge variant="secondary">Müşteri Zone</Badge>;
      case 'general':
        return <Badge variant="outline">Genel Zone</Badge>;
      default:
        return <Badge variant="outline">{zoneType}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Building2 className="h-5 w-5" />
          Depo Zone'ları
        </CardTitle>
        {onCreateZone && (
          <Button onClick={onCreateZone} size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Yeni Zone
          </Button>
        )}
      </CardHeader>
      <CardContent>
        {zones.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Henüz zone bulunmuyor
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Zone Adı</TableHead>
                  <TableHead>Tür</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Ürün Sayısı</TableHead>
                  <TableHead>Oluşturulma</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {zones.map((zone) => (
                  <TableRow key={zone.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getZoneIcon(zone.zone_type)}
                        <span className="font-medium">{zone.name}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getZoneTypeBadge(zone.zone_type)}
                    </TableCell>
                    <TableCell>
                      {zone.customer ? (
                        <div>
                          <div className="font-medium">{zone.customer.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {zone.customer.email}
                          </div>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        <span>{zone.total_products || 0}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      {new Date(zone.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => onViewInventory(zone.id)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Stok
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleTransferClick(zone.id)}
                        >
                          <ArrowRightLeft className="h-4 w-4 mr-1" />
                          Transfer
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Transfer Dialog */}
      <Dialog open={transferDialogOpen} onOpenChange={setTransferDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Zone Transfer
            </DialogTitle>
            <DialogDescription>
              {sourceZoneId && allZones.find(z => z.id === sourceZoneId)?.name} → Hedef zone'a transfer yapın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Hedef Zone</Label>
              <Select value={targetZoneId} onValueChange={setTargetZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Hedef zone seçin" />
                </SelectTrigger>
                <SelectContent>
                  {allZones
                    .filter(z => z.id !== sourceZoneId)
                    .map(zone => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex items-center gap-2">
                          <span>{zone.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {zone.zone_type === 'center' ? 'Merkez' : zone.zone_type === 'customer' ? 'Müşteri' : 'Genel'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Ürün</Label>
                <SimpleSearchableSelect
                  options={productOptions}
                  value={selectedProductId}
                  onValueChange={setSelectedProductId}
                  placeholder="Transfer edilecek ürünü seçin"
                  searchPlaceholder="Ürün adı veya kodu ile ara..."
                  emptyText="Bu zonda ürün bulunamadı"
                  disabled={loading}
                  allowClear
                  maxHeight="300px"
                />
            </div>

            <div className="space-y-2">
              <Label>Miktar</Label>
              <Input
                type="number"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="Transfer miktarı"
                min="1"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleTransferSubmit} disabled={loading}>
              <ArrowRightLeft className="h-4 w-4 mr-2" />
              Transfer Et
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
