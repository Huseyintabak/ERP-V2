'use client';

import { useState, useEffect } from 'react';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Package,
  ArrowLeft,
  Camera,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Layers,
  TrendingUp,
  TrendingDown,
  Clock,
  Box,
  BarChart3,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { scanSuccess, scanError } from '@/lib/utils/feedback';

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

interface Movement {
  movement_type: string;
  quantity: number;
  created_at: string;
  description: string;
}

interface ZoneInventory {
  quantity: number;
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

interface ScanResult {
  found: boolean;
  product?: ProductInfo;
  recentMovements?: Movement[];
  zoneInventory?: ZoneInventory[];
  barcode: string;
  message?: string;
}

export default function MobileProductSearchPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  const handleScan = async (barcode: string) => {
    setIsLoading(true);
    setScanResult(null);

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

  const getMovementIcon = (type: string) => {
    return type === 'giris' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getMovementTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      giris: 'Giriş',
      cikis: 'Çıkış',
      transfer: 'Transfer',
    };
    return labels[type] || type;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return 'Az önce';
    if (diffMins < 60) return `${diffMins} dk önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;

    return date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'short',
      year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
    });
  };

  const typeMap: Record<string, { label: string; color: string }> = {
    raw: { label: 'Hammadde', color: 'bg-blue-100 text-blue-700' },
    semi: { label: 'Yarı Mamul', color: 'bg-purple-100 text-purple-700' },
    finished: { label: 'Mamul', color: 'bg-green-100 text-green-700' },
  };

  const totalZoneInventory = scanResult?.zoneInventory?.reduce((sum, zi) => sum + zi.quantity, 0) || 0;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-500 to-cyan-600 text-white p-4 sticky top-0 z-10 shadow-lg">
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
            <h1 className="text-xl font-bold">Ürün Ara</h1>
            <p className="text-cyan-100 text-xs mt-0.5">
              Barkod okutarak ürün bilgilerini görüntüleyin
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Scanner Section */}
        {showScanner && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-cyan-50 to-cyan-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-cyan-600" />
                Barkod Tara
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <BarcodeScanner onScan={handleScan} />
            </CardContent>
          </Card>
        )}

        {/* Product Info */}
        {scanResult?.found && scanResult.product && (
          <>
            {/* Main Product Card */}
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg flex items-center gap-2 mb-2">
                      <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
                      <span className="truncate">{scanResult.product.name}</span>
                    </CardTitle>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        <Box className="h-3 w-3 mr-1" />
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
              <CardContent className="p-4 space-y-4">
                {/* Stock Summary */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <BarChart3 className="h-4 w-4 text-blue-600" />
                      <span className="text-xs text-gray-600 font-medium">Toplam Stok</span>
                    </div>
                    <p className="text-2xl font-bold text-blue-700">
                      {scanResult.product.quantity}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {scanResult.product.unit || 'adet'}
                    </p>
                  </div>
                  <div className="p-3 bg-gradient-to-br from-amber-50 to-amber-100 rounded-lg border border-amber-200">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertCircle className="h-4 w-4 text-amber-600" />
                      <span className="text-xs text-gray-600 font-medium">Kritik Seviye</span>
                    </div>
                    <p className="text-2xl font-bold text-amber-700">
                      {scanResult.product.critical_level}
                    </p>
                    <p className="text-xs text-gray-600 mt-1">
                      {scanResult.product.unit || 'adet'}
                    </p>
                  </div>
                </div>

                {/* Barcode */}
                <div className="p-3 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 font-medium">Barkod</span>
                    <code className="text-sm font-mono bg-white px-2 py-1 rounded border">
                      {scanResult.product.barcode}
                    </code>
                  </div>
                </div>

                <Button
                  onClick={handleNewScan}
                  variant="outline"
                  className="w-full"
                  size="lg"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Yeni Arama
                </Button>
              </CardContent>
            </Card>

            {/* Zone Inventory */}
            {scanResult.zoneInventory && scanResult.zoneInventory.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-purple-50 to-purple-100 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Layers className="h-5 w-5 text-purple-600" />
                    Zone Dağılımı
                  </CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Toplam {totalZoneInventory} {scanResult.product.unit || 'adet'} / {scanResult.zoneInventory.length} zone
                  </p>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-2">
                    {scanResult.zoneInventory.map((zi, idx) => (
                      <div
                        key={idx}
                        className="flex items-center justify-between p-3 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 hover:shadow-md transition-shadow"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center flex-shrink-0">
                            <MapPin className="h-5 w-5 text-purple-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-gray-900 truncate">{zi.zone.name}</p>
                            <p className="text-xs text-gray-500 capitalize">{zi.zone.zone_type}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end flex-shrink-0 ml-2">
                          <Badge variant="secondary" className="text-sm font-bold">
                            {zi.quantity}
                          </Badge>
                          <span className="text-xs text-gray-500 mt-0.5">
                            {scanResult.product.unit || 'adet'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Movements */}
            {scanResult.recentMovements && scanResult.recentMovements.length > 0 && (
              <Card className="border-0 shadow-lg">
                <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Clock className="h-5 w-5 text-green-600" />
                    Son Hareketler
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  {scanResult.recentMovements.map((movement, idx) => (
                    <div
                      key={idx}
                      className={`p-4 flex items-start gap-3 ${
                        idx !== scanResult.recentMovements!.length - 1
                          ? 'border-b border-gray-100'
                          : ''
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        movement.movement_type === 'giris'
                          ? 'bg-green-100'
                          : movement.movement_type === 'cikis'
                          ? 'bg-red-100'
                          : 'bg-blue-100'
                      }`}>
                        {getMovementIcon(movement.movement_type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <p className="font-semibold text-gray-900">
                            {getMovementTypeLabel(movement.movement_type)}
                          </p>
                          <Badge
                            variant="outline"
                            className={`text-xs flex-shrink-0 ${
                              movement.movement_type === 'giris'
                                ? 'border-green-500 text-green-700'
                                : movement.movement_type === 'cikis'
                                ? 'border-red-500 text-red-700'
                                : 'border-blue-500 text-blue-700'
                            }`}
                          >
                            {movement.quantity > 0 ? '+' : ''}{movement.quantity} {scanResult.product.unit || 'adet'}
                          </Badge>
                        </div>
                        {movement.description && (
                          <p className="text-sm text-gray-600 mb-1 line-clamp-2">
                            {movement.description}
                          </p>
                        )}
                        <p className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDate(movement.created_at)}
                        </p>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Empty States */}
            {(!scanResult.zoneInventory || scanResult.zoneInventory.length === 0) && (
              <Card className="border-0 shadow-lg border-dashed">
                <CardContent className="p-6 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-3">
                    <MapPin className="h-8 w-8 text-gray-400" />
                  </div>
                  <p className="text-sm text-gray-600">
                    Bu ürün henüz hiçbir zone'a atanmamış
                  </p>
                </CardContent>
              </Card>
            )}
          </>
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
              <p className="text-sm text-gray-600 mb-1">
                {scanResult.message || 'Bu barkoda ait ürün bulunamadı'}
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Barkod: <code className="bg-gray-100 px-2 py-0.5 rounded">{scanResult.barcode}</code>
              </p>
              <Button onClick={handleNewScan} className="w-full" size="lg">
                <Camera className="h-4 w-4 mr-2" />
                Tekrar Dene
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Info Card */}
        {!scanResult && !showScanner && (
          <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-cyan-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900 text-sm mb-2">
                    Ürün Arama Nasıl Kullanılır?
                  </h3>
                  <ul className="text-xs text-blue-800 space-y-1">
                    <li>• Ürünün barkodunu kamera ile okutun</li>
                    <li>• Manuel olarak barkod numarasını girebilirsiniz</li>
                    <li>• Ürün detayları, stok durumu ve zone bilgileri görüntülenecektir</li>
                    <li>• Son hareketleri inceleyebilirsiniz</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
