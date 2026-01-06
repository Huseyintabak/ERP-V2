'use client';

import { useEffect, useRef, useState } from 'react';
import { Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { provideFeedback } from '@/lib/utils/feedback';

interface BarcodeScannerProps {
  onScan: (barcode: string) => void;
  onClose?: () => void;
  title?: string;
  showManualInput?: boolean;
}

export function BarcodeScanner({
  onScan,
  onClose,
  title = 'Barkod Okuyucu',
  showManualInput = true,
}: BarcodeScannerProps) {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const scannerRef = useRef<any>(null);
  const isMountedRef = useRef(true);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    let scanner: any = null;

    const startScanner = async () => {
      if (!isScanning) return;

      try {
        // Dynamically import html5-qrcode only when needed
        const { Html5Qrcode } = await import('html5-qrcode');

        if (!isMountedRef.current) return;

        scanner = new Html5Qrcode('reader');
        scannerRef.current = scanner;

        const config = {
          fps: 10,
          qrbox: { width: 300, height: 150 },
          formatsToSupport: [
            0,  // QR_CODE
            1,  // AZTEC
            2,  // CODABAR
            3,  // CODE_39
            4,  // CODE_93
            5,  // CODE_128
            6,  // DATA_MATRIX
            7,  // MAXICODE
            8,  // ITF
            9,  // EAN_13
            10, // EAN_8
            11, // PDF_417
            12, // RSS_14
            13, // RSS_EXPANDED
            14, // UPC_A
            15, // UPC_E
            16, // UPC_EAN_EXTENSION
          ],
          aspectRatio: 2.0,
        };

        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText: string) => {
            // Success callback
            if (!isMountedRef.current) return;

            // Instant feedback when barcode is detected
            provideFeedback('info', { sound: true, vibration: true, visual: false });

            scanner.stop().then(() => {
              if (isMountedRef.current) {
                setIsScanning(false);
                scannerRef.current = null;
                onScan(decodedText);
              }
            }).catch((err: any) => {
              console.error('Error stopping scanner:', err);
            });
          },
          (errorMessage: string) => {
            // Error callback - ignore scanning errors
          }
        );
      } catch (err) {
        console.error('Camera start error:', err);
        if (isMountedRef.current) {
          setError('Kamera başlatılamadı. Lütfen kamera iznini kontrol edin.');
          setIsScanning(false);
        }
      }
    };

    if (isScanning) {
      startScanner();
    }

    return () => {
      if (scanner && scannerRef.current) {
        scanner.stop()
          .catch((err: any) => console.error('Cleanup stop error:', err))
          .finally(() => {
            scannerRef.current = null;
          });
      }
    };
  }, [isScanning, onScan]);

  const handleStartScanning = () => {
    setIsScanning(true);
    setError(null);
  };

  const handleStopScanning = () => {
    if (scannerRef.current) {
      scannerRef.current
        .stop()
        .then(() => {
          if (isMountedRef.current) {
            setIsScanning(false);
            scannerRef.current = null;
          }
        })
        .catch((err: any) => {
          console.error('Error stopping scanner:', err);
          if (isMountedRef.current) {
            setIsScanning(false);
            scannerRef.current = null;
          }
        });
    } else {
      setIsScanning(false);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (manualBarcode.trim()) {
      onScan(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Camera className="h-5 w-5" />
          {title}
        </CardTitle>
        {onClose && (
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Scanner Area */}
        {!isScanning ? (
          <div className="flex flex-col items-center gap-4 p-8 border-2 border-dashed rounded-lg">
            <Camera className="h-16 w-16 text-gray-400" />
            <p className="text-sm text-gray-600 text-center">
              Barkod veya QR kod okutmak için kamerayı başlatın
            </p>
            <Button onClick={handleStartScanning} size="lg">
              <Camera className="h-4 w-4 mr-2" />
              Kamerayı Başlat
            </Button>
            {error && (
              <p className="text-sm text-red-600 text-center">{error}</p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div
              id="reader"
              className="rounded-lg overflow-hidden border"
              style={{ width: '100%' }}
            />
            <Button
              onClick={handleStopScanning}
              variant="destructive"
              className="w-full"
            >
              <X className="h-4 w-4 mr-2" />
              Taramayı Durdur
            </Button>
          </div>
        )}

        {/* Manual Input */}
        {showManualInput && (
          <div className="pt-4 border-t">
            <form onSubmit={handleManualSubmit} className="space-y-3">
              <Label htmlFor="manual-barcode">Manuel Barkod Girişi</Label>
              <div className="flex gap-2">
                <Input
                  id="manual-barcode"
                  type="text"
                  placeholder="Barkod numarasını girin..."
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  autoComplete="off"
                />
                <Button type="submit" disabled={!manualBarcode.trim()}>
                  Gönder
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Kamera kullanamıyorsanız barkod numarasını manuel
                girebilirsiniz
              </p>
            </form>
          </div>
        )}

        {/* Info */}
        <div className="text-xs text-gray-500 space-y-1 pt-2">
          <p>💡 <strong>Desteklenen formatlar:</strong></p>
          <p className="ml-4">
            • <strong>QR Code</strong> ve Data Matrix (2D)<br/>
            • <strong>EAN-8, EAN-13</strong> (Ürün barkodları)<br/>
            • <strong>UPC-A, UPC-E</strong> (ABD ürün barkodları)<br/>
            • <strong>Code 39, Code 93, Code 128</strong> (Genel amaçlı)<br/>
            • <strong>ITF, Codabar, PDF 417</strong> ve daha fazlası
          </p>
          <p>📱 Mobil cihazlarda arka kamerayı kullanın</p>
          <p>🔦 İyi ışıklandırma barkod okuma başarısını artırır</p>
          <p>📏 Barkodu kamera ortasına yerleştirin ve net odaklayın</p>
        </div>
      </CardContent>
    </Card>
  );
}
