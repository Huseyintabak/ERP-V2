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
  Plus,
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

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

interface TransferItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  availableQuantity: number;
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
  
  // Multi-product transfer states
  const [isMultiProductMode, setIsMultiProductMode] = useState(false);
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // SearchableSelect için product options'ı hazırla
  const productOptions: SearchableSelectOption[] = zoneInventory.map((inventory, index) => ({
    value: inventory.material_id || inventory.product_id,
    label: inventory.product?.name || inventory.product?.id || inventory.material_id,
    description: inventory.product?.code || inventory.product?.id,
    badge: `${inventory.quantity} adet`,
    key: `${inventory.material_id || inventory.product_id}-${index}`,
  }));

  const handleTransferClick = async (zoneId: string) => {
    setSourceZoneId(zoneId);
    setTargetZoneId('');
    setSelectedProductId('');
    setTransferQuantity('');
    setIsMultiProductMode(false);
    setTransferItems([]);
    setSelectedProduct(null);
    setAvailableQuantity(0);
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
      logger.error('Error fetching inventory:', error);
      toast.error('Ürünler yüklenirken hata oluştu');
    }
  };

  // Multi-product functions
  const addProductToTransfer = () => {
    if (!selectedProductId || !transferQuantity || !selectedProduct) return;
    
    const quantity = parseFloat(transferQuantity);
    if (quantity <= 0 || quantity > availableQuantity) {
      toast.error('Geçersiz miktar');
      return;
    }

    const existingItem = transferItems.find(item => item.productId === selectedProductId);
    if (existingItem) {
      toast.error('Bu ürün zaten listeye eklenmiş');
      return;
    }

    const newItem: TransferItem = {
      productId: selectedProductId,
      productName: selectedProduct.name,
      productCode: selectedProduct.code,
      quantity: quantity,
      availableQuantity: availableQuantity
    };

    setTransferItems([...transferItems, newItem]);
    setSelectedProductId('');
    setTransferQuantity('');
    setSelectedProduct(null);
    setAvailableQuantity(0);
  };

  const removeProductFromTransfer = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.productId !== productId));
  };

  const resetForm = () => {
    setSelectedProductId('');
    setTransferQuantity('');
    setTargetZoneId('');
    setTransferItems([]);
    setSelectedProduct(null);
    setAvailableQuantity(0);
    setIsMultiProductMode(false);
  };

  const handleTransferSubmit = async () => {
    if (!sourceZoneId || !targetZoneId) {
      toast.error('Kaynak ve hedef zone seçimi gerekli');
      return;
    }

    if (isMultiProductMode) {
      if (transferItems.length === 0) {
        toast.error('En az bir ürün seçin');
        return;
      }
    } else {
      if (!selectedProductId || !transferQuantity) {
        toast.error('Tüm alanları doldurun');
        return;
      }
    }

    try {
      setLoading(true);
      
      if (isMultiProductMode) {
        // Multi-product transfer
        const response = await fetch('/api/warehouse/transfer-multi', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fromZoneId: sourceZoneId,
            toZoneId: targetZoneId,
            transferItems: transferItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          })
        });

        if (!response.ok) {
          const error = await response.json();
          throw new Error(error.error || 'Multi-transfer failed');
        }

        const data = await response.json();
        if (data.success) {
          toast.success('Transfer başarıyla tamamlandı', {
            description: `${transferItems.length} ürün transfer edildi.`,
          });
        } else {
          toast.error('Transfer başarısız', {
            description: data.error || 'Bilinmeyen bir hata oluştu.',
          });
        }
      } else {
        // Single product transfer
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
      }
      
      setTransferDialogOpen(false);
      resetForm();
      onTransferComplete();
    } catch (error: any) {
      logger.error('Transfer error:', error);
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
      <Dialog open={transferDialogOpen} onOpenChange={(open) => {
        setTransferDialogOpen(open);
        if (!open) resetForm();
      }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowRightLeft className="h-5 w-5" />
              Zone Transfer
            </DialogTitle>
            <DialogDescription>
              {sourceZoneId && allZones.find(z => z.id === sourceZoneId)?.name} → Hedef zone'a transfer yapın
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Transfer Mode Toggle */}
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Label className="text-sm font-medium">Transfer Modu</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  type="button"
                  variant={!isMultiProductMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsMultiProductMode(false)}
                >
                  Tek Ürün
                </Button>
                <Button
                  type="button"
                  variant={isMultiProductMode ? "default" : "outline"}
                  size="sm"
                  onClick={() => setIsMultiProductMode(true)}
                >
                  Çoklu Ürün
                </Button>
              </div>
            </div>

            {/* Target Zone Selection */}
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

            {/* Product Selection */}
            <div className="space-y-2">
              <Label>Ürün</Label>
              <SimpleSearchableSelect
                options={productOptions}
                value={selectedProductId}
                onValueChange={(value) => {
                  setSelectedProductId(value);
                  const inventory = zoneInventory.find(inv => 
                    (inv.material_id || inv.product_id) === value
                  );
                  if (inventory) {
                    setSelectedProduct(inventory.product);
                    setAvailableQuantity(inventory.quantity);
                  }
                }}
                placeholder="Transfer edilecek ürünü seçin"
                searchPlaceholder="Ürün adı veya kodu ile ara..."
                emptyText="Bu zonda ürün bulunamadı"
                disabled={loading}
                allowClear
                maxHeight="300px"
              />
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label>Miktar</Label>
              <Input
                type="number"
                value={transferQuantity}
                onChange={(e) => setTransferQuantity(e.target.value)}
                placeholder="Transfer miktarı"
                min="1"
                max={availableQuantity}
              />
              {availableQuantity > 0 && (
                <p className="text-sm text-muted-foreground">
                  Mevcut stok: {availableQuantity} adet
                </p>
              )}
            </div>

            {/* Add Product Button (Multi-product mode) */}
            {isMultiProductMode && selectedProductId && transferQuantity && (
              <Button
                type="button"
                onClick={addProductToTransfer}
                disabled={loading}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Ürün Ekle
              </Button>
            )}

            {/* Transfer Items List (Multi-product mode) */}
            {isMultiProductMode && transferItems.length > 0 && (
              <div className="space-y-2">
                <Label>Transfer Listesi</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {transferItems.map((item) => (
                    <div key={item.productId} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.productName}</div>
                        <div className="text-sm text-gray-500">{item.productCode}</div>
                        <div className="text-sm text-gray-600">
                          {item.quantity} adet (Mevcut: {item.availableQuantity})
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeProductFromTransfer(item.productId)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Transfer Summary */}
            <div className="p-4 bg-blue-50 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Transfer Özeti</h4>
              {isMultiProductMode ? (
                <div>
                  <p className="text-sm text-blue-700">
                    {transferItems.length} ürün transfer edilecek
                  </p>
                  <p className="text-sm text-blue-600">
                    Toplam miktar: {transferItems.reduce((sum, item) => sum + item.quantity, 0)} adet
                  </p>
                </div>
              ) : (
                <div>
                  <p className="text-sm text-blue-700">
                    {selectedProduct?.name || 'Ürün seçilmedi'} - {transferQuantity || 0} adet
                  </p>
                </div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setTransferDialogOpen(false)}>
              İptal
            </Button>
            <Button 
              onClick={handleTransferSubmit} 
              disabled={
                loading || 
                !targetZoneId || 
                (isMultiProductMode ? transferItems.length === 0 : (!selectedProductId || !transferQuantity))
              }
              className="bg-blue-600 hover:bg-blue-700"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Transfer Ediliyor...
                </>
              ) : (
                <>
                  <ArrowRightLeft className="h-4 w-4 mr-2" />
                  Transfer Et
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
