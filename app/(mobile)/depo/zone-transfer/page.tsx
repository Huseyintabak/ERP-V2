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
  Package,
  ArrowRight,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera,
  ArrowLeft,
  Box,
  Layers,
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

interface ZoneInventory {
  quantity: number;
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

interface Zone {
  id: string;
  name: string;
  zone_type: string;
}

interface ScanResult {
  found: boolean;
  product?: ProductInfo;
  zoneInventory?: ZoneInventory[];
  barcode: string;
  message?: string;
}

export default function MobileZoneTransferPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  // Transfer states
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedSourceZone, setSelectedSourceZone] = useState<string>('');
  const [selectedTargetZone, setSelectedTargetZone] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);

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
    setScanResult(null);
    setSelectedSourceZone('');
    setSelectedTargetZone('');
    setTransferQuantity('');

    try {
      const response = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);

      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          scanError();
          toast.error(data.message || 'Barkod bulunamadı');
          setScanResult({
            found: false,
            barcode,
            message: data.message || 'Barkod bulunamadı',
          });
          return;
        }
        throw new Error('Barkod sorgulanamadı');
      }

      const data: ScanResult = await response.json();
      setScanResult(data);

      if (data.found) {
        scanSuccess();
        toast.success(`Ürün bulundu: ${data.product?.name}`);
        setShowScanner(false);

        // Auto-select first zone with inventory as source
        if (data.zoneInventory && data.zoneInventory.length > 0) {
          const firstZone = data.zoneInventory.find((z: ZoneInventory) => z.quantity > 0);
          if (firstZone) {
            setSelectedSourceZone(firstZone.zone.id);
          }
        }
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      scanError();
      toast.error('Barkod tarama hatası');
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewScan = () => {
    setScanResult(null);
    setShowScanner(true);
    setSelectedSourceZone('');
    setSelectedTargetZone('');
    setTransferQuantity('');
  };

  const handleTransfer = async () => {
    if (!scanResult?.product || !selectedSourceZone || !selectedTargetZone || !transferQuantity) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    const quantity = parseInt(transferQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Geçerli bir miktar girin');
      return;
    }

    // Check available quantity in source zone
    const sourceZoneInventory = scanResult.zoneInventory?.find(
      (zi) => zi.zone.id === selectedSourceZone
    );
    if (!sourceZoneInventory || sourceZoneInventory.quantity < quantity) {
      toast.error(
        `Yetersiz stok. Mevcut: ${sourceZoneInventory?.quantity || 0}`
      );
      return;
    }

    setIsTransferring(true);

    try {
      const response = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromZoneId: selectedSourceZone,
          toZoneId: selectedTargetZone,
          productId: scanResult.product.id,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transfer başarısız');
      }

      transferSuccess();
      toast.success('Transfer başarıyla tamamlandı! 🎉');

      // Refresh product data
      await handleScan(scanResult.product.barcode);

      // Reset transfer form
      setTransferQuantity('');
    } catch (error: any) {
      console.error('Transfer error:', error);
      scanError();
      toast.error(error.message || 'Transfer hatası');
    } finally {
      setIsTransferring(false);
    }
  };

  const getStockStatus = (quantity: number, criticalLevel: number) => {
    if (quantity === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Stokta Yok
        </Badge>
      );
    } else if (quantity <= criticalLevel) {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700">
          <AlertCircle className="h-3 w-3" />
          Kritik Seviye
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Stokta Var
        </Badge>
      );
    }
  };

  const getAvailableQuantity = () => {
    if (!selectedSourceZone || !scanResult?.zoneInventory) return 0;
    const sourceZone = scanResult.zoneInventory.find((zi) => zi.zone.id === selectedSourceZone);
    return sourceZone?.quantity || 0;
  };

  const sourceZones = scanResult?.zoneInventory?.filter((zi) => zi.quantity > 0) || [];
  const targetZones = zones.filter((z) => z.id !== selectedSourceZone);

  const typeMap: Record<string, { label: string; color: string }> = {
    raw: { label: 'Hammadde', color: 'bg-blue-100 text-blue-700' },
    semi: { label: 'Yarı Mamul', color: 'bg-purple-100 text-purple-700' },
    finished: { label: 'Mamul', color: 'bg-green-100 text-green-700' },
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-4 sticky top-0 z-10 shadow-lg">
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
            <h1 className="text-xl font-bold">Zone Transfer</h1>
            <p className="text-orange-100 text-xs mt-0.5">
              Ürün tarayın ve transfer yapın
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scanner Section */}
        {showScanner && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-orange-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-orange-600" />
                Barkod Tara
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <BarcodeScanner
                onScan={handleScan}
              />
            </CardContent>
          </Card>
        )}

        {/* Product Info */}
        {scanResult?.found && scanResult.product && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b pb-3">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Package className="h-5 w-5 text-blue-600" />
                    {scanResult.product.name}
                  </CardTitle>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline" className="text-xs">
                      {scanResult.product.code}
                    </Badge>
                    <Badge
                      className={`text-xs ${
                        typeMap[scanResult.product.material_type]?.color || 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {scanResult.product.material_type_label}
                    </Badge>
                  </div>
                </div>
                {getStockStatus(scanResult.product.quantity, scanResult.product.critical_level)}
              </div>
            </CardHeader>
            <CardContent className="p-4">
              <div className="space-y-3">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm text-gray-600">Toplam Stok</span>
                  <span className="text-lg font-bold text-blue-700">
                    {scanResult.product.quantity} {scanResult.product.unit || 'adet'}
                  </span>
                </div>

                {/* Zone Inventory */}
                {scanResult.zoneInventory && scanResult.zoneInventory.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-gray-500 font-medium">
                      <Layers className="h-3 w-3 inline mr-1" />
                      Zone Dağılımı
                    </Label>
                    <div className="space-y-2">
                      {scanResult.zoneInventory.map((zi, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center p-2 bg-gray-50 rounded-lg border border-gray-200"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium">{zi.zone.name}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs">
                            {zi.quantity} {scanResult.product.unit || 'adet'}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <Button
                  onClick={handleNewScan}
                  variant="outline"
                  className="w-full mt-2"
                  size="sm"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Yeni Tarama
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Transfer Form */}
        {scanResult?.found && scanResult.product && sourceZones.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-5 w-5 text-green-600" />
                Transfer İşlemi
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Source Zone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Kaynak Zone</Label>
                <Select value={selectedSourceZone} onValueChange={setSelectedSourceZone}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Kaynak zone seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {sourceZones.map((zi) => (
                      <SelectItem key={zi.zone.id} value={zi.zone.id}>
                        <div className="flex items-center justify-between gap-3 w-full">
                          <span>{zi.zone.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {zi.quantity} {scanResult.product?.unit || 'adet'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Target Zone */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">Hedef Zone</Label>
                <Select
                  value={selectedTargetZone}
                  onValueChange={setSelectedTargetZone}
                  disabled={!selectedSourceZone}
                >
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Hedef zone seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetZones.map((zone) => (
                      <SelectItem key={zone.id} value={zone.id}>
                        {zone.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Quantity */}
              <div className="space-y-2">
                <Label className="text-sm font-medium">
                  Miktar
                  {selectedSourceZone && (
                    <span className="text-xs text-gray-500 ml-2">
                      (Mevcut: {getAvailableQuantity()} {scanResult.product.unit || 'adet'})
                    </span>
                  )}
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={transferQuantity}
                    onChange={(e) => setTransferQuantity(e.target.value)}
                    placeholder="Transfer miktarı girin"
                    className="h-12 text-base"
                    min="1"
                    max={selectedSourceZone ? getAvailableQuantity() : undefined}
                    autoComplete="off"
                  />
                </div>
                {!selectedSourceZone && (
                  <p className="text-xs text-amber-600 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Önce kaynak zone seçmelisiniz
                  </p>
                )}
              </div>

              {/* Transfer Button */}
              <Button
                onClick={handleTransfer}
                disabled={
                  !selectedSourceZone ||
                  !selectedTargetZone ||
                  !transferQuantity ||
                  isTransferring
                }
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-base font-semibold"
                size="lg"
              >
                {isTransferring ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    Transfer Yapılıyor...
                  </>
                ) : (
                  <>
                    <ArrowRight className="h-5 w-5 mr-2" />
                    Transfer Yap
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Not Found */}
        {scanResult && !scanResult.found && (
          <Card className="border-0 shadow-lg border-red-200">
            <CardContent className="p-6 text-center">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="h-8 w-8 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Ürün Bulunamadı
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                {scanResult.message || 'Bu barkoda ait ürün bulunamadı'}
              </p>
              <Button onClick={handleNewScan} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Tekrar Dene
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
