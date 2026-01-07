'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  ClipboardList,
  Camera,
  CameraOff,
  ArrowLeft,
  Trash2,
  Save,
  AlertCircle,
  Package,
  TrendingUp,
  TrendingDown,
  Minus,
  Check,
} from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/barcode-scanner';
import { scanSuccess, scanError } from '@/lib/utils/scan-feedback';

interface Product {
  id: string;
  product_code: string;
  product_name: string;
  quantity: number;
  material_type: 'finished' | 'semi' | 'raw';
}

interface CountItem {
  id: string;
  product: Product;
  systemQuantity: number;
  actualQuantity: number;
  difference: number;
  counted: boolean;
}

export default function StokSayimPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [centerZoneId, setCenterZoneId] = useState<string>('');
  const [centerZoneName, setCenterZoneName] = useState<string>('Merkez Depo');

  // Count items
  const [countItems, setCountItems] = useState<CountItem[]>([]);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');

  useEffect(() => {
    fetchCenterZone();
  }, []);

  const fetchCenterZone = async () => {
    try {
      const response = await fetch('/api/warehouse/zones');
      if (response.ok) {
        const data = await response.json();
        const centerZone = data.data?.find((z: any) => z.zone_type === 'center');
        if (centerZone) {
          setCenterZoneId(centerZone.id);
          setCenterZoneName(centerZone.name);
        } else {
          toast.error('Merkez depo bulunamadı');
        }
      }
    } catch (error) {
      console.error('Error fetching center zone:', error);
    }
  };

  const handleScan = async (code: string) => {
    if (isProcessing) return;

    setIsProcessing(true);
    console.log('🔍 Scanned code:', code);

    try {
      // Fetch product by barcode
      const response = await fetch(`/api/stock/raw?search=${encodeURIComponent(code)}&limit=1`);

      if (!response.ok) {
        scanError();
        toast.error('Ürün bulunamadı');
        setIsProcessing(false);
        return;
      }

      const data = await response.json();
      const products = data.data || [];

      if (products.length === 0) {
        scanError();
        toast.error('Ürün bulunamadı');
        setIsProcessing(false);
        return;
      }

      const scannedProduct = products[0];

      // Check if already in list
      const existingItem = countItems.find(item => item.product.id === scannedProduct.id);

      if (existingItem) {
        scanSuccess();
        toast.info('Ürün zaten listede');
        setIsProcessing(false);
        return;
      }

      // Fetch current zone inventory
      let systemQuantity = 0;
      if (centerZoneId) {
        try {
          const invResponse = await fetch(
            `/api/warehouse/zones/${centerZoneId}/inventory?material_type=${scannedProduct.material_type}&material_id=${scannedProduct.id}`
          );
          if (invResponse.ok) {
            const invData = await invResponse.json();
            systemQuantity = invData.data?.quantity || 0;
          }
        } catch (error) {
          console.error('Error fetching inventory:', error);
        }
      }

      // Add to count list
      const newItem: CountItem = {
        id: scannedProduct.id,
        product: {
          id: scannedProduct.id,
          product_code: scannedProduct.product_code,
          product_name: scannedProduct.product_name,
          quantity: scannedProduct.quantity,
          material_type: scannedProduct.material_type,
        },
        systemQuantity,
        actualQuantity: 0,
        difference: -systemQuantity,
        counted: false,
      };

      setCountItems(prev => [newItem, ...prev]);
      scanSuccess();
      toast.success(`${scannedProduct.product_name} eklendi`);

    } catch (error) {
      console.error('Error processing scanned product:', error);
      scanError();
      toast.error('Ürün işlenirken hata oluştu');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartEdit = (item: CountItem) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.actualQuantity.toString());
  };

  const handleSaveQuantity = (itemId: string) => {
    const quantity = parseInt(editingQuantity) || 0;

    if (quantity < 0) {
      toast.error('Miktar negatif olamaz');
      return;
    }

    setCountItems(prev =>
      prev.map(item => {
        if (item.id === itemId) {
          const difference = quantity - item.systemQuantity;
          return {
            ...item,
            actualQuantity: quantity,
            difference,
            counted: true,
          };
        }
        return item;
      })
    );

    setEditingItemId(null);
    setEditingQuantity('');
    toast.success('Miktar kaydedildi');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleRemoveItem = (itemId: string) => {
    setCountItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Ürün listeden çıkarıldı');
  };

  const handleSubmitCount = async () => {
    if (countItems.length === 0) {
      toast.error('Lütfen en az bir ürün sayın');
      return;
    }

    const uncountedItems = countItems.filter(item => !item.counted);
    if (uncountedItems.length > 0) {
      toast.error(`${uncountedItems.length} ürün için sayım yapılmadı`);
      return;
    }

    if (!centerZoneId) {
      toast.error('Merkez depo bulunamadı');
      return;
    }

    setIsLoading(true);

    try {
      const countData = countItems.map(item => ({
        productId: item.product.id,
        materialType: item.product.material_type,
        systemQuantity: item.systemQuantity,
        actualQuantity: item.actualQuantity,
      }));

      const response = await fetch('/api/warehouse/stock-count', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          countItems: countData,
          zoneId: centerZoneId,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Stok sayımı başarısız');
      }

      toast.success(result.message || 'Stok sayımı tamamlandı');

      // Clear list and go back
      setCountItems([]);
      router.push('/depo/mobile-dashboard');

    } catch (error: any) {
      console.error('Error submitting stock count:', error);
      toast.error(error.message || 'Stok sayımı kaydedilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const totalDifference = countItems.reduce((sum, item) => sum + Math.abs(item.difference), 0);
  const countedItems = countItems.filter(item => item.counted).length;

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold flex items-center gap-2">
              <ClipboardList className="h-5 w-5" />
              Stok Sayım
            </h1>
            <p className="text-purple-100 text-xs mt-0.5">
              {centerZoneName} - {countItems.length} ürün
            </p>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Sayılan</p>
            <p className="text-lg font-bold">{countedItems}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Toplam</p>
            <p className="text-lg font-bold">{countItems.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Fark</p>
            <p className="text-lg font-bold">{totalDifference}</p>
          </div>
        </div>
      </div>

      {/* Scanner Section */}
      <div className="p-4">
        <Card className="border-2 border-purple-200 shadow-md">
          <CardContent className="p-4">
            {!showScanner ? (
              <Button
                onClick={() => setShowScanner(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                <Camera className="h-5 w-5 mr-2" />
                Kamera ile Tara
              </Button>
            ) : (
              <div className="space-y-3">
                <BarcodeScanner
                  onScan={handleScan}
                  isProcessing={isProcessing}
                />
                <Button
                  onClick={() => setShowScanner(false)}
                  variant="outline"
                  className="w-full"
                >
                  <CameraOff className="h-4 w-4 mr-2" />
                  Kamerayı Kapat
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Count List */}
      <div className="px-4 space-y-3">
        {countItems.length === 0 ? (
          <Card className="border-0 shadow-md">
            <CardContent className="p-8 text-center">
              <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-sm">
                Henüz ürün taranmadı
              </p>
              <p className="text-gray-400 text-xs mt-1">
                Kamera ile ürün barkodunu tarayın
              </p>
            </CardContent>
          </Card>
        ) : (
          countItems.map((item) => (
            <Card
              key={item.id}
              className={`border-0 shadow-md transition-all ${
                item.counted
                  ? 'bg-white'
                  : 'bg-amber-50 border-2 border-amber-200'
              }`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 text-sm truncate">
                      {item.product.product_name}
                    </h3>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {item.product.product_code}
                    </p>
                    <Badge
                      variant="outline"
                      className="mt-1 text-xs"
                    >
                      {item.product.material_type === 'finished'
                        ? 'Mamul'
                        : item.product.material_type === 'semi'
                        ? 'Yarı Mamul'
                        : 'Hammadde'}
                    </Badge>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveItem(item.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 flex-shrink-0 ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Quantity Info */}
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <div className="bg-gray-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-600">Sistem</p>
                    <p className="text-base font-bold text-gray-900">
                      {item.systemQuantity}
                    </p>
                  </div>
                  <div className="bg-blue-50 rounded-lg p-2 text-center">
                    <p className="text-xs text-blue-600">Sayım</p>
                    <p className="text-base font-bold text-blue-900">
                      {item.actualQuantity}
                    </p>
                  </div>
                  <div
                    className={`rounded-lg p-2 text-center ${
                      item.difference === 0
                        ? 'bg-gray-50'
                        : item.difference > 0
                        ? 'bg-green-50'
                        : 'bg-red-50'
                    }`}
                  >
                    <p
                      className={`text-xs ${
                        item.difference === 0
                          ? 'text-gray-600'
                          : item.difference > 0
                          ? 'text-green-600'
                          : 'text-red-600'
                      }`}
                    >
                      Fark
                    </p>
                    <p
                      className={`text-base font-bold flex items-center justify-center gap-1 ${
                        item.difference === 0
                          ? 'text-gray-900'
                          : item.difference > 0
                          ? 'text-green-900'
                          : 'text-red-900'
                      }`}
                    >
                      {item.difference === 0 ? (
                        <Minus className="h-3 w-3" />
                      ) : item.difference > 0 ? (
                        <TrendingUp className="h-3 w-3" />
                      ) : (
                        <TrendingDown className="h-3 w-3" />
                      )}
                      {Math.abs(item.difference)}
                    </p>
                  </div>
                </div>

                {/* Actual Quantity Input */}
                {editingItemId === item.id ? (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      value={editingQuantity}
                      onChange={(e) => setEditingQuantity(e.target.value)}
                      placeholder="Gerçek miktar"
                      className="text-center text-lg font-semibold"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleSaveQuantity(item.id)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                      >
                        <Check className="h-4 w-4 mr-1" />
                        Kaydet
                      </Button>
                      <Button
                        onClick={handleCancelEdit}
                        variant="outline"
                        className="flex-1"
                      >
                        İptal
                      </Button>
                    </div>
                  </div>
                ) : (
                  <Button
                    onClick={() => handleStartEdit(item)}
                    variant={item.counted ? 'outline' : 'default'}
                    className={`w-full ${
                      !item.counted
                        ? 'bg-amber-600 hover:bg-amber-700 text-white'
                        : ''
                    }`}
                  >
                    {item.counted ? 'Miktarı Düzenle' : 'Gerçek Miktarı Gir'}
                  </Button>
                )}

                {item.counted && (
                  <div className="mt-2 flex items-center justify-center gap-1 text-green-600 text-xs">
                    <Check className="h-3 w-3" />
                    Sayım tamamlandı
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Warning if uncounted items */}
      {countItems.length > 0 && countedItems < countItems.length && (
        <div className="px-4 mt-4">
          <Card className="border-2 border-amber-300 bg-amber-50">
            <CardContent className="p-3 flex items-start gap-2">
              <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  Sayım Tamamlanmadı
                </p>
                <p className="text-xs text-amber-700 mt-0.5">
                  {countItems.length - countedItems} ürün için gerçek miktar girilmedi
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Bottom Action Bar */}
      {countItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                Toplam {countItems.length} ürün, {countedItems} sayıldı
              </span>
              {totalDifference > 0 && (
                <Badge variant="outline" className="text-xs">
                  Toplam Fark: {totalDifference}
                </Badge>
              )}
            </div>
            <Button
              onClick={handleSubmitCount}
              disabled={isLoading || countedItems < countItems.length}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12 text-base"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5 mr-2" />
                  Sayımı Tamamla
                </>
              )}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
