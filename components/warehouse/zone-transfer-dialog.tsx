'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
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
import { SimpleSearchableSelect, type SearchableSelectOption } from '@/components/ui/simple-searchable-select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowRightLeft, Package, AlertTriangle, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

interface WarehouseZone {
  id: string;
  name: string;
  zone_type: 'center' | 'customer' | 'general';
  customer?: {
    id: string;
    name: string;
    email: string;
  };
}

interface FinishedProduct {
  id: string;
  name: string;
  code: string;
  unit_price: number;
}

interface ZoneInventory {
  id: string;
  zone_id: string;
  product_id: string;
  quantity: number;
  product: FinishedProduct;
}

interface TransferItem {
  productId: string;
  productName: string;
  productCode: string;
  quantity: number;
  availableQuantity: number;
}

interface ZoneTransferDialogProps {
  zones: WarehouseZone[];
  selectedZoneId?: string;
  onTransferComplete?: () => void;
  children?: React.ReactNode;
}

export function ZoneTransferDialog({ 
  zones, 
  selectedZoneId,
  onTransferComplete,
  children 
}: ZoneTransferDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Form state
  const [fromZoneId, setFromZoneId] = useState(selectedZoneId || '');
  const [toZoneId, setToZoneId] = useState('');
  const [productId, setProductId] = useState('');
  const [quantity, setQuantity] = useState('');
  
  // Multi-product state
  const [transferItems, setTransferItems] = useState<TransferItem[]>([]);
  const [isMultiProductMode, setIsMultiProductMode] = useState(false);
  
  // Data state
  const [sourceInventory, setSourceInventory] = useState<ZoneInventory[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [availableQuantity, setAvailableQuantity] = useState(0);

  // SearchableSelect için product options'ı hazırla
  const productOptions: SearchableSelectOption[] = sourceInventory.map((inventory, index) => ({
    value: inventory.product_id,
    label: inventory.product.name,
    description: inventory.product.code,
    badge: `${inventory.quantity} adet`,
    key: `${inventory.product_id}-${index}`, // Unique key için index ekle
  }));

  // Load source zone inventory when fromZoneId changes
  useEffect(() => {
    if (fromZoneId) {
      fetchZoneInventory(fromZoneId);
    } else {
      setSourceInventory([]);
      setSelectedProduct(null);
      setAvailableQuantity(0);
    }
  }, [fromZoneId]);

  // Update available quantity when product changes
  useEffect(() => {
    if (productId && sourceInventory.length > 0) {
      const inventory = sourceInventory.find(inv => inv.product_id === productId);
      if (inventory) {
        setSelectedProduct(inventory.product);
        setAvailableQuantity(inventory.quantity);
      } else {
        setSelectedProduct(null);
        setAvailableQuantity(0);
      }
    } else {
      setSelectedProduct(null);
      setAvailableQuantity(0);
    }
  }, [productId, sourceInventory]);

  const fetchZoneInventory = async (zoneId: string) => {
    try {
      const response = await fetch(`/api/warehouse/zones/${zoneId}/inventory`);
      if (!response.ok) throw new Error('Failed to fetch inventory');
      
      const result = await response.json();
      setSourceInventory(result.data || []);
    } catch (error) {
      logger.error('Error fetching zone inventory:', error);
      toast.error('Stok bilgileri yüklenirken hata oluştu');
    }
  };

  const addProductToTransfer = () => {
    if (!productId || !quantity) {
      toast.error('Ürün ve miktar seçin');
      return;
    }

    const transferQuantity = parseInt(quantity);
    if (isNaN(transferQuantity) || transferQuantity <= 0) {
      toast.error('Geçerli bir miktar girin');
      return;
    }

    if (transferQuantity > availableQuantity) {
      toast.error('Yetersiz stok');
      return;
    }

    // Check if product already exists in transfer list
    const existingItem = transferItems.find(item => item.productId === productId);
    if (existingItem) {
      toast.error('Bu ürün zaten transfer listesinde');
      return;
    }

    const newItem: TransferItem = {
      productId,
      productName: selectedProduct?.name || '',
      productCode: selectedProduct?.code || '',
      quantity: transferQuantity,
      availableQuantity
    };

    setTransferItems([...transferItems, newItem]);
    
    // Reset product selection
    setProductId('');
    setQuantity('');
    setSelectedProduct(null);
    setAvailableQuantity(0);
  };

  const removeProductFromTransfer = (productId: string) => {
    setTransferItems(transferItems.filter(item => item.productId !== productId));
  };

  const handleTransfer = async () => {
    if (!fromZoneId || !toZoneId) {
      toast.error('Kaynak ve hedef zone seçin');
      return;
    }

    if (isMultiProductMode) {
      if (transferItems.length === 0) {
        toast.error('En az bir ürün ekleyin');
        return;
      }

      setIsLoading(true);
      
      try {
        const response = await fetch('/api/warehouse/transfer-multi', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromZoneId,
            toZoneId,
            transferItems: transferItems.map(item => ({
              productId: item.productId,
              quantity: item.quantity
            }))
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Sevk işlemi başarıyla tamamlandı!', {
            description: `${transferItems.length} ürün sevk edildi.`,
          });
          
          // Reset form
          resetForm();
          setIsOpen(false);
          
          onTransferComplete?.();
        } else {
          toast.error('Sevk işlemi başarısız', {
            description: data.error || 'Bilinmeyen bir hata oluştu.',
          });
        }
      } catch (error) {
        logger.error('Sevk error:', error);
        toast.error('Bağlantı hatası', {
          description: 'Sunucuya bağlanılamadı.',
        });
      } finally {
        setIsLoading(false);
      }
    } else {
      // Single product transfer (existing logic)
      if (!productId || !quantity) {
        toast.error('Tüm alanları doldurun');
        return;
      }

      const transferQuantity = parseInt(quantity);
      if (isNaN(transferQuantity) || transferQuantity <= 0) {
        toast.error('Geçerli bir miktar girin');
        return;
      }

      if (transferQuantity > availableQuantity) {
        toast.error('Yetersiz stok');
        return;
      }

      setIsLoading(true);
      
      try {
        const response = await fetch('/api/warehouse/transfer', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            fromZoneId,
            toZoneId,
            productId,
            quantity: transferQuantity
          }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
          toast.success('Sevk işlemi başarıyla tamamlandı!', {
            description: `${selectedProduct?.name} - ${transferQuantity} adet sevk edildi.`,
          });
          
          // Reset form
          resetForm();
          setIsOpen(false);
          
          onTransferComplete?.();
        } else {
          toast.error('Sevk işlemi başarısız', {
            description: data.error || 'Bilinmeyen bir hata oluştu.',
          });
        }
      } catch (error) {
        logger.error('Sevk error:', error);
        toast.error('Bağlantı hatası', {
          description: 'Sunucuya bağlanılamadı.',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const getZoneName = (zoneId: string) => {
    const zone = zones.find(z => z.id === zoneId);
    return zone?.name || 'Bilinmeyen Zone';
  };

  const resetForm = () => {
    setFromZoneId(selectedZoneId || '');
    setToZoneId('');
    setProductId('');
    setQuantity('');
    setSourceInventory([]);
    setSelectedProduct(null);
    setAvailableQuantity(0);
    setTransferItems([]);
    setIsMultiProductMode(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      setIsOpen(open);
      if (!open) resetForm();
    }}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" size="sm">
            <ArrowRightLeft className="h-4 w-4 mr-2" />
            Sevk Et
          </Button>
        )}
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRightLeft className="h-5 w-5" />
            Sevk Et
          </DialogTitle>
          <DialogDescription>
            Ürünleri bir zone'dan diğerine sevk edin
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mode Toggle */}
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

          {/* Transfer Form */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fromZone">Kaynak Zone</Label>
              <Select value={fromZoneId} onValueChange={setFromZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Kaynak zone seçin" />
                </SelectTrigger>
                <SelectContent>
                  {zones.map((zone) => (
                    <SelectItem key={zone.id} value={zone.id}>
                      <div className="flex items-center gap-2">
                        <span>{zone.name}</span>
                        <Badge variant="outline" className="text-xs">
                          {zone.zone_type === 'center' ? 'Merkez' : 
                           zone.zone_type === 'customer' ? 'Müşteri' : 'Genel'}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="toZone">Hedef Zone</Label>
              <Select value={toZoneId} onValueChange={setToZoneId}>
                <SelectTrigger>
                  <SelectValue placeholder="Hedef zone seçin" />
                </SelectTrigger>
                <SelectContent>
                  {zones
                    .filter(zone => zone.id !== fromZoneId)
                    .map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        <div className="flex items-center gap-2">
                          <span>{zone.name}</span>
                          <Badge variant="outline" className="text-xs">
                            {zone.zone_type === 'center' ? 'Merkez' : 
                             zone.zone_type === 'customer' ? 'Müşteri' : 'Genel'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Product Selection */}
          {fromZoneId && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="product">Ürün</Label>
                <SimpleSearchableSelect
                  options={productOptions}
                  value={productId}
                  onValueChange={setProductId}
                  placeholder="Transfer edilecek ürünü seçin"
                  searchPlaceholder="Ürün adı veya kodu ile ara..."
                  emptyText="Bu zonda ürün bulunamadı"
                  disabled={isLoading}
                  allowClear
                  maxHeight="300px"
                />
              </div>

              {/* Quantity */}
              {productId && (
                <div className="space-y-2">
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
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
              )}

              {/* Add Product Button (Multi-product mode) */}
              {isMultiProductMode && productId && quantity && (
                <Button
                  type="button"
                  onClick={addProductToTransfer}
                  disabled={isLoading}
                  className="w-full"
                >
                  <Package className="h-4 w-4 mr-2" />
                  Ürün Ekle
                </Button>
              )}
            </div>
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
          {fromZoneId && toZoneId && (
            (isMultiProductMode ? transferItems.length > 0 : productId && quantity)
          ) && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Transfer Özeti</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-500">Kaynak Zone</Label>
                    <p className="font-semibold">{getZoneName(fromZoneId)}</p>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-sm font-medium text-gray-500">Hedef Zone</Label>
                    <p className="font-semibold">{getZoneName(toZoneId)}</p>
                  </div>
                  {isMultiProductMode ? (
                    <>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Ürünler</Label>
                        <div className="space-y-1">
                          {transferItems.map((item) => (
                            <div key={item.productId} className="flex justify-between text-sm">
                              <span>{item.productName} ({item.productCode})</span>
                              <span className="font-medium">{item.quantity} adet</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="space-y-1 col-span-2">
                        <Label className="text-sm font-medium text-gray-500">Toplam Ürün</Label>
                        <p className="font-semibold">{transferItems.length} ürün</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-500">Ürün</Label>
                        <p className="font-semibold">{selectedProduct?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-sm font-medium text-gray-500">Miktar</Label>
                        <p className="font-semibold">{quantity} adet</p>
                      </div>
                    </>
                  )}
                </div>
                
                <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
                  <div className="text-sm">
                    <p className="font-medium text-amber-800">Dikkat!</p>
                    <p className="text-amber-700 mt-1">
                      Bu işlem geri alınamaz. Transfer işlemi kaynak zone'dan ürünleri çıkaracak 
                      ve hedef zone'a ekleyecektir.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isLoading}>
            İptal
          </Button>
          <Button
            onClick={handleTransfer}
            disabled={
              isLoading || 
              !fromZoneId || 
              !toZoneId || 
              (isMultiProductMode ? transferItems.length === 0 : (!productId || !quantity))
            }
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sevk Ediliyor...
              </>
            ) : (
              <>
                <ArrowRightLeft className="h-4 w-4 mr-2" />
                Sevk Et
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
