'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Camera,
  CameraOff,
  Flashlight,
  FlashlightOff,
  Keyboard,
  X,
  Package,
  TrendingUp,
  DollarSign,
  MapPin,
  ArrowLeft,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';
import { toast } from 'sonner';
import { BrowserMultiFormatReader } from '@zxing/browser';

interface ProductInfo {
  id: string;
  code: string;
  name: string;
  barcode: string;
  category?: string;
  price?: number;
  stock?: number;
  location?: string;
  type: string;
}

export default function BarcodeScannerPage() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedCode, setScannedCode] = useState<string>('');
  const [manualCode, setManualCode] = useState('');
  const [showManualInput, setShowManualInput] = useState(false);
  const [productInfo, setProductInfo] = useState<ProductInfo | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [scanHistory, setScanHistory] = useState<string[]>([]);
  const [showPermissionHelp, setShowPermissionHelp] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isHTTPS, setIsHTTPS] = useState(true);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const readerRef = useRef<BrowserMultiFormatReader | null>(null);
  const scanningRef = useRef<boolean>(false);

  useEffect(() => {
    // Initialize ZXing reader
    readerRef.current = new BrowserMultiFormatReader();

    // Check if HTTPS
    const protocol = window.location.protocol;
    if (protocol !== 'https:' && window.location.hostname !== 'localhost') {
      setIsHTTPS(false);
      setShowPermissionHelp(true);
      toast.error('⚠️ HTTPS bağlantı gerekli! Kamera çalışmayacak.');
    }

    return () => {
      stopScanner();
    };
  }, []);

  // Check and request camera permission
  const requestCameraPermission = async (): Promise<boolean> => {
    try {
      // Check if mediaDevices API is available
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setShowPermissionHelp(true);
        toast.error('⚠️ HTTPS bağlantı gerekli! Lütfen ngrok kullanın.');
        console.error('MediaDevices API not available. HTTPS required!');
        return false;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      });

      streamRef.current = stream;
      setHasPermission(true);
      setShowPermissionHelp(false);
      return true;
    } catch (err: any) {
      console.error('Camera permission error:', err);
      setHasPermission(false);

      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setShowPermissionHelp(true);
        toast.error('Kamera izni reddedildi');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        toast.error('Kamera bulunamadı');
      } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
        toast.error('Kamera başka bir uygulama tarafından kullanılıyor');
      } else if (err.name === 'NotSupportedError' || err.name === 'TypeError') {
        setShowPermissionHelp(true);
        toast.error('⚠️ HTTPS bağlantı gerekli!');
      } else {
        toast.error('Kamera erişimi sağlanamadı');
      }

      return false;
    }
  };

  // Start camera and scanning
  const startScanner = async () => {
    try {
      const hasAccess = await requestCameraPermission();
      if (!hasAccess || !streamRef.current) {
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      // Attach stream to video element
      video.srcObject = streamRef.current;
      video.setAttribute('playsinline', 'true');
      await video.play();

      setIsScanning(true);
      scanningRef.current = true;

      // Start continuous scanning with ZXing
      startContinuousScanning();

      toast.success('Kamera başlatıldı');
    } catch (err: any) {
      console.error('Scanner start error:', err);
      toast.error('Kamera başlatılamadı');
    }
  };

  // Continuous scanning loop
  const startContinuousScanning = () => {
    const video = videoRef.current;
    const reader = readerRef.current;

    if (!video || !reader) return;

    const scanFrame = async () => {
      if (!scanningRef.current) return;

      try {
        const result = await reader.decodeFromVideoElement(video);

        if (result) {
          const code = result.getText();
          handleScanSuccess(code);
        }
      } catch (err) {
        // No barcode found in this frame - continue scanning
      }

      if (scanningRef.current) {
        requestAnimationFrame(scanFrame);
      }
    };

    scanFrame();
  };

  // Stop camera and scanning
  const stopScanner = () => {
    scanningRef.current = false;
    setIsScanning(false);

    // Stop video stream
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }

    // Clear video element
    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
    }
  };

  // Handle successful scan
  const handleScanSuccess = (decodedText: string) => {
    // Prevent duplicate scans
    if (decodedText === scannedCode) return;

    // Vibrate on successful scan
    if (navigator.vibrate) {
      navigator.vibrate(100);
    }

    // Play beep sound
    try {
      const audio = new Audio('/sounds/beep.mp3');
      audio.play().catch(() => {});
    } catch (e) {}

    setScannedCode(decodedText);
    fetchProductInfo(decodedText);

    // Add to history
    setScanHistory((prev) => {
      const newHistory = [decodedText, ...prev.filter((code) => code !== decodedText)].slice(
        0,
        5
      );
      return newHistory;
    });

    // Stop scanning temporarily to show result
    stopScanner();
  };

  // Fetch product info from API
  const fetchProductInfo = async (barcode: string) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/products/by-barcode/${barcode}`);

      if (response.ok) {
        const data = await response.json();
        setProductInfo(data);
        toast.success('Ürün bulundu!');
      } else {
        setProductInfo(null);
        toast.error('Ürün bulunamadı');
      }
    } catch (error) {
      console.error('Product fetch error:', error);
      toast.error('Ürün bilgisi alınamadı');
      setProductInfo(null);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle manual barcode entry
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualCode.trim()) {
      setScannedCode(manualCode);
      fetchProductInfo(manualCode);
      setShowManualInput(false);
      setManualCode('');
    }
  };

  // Clear product info and restart scanning
  const clearProduct = () => {
    setProductInfo(null);
    setScannedCode('');
  };

  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="flex items-center gap-3 p-4">
          <Link href="/depo/mobile-dashboard">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Barkod Okuyucu</h1>
            <p className="text-sm text-muted-foreground">Kamera ile barkod okuyun</p>
          </div>
          {isScanning && (
            <Badge variant="default" className="bg-green-500">
              <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-1" />
              Aktif
            </Badge>
          )}
        </div>
      </div>

      {/* HTTPS Warning */}
      {!isHTTPS && (
        <div className="p-4">
          <Card className="border-2 border-red-300 bg-red-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-red-900 mb-2">🚫 HTTP Bağlantı - Kamera Çalışmaz!</h3>
                  <p className="text-sm text-red-800 mb-3">
                    Şu anda HTTP bağlantı kullanıyorsunuz. Kamera API'si güvenlik nedeniyle sadece HTTPS'te çalışır.
                  </p>
                  <div className="bg-white rounded p-3 mb-3">
                    <p className="text-xs font-bold text-gray-900 mb-2">✅ Çözüm: ngrok Kullanın</p>
                    <div className="space-y-1 text-xs text-gray-700">
                      <p>1. Terminal açın: <code className="bg-gray-200 px-1 rounded">ngrok http 3001</code></p>
                      <p>2. Çıkan HTTPS URL'i kopyalayın</p>
                      <p>3. Bu URL'i mobil cihazda açın</p>
                    </div>
                  </div>
                  <p className="text-xs text-red-700">
                    <strong>Not:</strong> localhost'ta test ediyorsanız sorun yok, ancak mobil cihazdan erişmek için ngrok gerekli.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Permission Help */}
      {showPermissionHelp && isHTTPS && (
        <div className="p-4">
          <Card className="border-2 border-orange-200 bg-orange-50">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-6 h-6 text-orange-600 flex-shrink-0 mt-1" />
                <div>
                  <h3 className="font-bold text-orange-900 mb-2">Kamera İzni Gerekli</h3>
                  <p className="text-sm text-orange-800 mb-3">
                    Barkod okumak için kamera erişimi gerekiyor.
                  </p>
                  <div className="text-xs text-orange-700 space-y-2 mb-3">
                    <div className="bg-red-100 border border-red-300 rounded p-2 mb-2">
                      <p className="font-bold text-red-900">
                        ⚠️ HTTPS Gerekli!
                      </p>
                      <p className="text-red-800 mt-1">
                        Kamera API'si sadece HTTPS bağlantıda çalışır.
                      </p>
                    </div>
                    <p>
                      <strong>Çözüm:</strong> Terminal'de <code className="bg-gray-200 px-1 rounded">ngrok http 3001</code> çalıştırın ve çıkan HTTPS URL'ini kullanın.
                    </p>
                    <p className="mt-2">
                      <strong>iOS Safari:</strong>
                    </p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>Ayarlar → Safari → Kamera</li>
                      <li>Bu siteye izin verin</li>
                    </ol>
                    <p className="mt-2">
                      <strong>Android Chrome:</strong>
                    </p>
                    <ol className="list-decimal ml-4 space-y-1">
                      <li>URL yanındaki kilit ikonuna tıklayın</li>
                      <li>İzinler → Kamera → İzin ver</li>
                    </ol>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={startScanner}
                      size="sm"
                      className="bg-orange-600 hover:bg-orange-700"
                    >
                      Tekrar Dene
                    </Button>
                    <Button
                      onClick={() => setShowPermissionHelp(false)}
                      size="sm"
                      variant="outline"
                    >
                      Kapat
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Scanner Container */}
      <div className="p-4">
        <Card className="overflow-hidden">
          <CardContent className="p-0">
            {/* Camera View */}
            <div className="relative bg-black aspect-square">
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                playsInline
                muted
              />

              {!isScanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                  <div className="text-center text-white p-6">
                    <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p className="text-sm">Kamera başlatılmadı</p>
                  </div>
                </div>
              )}

              {/* Scanning Overlay */}
              {isScanning && (
                <div className="absolute inset-0 pointer-events-none">
                  {/* Scanning frame */}
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-64 h-64 border-4 border-green-500 rounded-lg shadow-lg">
                      <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-white rounded-tl-lg"></div>
                      <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-white rounded-tr-lg"></div>
                      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-white rounded-bl-lg"></div>
                      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-white rounded-br-lg"></div>
                    </div>
                  </div>

                  {/* Instruction */}
                  <div className="absolute top-4 left-4 right-4">
                    <div className="bg-black/50 backdrop-blur-sm text-white px-4 py-2 rounded-lg text-sm text-center">
                      📸 Barkodu yeşil çerçeve içine getirin
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Controls */}
            <div className="p-4 bg-white">
              <div className="grid grid-cols-2 gap-2">
                {!isScanning ? (
                  <Button onClick={startScanner} className="col-span-2" size="lg">
                    <Camera className="w-4 h-4 mr-2" />
                    Kamerayı Başlat
                  </Button>
                ) : (
                  <Button onClick={stopScanner} variant="destructive" size="lg" className="col-span-2">
                    <CameraOff className="w-4 h-4 mr-2" />
                    Durdur
                  </Button>
                )}

                <Button
                  onClick={() => setShowManualInput(!showManualInput)}
                  variant="outline"
                  size="lg"
                  className="col-span-2"
                >
                  <Keyboard className="w-4 h-4 mr-2" />
                  Manuel Giriş
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Manual Input */}
        {showManualInput && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Manuel Barkod Girişi</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleManualSubmit} className="flex gap-2">
                <Input
                  type="text"
                  placeholder="Barkod numarasını girin..."
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  className="flex-1"
                  autoFocus
                />
                <Button type="submit" disabled={!manualCode.trim()}>
                  Ara
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        {/* Product Info */}
        {scannedCode && (
          <Card className="mt-4">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Taranan Barkod</CardTitle>
              <Button variant="ghost" size="icon" onClick={clearProduct}>
                <X className="w-4 h-4" />
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <div className="font-mono text-lg font-bold bg-gray-100 p-3 rounded text-center">
                  {scannedCode}
                </div>
              </div>

              {isLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto" />
                  <p className="text-sm text-muted-foreground mt-2">
                    Ürün bilgisi yükleniyor...
                  </p>
                </div>
              ) : productInfo ? (
                <div className="space-y-4">
                  <div>
                    <h3 className="font-bold text-lg">{productInfo.name}</h3>
                    <p className="text-sm text-muted-foreground">{productInfo.code}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    {productInfo.category && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <Package className="w-4 h-4" />
                          <span className="text-xs">Kategori</span>
                        </div>
                        <p className="font-semibold text-sm">{productInfo.category}</p>
                      </div>
                    )}

                    {productInfo.stock !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <TrendingUp className="w-4 h-4" />
                          <span className="text-xs">Stok</span>
                        </div>
                        <p className="font-semibold text-sm">{productInfo.stock} adet</p>
                      </div>
                    )}

                    {productInfo.price !== undefined && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <DollarSign className="w-4 h-4" />
                          <span className="text-xs">Fiyat</span>
                        </div>
                        <p className="font-semibold text-sm">
                          ₺{productInfo.price.toFixed(2)}
                        </p>
                      </div>
                    )}

                    {productInfo.location && (
                      <div className="bg-gray-50 p-3 rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground mb-1">
                          <MapPin className="w-4 h-4" />
                          <span className="text-xs">Konum</span>
                        </div>
                        <p className="font-semibold text-sm">{productInfo.location}</p>
                      </div>
                    )}
                  </div>

                  <div className="flex gap-2">
                    <Link href={`/depo/stok-giris?barcode=${scannedCode}`} className="flex-1">
                      <Button className="w-full" variant="default">
                        Stok Giriş
                      </Button>
                    </Link>
                    <Link href={`/depo/stok-cikis?barcode=${scannedCode}`} className="flex-1">
                      <Button className="w-full" variant="outline">
                        Stok Çıkış
                      </Button>
                    </Link>
                  </div>

                  <Button onClick={startScanner} variant="secondary" className="w-full">
                    <Camera className="w-4 h-4 mr-2" />
                    Yeni Barkod Okut
                  </Button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Package className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-muted-foreground mb-4">Ürün bulunamadı</p>
                  <Button onClick={startScanner} variant="secondary">
                    <Camera className="w-4 h-4 mr-2" />
                    Tekrar Dene
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Scan History */}
        {scanHistory.length > 0 && !scannedCode && (
          <Card className="mt-4">
            <CardHeader>
              <CardTitle className="text-sm">Son Tarananlar</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {scanHistory.map((code, index) => (
                  <button
                    key={index}
                    onClick={() => {
                      setScannedCode(code);
                      fetchProductInfo(code);
                    }}
                    className="w-full text-left p-3 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <p className="font-mono text-sm">{code}</p>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
