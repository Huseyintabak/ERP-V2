'use client';

import { useState, useEffect } from 'react';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  PackagePlus,
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Box,
  MapPin,
  Trash2,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { scanSuccess, scanError, transferSuccess } from '@/lib/utils/feedback';

interface ProductInfo {
  id: string;
  code: string;
  name: string;
  barcode: string;
  quantity: number;
  unit?: string;
  critical_level: number;
  material_type: 'raw' | 'semi' | 'finished';
  material_type_label: string;
}

interface Zone {
  id: string;
  name: string;
  zone_type: string;
}

interface ScanResult {
  found: boolean;
  product?: ProductInfo;
  barcode: string;
  message?: string;
}

interface ScannedProduct {
  product: ProductInfo;
  barcode: string;
  quantity: number;
  targetZone: string;
}

export default function StokGirisPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(true);
  const [zones, setZones] = useState<Zone[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);

  // Continuous scan mode - always active for stock entry
  const [scannedProducts, setScannedProducts] = useState<ScannedProduct[]>([]);
  const [globalTargetZone, setGlobalTargetZone] = useState<string>('');

  useEffect(() => {
    fetchZones();
  }, []);

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/warehouse/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleScan = async (barcode: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);

      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          scanError();
          toast.error(data.message || 'Barkod bulunamadı');
          return;
        }
        throw new Error('Barkod sorgulanamadı');
      }

      const data: ScanResult = await response.json();

      if (data.found && data.product) {
        // Check if already scanned
        const alreadyScanned = scannedProducts.find(
          (sp) => sp.product.id === data.product!.id
        );

        if (alreadyScanned) {
          // Increment quantity
          setScannedProducts((prev) =>
            prev.map((sp) =>
              sp.product.id === data.product!.id
                ? { ...sp, quantity: sp.quantity + 1 }
                : sp
            )
          );
          scanSuccess();
          toast.success(`${data.product.name} miktarı: ${alreadyScanned.quantity + 1}`);
        } else {
          // Add new product
          const newProduct: ScannedProduct = {
            product: data.product,
            barcode,
            quantity: 1,
            targetZone: globalTargetZone,
          };

          setScannedProducts((prev) => [...prev, newProduct]);
          scanSuccess();
          toast.success(`${data.product.name} listeye eklendi`);
        }
      } else {
        scanError();
        toast.error('Ürün bulunamadı');
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      scanError();
      toast.error('Barkod tarama hatası');
    } finally {
      setIsLoading(false);
    }
  };

  const removeScannedProduct = (index: number) => {
    setScannedProducts((prev) => prev.filter((_, i) => i !== index));
    toast.info('Ürün listeden kaldırıldı');
  };

  const updateProductQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setScannedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, quantity } : p))
    );
  };

  const updateProductZone = (index: number, zoneId: string) => {
    setScannedProducts((prev) =>
      prev.map((p, i) => (i === index ? { ...p, targetZone: zoneId } : p))
    );
  };

  const handleBatchStockEntry = async () => {
    if (scannedProducts.length === 0) {
      toast.error('Taranmış ürün yok');
      return;
    }

    // Validate all products have zones
    const productsWithoutZone = scannedProducts.filter(sp => !sp.targetZone);
    if (productsWithoutZone.length > 0 && !globalTargetZone) {
      toast.error('Tüm ürünler için zone seçmelisiniz');
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const sp of scannedProducts) {
        const targetZone = sp.targetZone || globalTargetZone;

        if (!targetZone) {
          failCount++;
          continue;
        }

        try {
          const response = await fetch('/api/warehouse/stock-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: sp.product.id,
              zoneId: targetZone,
              quantity: sp.quantity,
              material_type: sp.product.material_type,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
          }
        } catch (error) {
          failCount++;
        }
      }

      if (successCount > 0) {
        transferSuccess();
        toast.success(`${successCount} ürün stoğa eklendi! 🎉`);
      }

      if (failCount > 0) {
        toast.error(`${failCount} ürün eklenemedi`);
      }

      // Clear list if all successful
      if (failCount === 0) {
        setScannedProducts([]);
        setGlobalTargetZone('');
      }
    } catch (error) {
      console.error('Batch stock entry error:', error);
      scanError();
      toast.error('Stok giriş hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setScannedProducts([]);
    setGlobalTargetZone('');
    toast.info('Liste temizlendi');
  };

  const typeMap: Record<string, { label: string; color: string }> = {
    raw: { label: 'Hammadde', color: 'bg-blue-100 text-blue-700' },
    semi: { label: 'Yarı Mamul', color: 'bg-purple-100 text-purple-700' },
    finished: { label: 'Mamul', color: 'bg-green-100 text-green-700' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Stok Giriş</h1>
            <p className="text-green-100 text-xs mt-0.5">
              {scannedProducts.length} ürün tarandı
            </p>
          </div>
          <Badge variant="secondary" className="bg-white text-green-600">
            <Camera className="h-3 w-3 mr-1" />
            Sürekli
          </Badge>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Card */}
        <Card className="border-2 border-green-300 shadow-lg bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                <PackagePlus className="h-5 w-5 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-900">Sürekli Okuma Modu</h3>
                <p className="text-sm text-green-700 mt-1">
                  Birden fazla ürün tarayın. Her tarama stoğa eklenecek.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Scanner */}
        {showScanner && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-green-600" />
                Ürün Taramaya Devam Edin
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <BarcodeScanner onScan={handleScan} />
            </CardContent>
          </Card>
        )}

        {/* Scanned Products List */}
        {scannedProducts.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Box className="h-5 w-5 text-blue-600" />
                  Taranmış Ürünler
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {scannedProducts.length} ürün
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Temizle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {scannedProducts.map((sp, index) => (
                <div
                  key={index}
                  className="p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 space-y-3"
                >
                  {/* Product Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{sp.product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {sp.product.code}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            typeMap[sp.product.material_type]?.color || 'bg-gray-100'
                          }`}
                        >
                          {sp.product.material_type_label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeScannedProduct(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-600 w-16">Miktar:</Label>
                    <Input
                      type="number"
                      value={sp.quantity}
                      onChange={(e) =>
                        updateProductQuantity(index, parseInt(e.target.value) || 1)
                      }
                      className="h-9 w-24 text-sm"
                      min="1"
                    />
                    <span className="text-xs text-gray-500">
                      {sp.product.unit || 'adet'}
                    </span>
                  </div>

                  {/* Zone Selection */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-600 w-16">Zone:</Label>
                    <Select
                      value={sp.targetZone}
                      onValueChange={(value) => updateProductZone(index, value)}
                    >
                      <SelectTrigger className="h-9 text-sm flex-1">
                        <SelectValue placeholder="Zone seç" />
                      </SelectTrigger>
                      <SelectContent>
                        {zones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            <div className="flex items-center gap-2">
                              <MapPin className="h-3 w-3 text-gray-400" />
                              {zone.name}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Global Zone Selection & Submit */}
        {scannedProducts.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Stok Giriş İşlemi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Global Target Zone (Optional) */}
              <div className="space-y-2">
                <Label className="text-sm font-medium flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-500" />
                  Varsayılan Zone (Opsiyonel)
                </Label>
                <Select value={globalTargetZone} onValueChange={setGlobalTargetZone}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Tüm ürünler için zone seçin (opsiyonel)" />
                  </SelectTrigger>
                  <SelectContent>
                    {zones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">
                  Seçilirse, zone'u olmayan tüm ürünler bu zone'a eklenecek
                </p>
              </div>

              {/* Info */}
              {scannedProducts.some(sp => !sp.targetZone) && !globalTargetZone && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                  <AlertCircle className="h-4 w-4 text-amber-600 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-amber-700">
                    Bazı ürünlerin zone'u seçilmemiş. Varsayılan zone seçin veya her ürün için ayrı zone belirleyin.
                  </p>
                </div>
              )}

              {/* Submit Button */}
              <Button
                onClick={handleBatchStockEntry}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-base font-semibold"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-5 w-5 mr-2" />
                    {scannedProducts.length} Ürünü Stoğa Ekle
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {scannedProducts.length === 0 && !isLoading && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackagePlus className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ürün Taramaya Başlayın
              </h3>
              <p className="text-sm text-gray-600">
                Kamera ile barkod okutarak stok girişi yapabilirsiniz
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
