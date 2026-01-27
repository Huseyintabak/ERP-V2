'use client';

import { useState, useEffect, useRef } from 'react';
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
  Pause,
  Play,
  Edit,
} from 'lucide-react';
import { toast } from 'sonner';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';

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
  scannedCount: number; // How many times scanned
  scanTimestamps: number[]; // Track each scan
}

type CountingState = 'idle' | 'scanning' | 'paused' | 'reviewing';

export default function StokSayimPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [centerZoneId, setCenterZoneId] = useState<string>('');
  const [centerZoneName, setCenterZoneName] = useState<string>('Merkez Depo');

  // Counting state
  const [countingState, setCountingState] = useState<CountingState>('idle');
  const [countItems, setCountItems] = useState<CountItem[]>([]);

  // Editing state
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editingQuantity, setEditingQuantity] = useState<string>('');

  // Cooldown state
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const cooldownTimerRef = useRef<any>(null);
  const isProcessingRef = useRef<boolean>(false);
  const isCooldownActiveRef = useRef<boolean>(false);

  useEffect(() => {
    fetchCenterZone();
  }, []);

  // Cleanup cooldown timer on unmount
  useEffect(() => {
    return () => {
      if (cooldownTimerRef.current) {
        clearInterval(cooldownTimerRef.current);
      }
    };
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

  const handleStartScanning = () => {
    setCountingState('scanning');
    toast.success('Sayım başladı - Barkodları okutmaya başlayın');
  };

  const handlePauseScanning = () => {
    setCountingState('paused');
    toast.info('Sayım duraklatıldı');
  };

  const handleResumeScanning = () => {
    setCountingState('scanning');
    toast.success('Sayıma devam ediliyor');
  };

  const handleStopAndReview = () => {
    setCountingState('reviewing');
    toast.info('Sayılan ürünler listeleniyor');
  };

  const handleScan = async (code: string) => {
    // STRICT BLOCKING: Use refs for immediate synchronous check
    if (isProcessingRef.current || isCooldownActiveRef.current || countingState !== 'scanning') {
      console.log('❌ Parent blocked scan - isProcessing:', isProcessingRef.current, 'isCooldown:', isCooldownActiveRef.current);
      return;
    }

    // Immediately set processing ref to block rapid scans BEFORE state update
    isProcessingRef.current = true;
    setIsProcessing(true);

    // START COOLDOWN IMMEDIATELY - don't wait for API
    startCooldown();

    console.log('🔍 Processing scanned code:', code);

    try {
      // Fetch product by barcode first
      const response = await fetch(`/api/products/by-barcode/${encodeURIComponent(code)}`);

      if (!response.ok) {
        toast.error('Ürün bulunamadı');
        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      const scannedProduct = await response.json();

      // Map product type to material_type
      const materialTypeMap: Record<string, 'finished' | 'semi' | 'raw'> = {
        'finished_product': 'finished',
        'semi_finished': 'semi',
        'raw_material': 'raw',
      };
      const materialType = materialTypeMap[scannedProduct.type] || 'raw';

      // Check if product already in list (by ID)
      const existingItem = countItems.find(item => item.id === scannedProduct.id);

      console.log('🔍 Scan check:', {
        scannedProductId: scannedProduct.id,
        existingItem: existingItem ? 'FOUND' : 'NOT FOUND',
        currentListIds: countItems.map(i => i.id)
      });

      if (existingItem) {
        console.log('✅ Incrementing existing item:', existingItem.product.product_name);

        // Increment count for existing product
        setCountItems(prev =>
          prev.map(item => {
            if (item.id === scannedProduct.id) {
              return {
                ...item,
                scannedCount: item.scannedCount + 1,
                scanTimestamps: [...item.scanTimestamps, Date.now()],
              };
            }
            return item;
          })
        );

        toast.success(`${existingItem.product.product_name} (+1) → ${existingItem.scannedCount + 1}`, {
          duration: 1500,
        });

        isProcessingRef.current = false;
        setIsProcessing(false);
        return;
      }

      console.log('➕ Adding new item to list:', scannedProduct.name);

      // Fetch current zone inventory (system quantity)
      let systemQuantity = 0;
      if (centerZoneId) {
        try {
          const invResponse = await fetch(
            `/api/warehouse/zones/${centerZoneId}/inventory?material_type=${materialType}&material_id=${scannedProduct.id}`
          );
          if (invResponse.ok) {
            const invData = await invResponse.json();
            systemQuantity = invData.data?.quantity || 0;
          }
        } catch (error) {
          console.error('Error fetching inventory:', error);
        }
      }

      // Add new product to count list
      const newItem: CountItem = {
        id: scannedProduct.id,
        product: {
          id: scannedProduct.id,
          product_code: scannedProduct.code,
          product_name: scannedProduct.name,
          quantity: scannedProduct.currentStock,
          material_type: materialType,
        },
        systemQuantity,
        scannedCount: 1,
        scanTimestamps: [Date.now()],
      };

      setCountItems(prev => [newItem, ...prev]);
      toast.success(`${scannedProduct.name} eklendi (1)`, {
        duration: 1500,
      });

    } catch (error) {
      console.error('Error processing scanned product:', error);
      toast.error('Ürün işlenirken hata oluştu');
    } finally {
      isProcessingRef.current = false;
      setIsProcessing(false);
    }
  };

  const startCooldown = () => {
    // Clear any existing timer
    if (cooldownTimerRef.current) {
      clearInterval(cooldownTimerRef.current);
    }

    // Set cooldown ref immediately for synchronous blocking
    isCooldownActiveRef.current = true;
    setCooldownSeconds(2);

    // Start countdown with visual feedback
    let remaining = 2;
    cooldownTimerRef.current = setInterval(() => {
      remaining -= 1;
      if (remaining <= 0) {
        clearInterval(cooldownTimerRef.current);
        cooldownTimerRef.current = null;
        isCooldownActiveRef.current = false;
        setCooldownSeconds(0);
        console.log('✅ Cooldown finished - ready for next scan');
      } else {
        setCooldownSeconds(remaining);
        console.log(`⏱️ Cooldown: ${remaining}s remaining`);
      }
    }, 1000);
  };

  const handleStartEdit = (item: CountItem) => {
    setEditingItemId(item.id);
    setEditingQuantity(item.scannedCount.toString());
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
          return {
            ...item,
            scannedCount: quantity,
          };
        }
        return item;
      })
    );

    setEditingItemId(null);
    setEditingQuantity('');
    toast.success('Miktar güncellendi');
  };

  const handleCancelEdit = () => {
    setEditingItemId(null);
    setEditingQuantity('');
  };

  const handleRemoveItem = (itemId: string) => {
    setCountItems(prev => prev.filter(item => item.id !== itemId));
    toast.success('Ürün listeden çıkarıldı');
  };

  const handleFinishCount = async () => {
    if (countItems.length === 0) {
      toast.error('Lütfen en az bir ürün sayın');
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
        actualQuantity: item.scannedCount,
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
      setCountingState('idle');
      router.push('/depo/mobile-dashboard');

    } catch (error: any) {
      console.error('Error submitting stock count:', error);
      toast.error(error.message || 'Stok sayımı kaydedilemedi');
    } finally {
      setIsLoading(false);
    }
  };

  const totalScannedCount = countItems.reduce((sum, item) => sum + item.scannedCount, 0);
  const totalDifference = countItems.reduce((sum, item) => sum + Math.abs(item.scannedCount - item.systemQuantity), 0);

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
              {centerZoneName}
            </p>
          </div>
          {countingState !== 'idle' && (
            <Badge
              variant="outline"
              className={`text-white border-white ${
                countingState === 'scanning' ? 'bg-green-500/30' :
                countingState === 'paused' ? 'bg-yellow-500/30' :
                'bg-blue-500/30'
              }`}
            >
              {countingState === 'scanning' ? 'Tarıyor' :
               countingState === 'paused' ? 'Duraklatıldı' :
               'İnceleme'}
            </Badge>
          )}
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2">
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Ürün Sayısı</p>
            <p className="text-lg font-bold">{countItems.length}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Toplam Adet</p>
            <p className="text-lg font-bold">{totalScannedCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-lg p-2 text-center">
            <p className="text-xs text-purple-100">Toplam Fark</p>
            <p className="text-lg font-bold">{totalDifference}</p>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="p-4 space-y-4">

        {/* Idle State - Start Counting */}
        {countingState === 'idle' && (
          <Card className="border-2 border-purple-200 shadow-md">
            <CardContent className="p-6 text-center">
              <ClipboardList className="h-16 w-16 text-purple-600 mx-auto mb-4" />
              <h2 className="text-lg font-semibold text-gray-900 mb-2">
                Stok Sayımına Başla
              </h2>
              <p className="text-sm text-gray-600 mb-4">
                Kamera ile barkod okutmaya başlayın. Aynı ürünü birden fazla kez okutabilirsiniz.
              </p>
              <Button
                onClick={handleStartScanning}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                <Camera className="h-5 w-5 mr-2" />
                Sayımı Başlat
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Scanning State */}
        {countingState === 'scanning' && (
          <Card className="border-2 border-green-200 shadow-md bg-green-50">
            <CardContent className="p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold text-green-900 flex items-center gap-2">
                    <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
                    Kamera Aktif
                  </h3>
                  <Badge variant="outline" className="text-xs bg-white">
                    {totalScannedCount} adet tarandı
                  </Badge>
                </div>
                <p className="text-xs text-green-700">
                  Barkodları okutmaya devam edin. Aynı ürün birden fazla kez taranabilir.
                </p>
              </div>

              <BarcodeScanner
                onScan={handleScan}
                isProcessing={isProcessing || cooldownSeconds > 0}
                continuousMode={true}
                showManualInput={false}
                title="Sürekli Tarama"
              />

              {/* Cooldown indicator */}
              {cooldownSeconds > 0 && (
                <div className="bg-amber-50 border-2 border-amber-200 rounded-lg p-3 text-center">
                  <p className="text-sm font-semibold text-amber-900">
                    Bekleme süresi: {cooldownSeconds} saniye
                  </p>
                  <p className="text-xs text-amber-700 mt-1">
                    Yeni okuma için lütfen bekleyin...
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2 mt-3">
                <Button
                  onClick={handlePauseScanning}
                  variant="outline"
                  className="w-full"
                >
                  <Pause className="h-4 w-4 mr-2" />
                  Duraklat
                </Button>
                <Button
                  onClick={handleStopAndReview}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Listele
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Paused State */}
        {countingState === 'paused' && (
          <Card className="border-2 border-yellow-200 shadow-md bg-yellow-50">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                <Pause className="h-12 w-12 text-yellow-600 mx-auto mb-2" />
                <h3 className="font-semibold text-yellow-900 mb-1">
                  Sayım Duraklatıldı
                </h3>
                <p className="text-xs text-yellow-700">
                  {countItems.length} ürün, {totalScannedCount} adet tarandı
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  onClick={handleResumeScanning}
                  className="w-full bg-green-600 hover:bg-green-700 text-white"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Devam Et
                </Button>
                <Button
                  onClick={handleStopAndReview}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <ClipboardList className="h-4 w-4 mr-2" />
                  Listele
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Product List (shown in all states except idle) */}
        {countingState !== 'idle' && (
          <div className="space-y-3">
            {countingState === 'reviewing' && countItems.length > 0 && (
              <Card className="border-2 border-blue-200 bg-blue-50">
                <CardContent className="p-3">
                  <div className="flex items-start gap-2">
                    <ClipboardList className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-blue-900">
                        Sayılan Ürünler
                      </p>
                      <p className="text-xs text-blue-700 mt-0.5">
                        Miktarları kontrol edin. Gerekirse manuel düzeltme yapabilirsiniz.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {countItems.length === 0 ? (
              <Card className="border-0 shadow-md">
                <CardContent className="p-8 text-center">
                  <Package className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 text-sm">
                    Henüz ürün taranmadı
                  </p>
                  <p className="text-gray-400 text-xs mt-1">
                    {countingState === 'scanning' ? 'Barkod okutmaya başlayın' : 'Sayımı başlatın'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              countItems.map((item) => {
                const difference = item.scannedCount - item.systemQuantity;

                return (
                  <Card key={item.id} className="border-0 shadow-md bg-white">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 text-sm truncate">
                            {item.product.product_name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {item.product.product_code}
                          </p>
                          <Badge variant="outline" className="mt-1 text-xs">
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
                          <p className="text-xs text-blue-600">Sayılan</p>
                          <p className="text-base font-bold text-blue-900">
                            {item.scannedCount}
                          </p>
                        </div>
                        <div
                          className={`rounded-lg p-2 text-center ${
                            difference === 0
                              ? 'bg-gray-50'
                              : difference > 0
                              ? 'bg-green-50'
                              : 'bg-red-50'
                          }`}
                        >
                          <p
                            className={`text-xs ${
                              difference === 0
                                ? 'text-gray-600'
                                : difference > 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}
                          >
                            Fark
                          </p>
                          <p
                            className={`text-base font-bold flex items-center justify-center gap-1 ${
                              difference === 0
                                ? 'text-gray-900'
                                : difference > 0
                                ? 'text-green-900'
                                : 'text-red-900'
                            }`}
                          >
                            {difference === 0 ? (
                              <Minus className="h-3 w-3" />
                            ) : difference > 0 ? (
                              <TrendingUp className="h-3 w-3" />
                            ) : (
                              <TrendingDown className="h-3 w-3" />
                            )}
                            {difference > 0 ? '+' : ''}{difference}
                          </p>
                        </div>
                      </div>

                      {/* Edit quantity (only in review mode) */}
                      {countingState === 'reviewing' && (
                        <>
                          {editingItemId === item.id ? (
                            <div className="space-y-2">
                              <Input
                                type="number"
                                value={editingQuantity}
                                onChange={(e) => setEditingQuantity(e.target.value)}
                                placeholder="Miktar"
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
                              variant="outline"
                              className="w-full"
                              size="sm"
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Miktarı Düzenle
                            </Button>
                          )}
                        </>
                      )}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </div>
        )}
      </div>

      {/* Bottom Action Bar (Review Mode) */}
      {countingState === 'reviewing' && countItems.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 shadow-lg">
          <div className="max-w-md mx-auto space-y-2">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-gray-600">
                {countItems.length} ürün, {totalScannedCount} adet
              </span>
              {totalDifference > 0 && (
                <Badge variant="outline" className="text-xs">
                  Fark: {totalDifference}
                </Badge>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Button
                onClick={handleResumeScanning}
                variant="outline"
                className="h-12"
              >
                <Camera className="h-4 w-4 mr-2" />
                Sayıma Devam
              </Button>
              <Button
                onClick={handleFinishCount}
                disabled={isLoading}
                className="bg-purple-600 hover:bg-purple-700 text-white h-12"
              >
                {isLoading ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                    Kaydediliyor...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Sayımı Bitir
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
