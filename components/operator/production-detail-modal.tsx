'use client';

import { useState, useEffect } from 'react';
import { useBarcode } from '@/lib/hooks/use-barcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn, formatDateTime } from '@/lib/utils';
import {
  Play,
  Pause,
  CheckCircle,
  RotateCcw,
  Barcode,
  Package,
  Clock,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';

interface Production {
  id: string;
  order: {
    order_number: string;
    customer_name: string;
  };
  product: {
    name: string;
    code: string;
    barcode: string;
  };
  planned_quantity: number;
  produced_quantity: number;
  status: 'planlandi' | 'devam_ediyor' | 'duraklatildi' | 'tamamlandi';
  started_at: string;
}

interface ProductionLog {
  id: string;
  barcode_scanned: string;
  quantity_produced: number;
  timestamp: string;
}

interface ProductionDetailModalProps {
  production: Production;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export default function ProductionDetailModal({
  production,
  isOpen,
  onClose,
  onUpdate,
}: ProductionDetailModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [lastScannedBarcode, setLastScannedBarcode] = useState('');

  // Barkod okutma hook'u
  useBarcode((scannedBarcode) => {
    setBarcodeInput(scannedBarcode);
    handleBarcodeScan(scannedBarcode);
  });

  useEffect(() => {
    if (isOpen) {
      fetchProductionLogs();
    }
  }, [isOpen, production.id]);

  const fetchProductionLogs = async () => {
    try {
      const response = await fetch(`/api/production/logs?plan_id=${production.id}`);
      if (!response.ok) throw new Error('Failed to fetch logs');
      const data = await response.json();
      setLogs(data.data || []);
    } catch (error) {
      console.error('Error fetching logs:', error);
    }
  };

  const handleBarcodeScan = async (barcode: string) => {
    if (!barcode || barcode.length < 3) return;

    setLastScannedBarcode(barcode);
    
    // Barkod ürün barkodu ile eşleşiyor mu kontrol et
    if (barcode === production.product.barcode) {
      await handleProductionLog();
    } else {
      toast.error('Yanlış barkod! Bu ürün için geçerli değil.');
    }
  };

  const handleProductionLog = async () => {
    if (quantity <= 0) {
      toast.error('Miktar 0\'dan büyük olmalı');
      return;
    }

    if (production.produced_quantity + quantity > production.planned_quantity) {
      toast.error('Planlanan miktarı aşamazsınız!');
      return;
    }

    try {
      setLoading(true);
      
      const response = await fetch('/api/production/logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: production.id,
          barcode_scanned: lastScannedBarcode,
          quantity_produced: quantity,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Üretim kaydı oluşturulamadı');
      }

      toast.success(`${quantity} adet üretim kaydedildi!`);
      
      // Form temizle
      setQuantity(1);
      setBarcodeInput('');
      
      // Logs'u yenile
      await fetchProductionLogs();
      
      // Parent component'i güncelle
      onUpdate();

    } catch (error: any) {
      console.error('Error creating production log:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusChange = async (newStatus: 'devam_ediyor' | 'duraklatildi' | 'tamamlandi') => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/production/plans/${production.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Durum güncellenemedi');
      }

      toast.success(`Üretim durumu ${newStatus} olarak güncellendi!`);
      onUpdate();
      onClose();

    } catch (error: any) {
      console.error('Error updating status:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReverseLog = async (logId: string) => {
    if (!confirm('Bu kaydı geri almak istediğinizden emin misiniz?')) return;

    try {
      setLoading(true);
      
      const response = await fetch(`/api/production/logs/${logId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Kayıt geri alınamadı');
      }

      toast.success('Kayıt başarıyla geri alındı!');
      await fetchProductionLogs();
      onUpdate();

    } catch (error: any) {
      console.error('Error reversing log:', error);
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const progress = (production.produced_quantity / production.planned_quantity) * 100;
  const isCompleted = progress >= 100;
  const canReverse = (log: ProductionLog) => {
    const logTime = new Date(log.timestamp);
    const now = new Date();
    const diffMinutes = (now.getTime() - logTime.getTime()) / (1000 * 60);
    return diffMinutes <= 5; // Son 5 dakika
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Üretim Detayları
          </DialogTitle>
          <DialogDescription>
            {production.order.order_number} - {production.order.customer_name}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Sol Panel - Üretim Bilgileri */}
          <div className="space-y-6">
            {/* Ürün Bilgileri */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Ürün Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-sm font-medium">Ürün Adı</Label>
                  <p className="text-lg font-semibold">{production.product.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Ürün Kodu</Label>
                  <p className="text-sm text-muted-foreground">{production.product.code}</p>
                </div>
                <div>
                  <Label className="text-sm font-medium">Barkod</Label>
                  <div className="flex items-center space-x-2">
                    <Barcode className="h-4 w-4" />
                    <code className="bg-gray-100 px-2 py-1 rounded text-sm">
                      {production.product.barcode}
                    </code>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* İlerleme */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">İlerleme Durumu</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {production.produced_quantity} / {production.planned_quantity}
                  </div>
                  <div className="text-sm text-muted-foreground">Üretilen / Planlanan</div>
                </div>
                
                <div className="w-full bg-gray-200 rounded-full h-4">
                  <div
                    className={cn(
                      "h-4 rounded-full transition-all duration-500",
                      isCompleted ? "bg-green-600" : "bg-blue-600"
                    )}
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
                
                <div className="text-center">
                  <Badge variant={isCompleted ? "default" : "secondary"} className="text-sm">
                    %{Math.round(progress)}
                  </Badge>
                </div>

                {production.started_at && (
                  <div className="text-center text-sm text-muted-foreground">
                    <Clock className="h-4 w-4 inline mr-1" />
                    Başlangıç: {formatDateTime(production.started_at)}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Manuel Barkod Girişi */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Manuel Barkod Girişi</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="barcode">Barkod</Label>
                  <Input
                    id="barcode"
                    value={barcodeInput}
                    onChange={(e) => setBarcodeInput(e.target.value)}
                    placeholder="Barkodu okutun veya yazın"
                    className="font-mono"
                  />
                </div>
                
                <div>
                  <Label htmlFor="quantity">Miktar</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max={production.planned_quantity - production.produced_quantity}
                    value={quantity}
                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                  />
                </div>

                <Button
                  onClick={() => {
                    setLastScannedBarcode(barcodeInput);
                    handleBarcodeScan(barcodeInput);
                  }}
                  disabled={loading || !barcodeInput || quantity <= 0}
                  className="w-full"
                >
                  {loading ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Barcode className="h-4 w-4 mr-2" />
                  )}
                  Üretim Kaydet
                </Button>
              </CardContent>
            </Card>

            {/* Durum Kontrolleri */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Durum Kontrolleri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {production.status === 'planlandi' && (
                  <Button
                    onClick={() => handleStatusChange('devam_ediyor')}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Üretimi Başlat
                  </Button>
                )}

                {production.status === 'devam_ediyor' && (
                  <>
                    <Button
                      onClick={() => handleStatusChange('duraklatildi')}
                      disabled={loading}
                      variant="outline"
                      className="w-full"
                    >
                      <Pause className="h-4 w-4 mr-2" />
                      Duraklat
                    </Button>
                    
                    {isCompleted && (
                      <Button
                        onClick={() => handleStatusChange('tamamlandi')}
                        disabled={loading}
                        className="w-full bg-green-600 hover:bg-green-700"
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Tamamla
                      </Button>
                    )}
                  </>
                )}

                {production.status === 'duraklatildi' && (
                  <Button
                    onClick={() => handleStatusChange('devam_ediyor')}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Devam Et
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Sağ Panel - Üretim Kayıtları */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Son Üretim Kayıtları</CardTitle>
              </CardHeader>
              <CardContent>
                {logs.length === 0 ? (
                  <div className="text-center text-muted-foreground py-8">
                    <AlertCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Henüz üretim kaydı bulunmuyor.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {logs.slice(0, 10).map((log) => (
                      <div
                        key={log.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div className="flex-1">
                          <div className="flex items-center space-x-2">
                            <Barcode className="h-4 w-4 text-muted-foreground" />
                            <code className="text-sm font-mono">{log.barcode_scanned}</code>
                          </div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {log.quantity_produced} adet - {formatDateTime(log.timestamp)}
                          </div>
                        </div>
                        
                        {canReverse(log) && (
                          <Button
                            onClick={() => handleReverseLog(log.id)}
                            disabled={loading}
                            size="sm"
                            variant="outline"
                            className="text-red-600 hover:text-red-700"
                          >
                            <RotateCcw className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
