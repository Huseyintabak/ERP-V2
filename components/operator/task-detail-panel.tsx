'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Barcode,
  Target,
  Package,
  History,
  Loader2,
  AlertCircle,
  CheckCircle,
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductionTask {
  id: string;
  order_id: string;
  product_id: string;
  planned_quantity: number;
  produced_quantity: number;
  status: string;
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    delivery_date: string;
    priority: 'dusuk' | 'orta' | 'yuksek';
  };
  product?: {
    id: string;
    name: string;
    code: string;
    barcode?: string;
  };
}

interface ProductionLog {
  id: string;
  barcode_scanned: string;
  quantity_produced: number;
  timestamp: string;
}

interface BomMaterial {
  material_id: string;
  material_name: string;
  material_code: string;
  material_type: 'raw' | 'semi';
  quantity_needed: number;
  consumption_per_unit: number;
  current_stock: number;
}

interface TaskDetailPanelProps {
  task: ProductionTask | null;
  onRefresh?: () => void;
}

export function TaskDetailPanel({ task, onRefresh }: TaskDetailPanelProps) {
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [bomMaterials, setBomMaterials] = useState<BomMaterial[]>([]);
  const [fetchingLogs, setFetchingLogs] = useState(false);

  useEffect(() => {
    if (task) {
      fetchLogs();
      fetchBomMaterials();
    }
  }, [task?.id]);

  const fetchLogs = async () => {
    if (!task) return;
    
    setFetchingLogs(true);
    try {
      const response = await fetch(`/api/production/logs?plan_id=${task.id}`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    } finally {
      setFetchingLogs(false);
    }
  };

  const fetchBomMaterials = async () => {
    if (!task) return;
    
    try {
      const response = await fetch(`/api/bom/snapshot/${task.id}`);
      if (response.ok) {
        const data = await response.json();
        setBomMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Failed to fetch BOM:', error);
    }
  };

  const handleBarcodeSubmit = async () => {
    if (!barcode.trim() || !task) return;

    setLoading(true);
    setScanning(true);

    try {
      const response = await fetch('/api/production/log', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: task.id,
          barcode_scanned: barcode.trim(),
          quantity_produced: 1,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Kayıt eklenemedi');
      }

      toast.success('Üretim kaydı başarıyla eklendi');
      setBarcode('');
      
      // Verileri yenile
      fetchLogs();
      fetchBomMaterials();
      onRefresh?.();
      
    } catch (error) {
      console.error('Production log error:', error);
      toast.error(error instanceof Error ? error.message : 'Kayıt eklenemedi');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !loading && barcode.trim()) {
      handleBarcodeSubmit();
    }
  };

  if (!task) {
    return (
      <div className="h-full flex items-center justify-center bg-muted/20">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground mx-auto" />
          <div>
            <h3 className="text-xl font-semibold text-muted-foreground">Görev Seçilmedi</h3>
            <p className="text-muted-foreground mt-2">
              Soldaki listeden bir görev seçin
            </p>
          </div>
        </div>
      </div>
    );
  }

  const progress = Math.round((task.produced_quantity / task.planned_quantity) * 100);
  const remaining = task.planned_quantity - task.produced_quantity;
  const isComplete = remaining <= 0;

  return (
    <div className="h-full overflow-y-auto bg-background">
      {/* Header */}
      <div className="sticky top-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 z-10 border-b p-6">
        <div className="flex items-center gap-3">
          <Barcode className="h-7 w-7 text-blue-600" />
          <div>
            <h2 className="text-2xl font-bold">{task.order?.order_number}</h2>
            <p className="text-sm text-muted-foreground">{task.product?.name}</p>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-6">
        {/* Üst Bölüm: Sipariş Bilgileri + İlerleme Özeti (Yan Yana) */}
        <div className="grid grid-cols-2 gap-6">
          {/* Sipariş Bilgileri */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Bilgileri</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-base">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Müşteri:</span>
                <span className="font-medium">{task.order?.customer_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ürün:</span>
                <span className="font-medium">{task.product?.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Teslim:</span>
                <span className="font-medium">
                  {task.order?.delivery_date ? new Date(task.order.delivery_date).toLocaleDateString('tr-TR') : 'N/A'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Öncelik:</span>
                <Badge variant={task.order?.priority === 'yuksek' ? 'destructive' : 'default'}>
                  {task.order?.priority === 'yuksek' ? 'Acil' : 'Normal'}
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* İlerleme Özeti */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Target className="h-5 w-5" />
                İlerleme
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex justify-between text-base">
                <span className="font-medium">Üretilen / Hedef</span>
                <span className="font-bold text-2xl">{task.produced_quantity} / {task.planned_quantity}</span>
              </div>
              
              <Separator />
              
              <div className="flex justify-between text-base">
                <span className="text-muted-foreground font-medium">Kalan:</span>
                <span className={`font-bold text-2xl ${remaining <= 0 ? 'text-green-600' : ''}`}>
                  {remaining} adet
                </span>
              </div>
              
              {isComplete && (
                <div className="flex items-center gap-2 text-green-600 text-base">
                  <CheckCircle className="h-5 w-5" />
                  Hedef tamamlandı!
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* İlerleme Barı (Full Width) */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Üretim İlerlemesi</span>
                <span className="font-semibold">%{progress}</span>
              </div>
              <Progress value={progress} className="h-4" />
              <div className="text-center text-base text-muted-foreground font-medium">
                %{progress} tamamlandı
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Barkod Okut */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-700">
              <Barcode className="h-5 w-5" />
              Barkod Okut
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <Label htmlFor="barcode" className="text-base font-medium">Barkod veya Ürün Kodu</Label>
              {task.product?.barcode && (
                <div className="text-sm text-blue-600 bg-blue-100 px-3 py-2 rounded-lg font-mono">
                  <strong>Ürün Barkodu:</strong> {task.product.barcode}
                </div>
              )}
              <div className="relative">
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Barkod okutun veya ürün kodunu girin"
                  disabled={loading || isComplete}
                  className="pr-10 h-14 text-lg"
                  autoFocus
                />
                {scanning && (
                  <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  </div>
                )}
              </div>
            </div>
            
            <Button 
              onClick={handleBarcodeSubmit}
              disabled={loading || !barcode.trim() || isComplete}
              className="w-full h-14 text-lg font-semibold"
              size="lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Package className="h-5 w-5 mr-2" />
                  Kaydet (+1 adet)
                </>
              )}
            </Button>
            
            {isComplete && (
              <div className="flex items-center gap-2 text-orange-600 text-sm">
                <AlertCircle className="h-4 w-4" />
                Hedef tamamlandı, yeni kayıt eklenemez
              </div>
            )}
          </CardContent>
        </Card>

        {/* Gerekli Malzemeler */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <Package className="h-5 w-5" />
              Gerekli Malzemeler
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[400px]">
              {bomMaterials.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  BOM bilgileri yükleniyor...
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4 p-6">
                  {bomMaterials.map((material, index) => {
                    const totalNeeded = material.quantity_needed;
                    const consumed = material.consumption_per_unit * task.produced_quantity;
                    const remaining = totalNeeded - consumed;
                    const isLowStock = material.current_stock < totalNeeded;
                    
                    return (
                      <div key={index} className={`p-5 border-2 rounded-xl ${isLowStock ? 'border-orange-300 bg-orange-50' : 'border-gray-200 bg-white'}`}>
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <div className="font-bold text-base mb-1">{material.material_name}</div>
                            <div className="text-sm text-muted-foreground">
                              {material.material_code} ({material.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul'})
                            </div>
                          </div>
                          {isLowStock && (
                            <AlertCircle className="h-6 w-6 text-orange-500" />
                          )}
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Gerekli:</span>
                            <span className="font-bold text-lg">{totalNeeded.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Tüketilen:</span>
                            <span className="font-bold text-lg text-blue-600">{consumed.toFixed(2)}</span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Kalan:</span>
                            <span className={`font-bold text-lg ${remaining <= 0 ? 'text-green-600' : 'text-gray-700'}`}>
                              {remaining.toFixed(2)}
                            </span>
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className="text-muted-foreground">Mevcut Stok:</span>
                            <span className={`font-bold text-lg ${isLowStock ? 'text-orange-600' : 'text-green-600'}`}>
                              {material.current_stock.toFixed(2)}
                            </span>
                          </div>
                        </div>
                        
                        {isLowStock && (
                          <div className="mt-3 text-sm font-medium text-orange-700 bg-orange-100 p-3 rounded-lg">
                            ⚠️ Yetersiz stok!
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Son Kayıtlar */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg font-semibold flex items-center gap-2">
              <History className="h-5 w-5" />
              Son Kayıtlar
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[250px]">
              {fetchingLogs ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : logs.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground text-base">
                  Henüz kayıt yok
                </div>
              ) : (
                <div className="grid grid-cols-3 gap-4 p-6">
                  {logs.map((log) => (
                    <div key={log.id} className="p-4 bg-blue-50 border border-blue-200 rounded-xl text-center space-y-2">
                      <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center mx-auto">
                        <Package className="h-6 w-6 text-white" />
                      </div>
                      <div className="font-bold text-base">{log.barcode_scanned}</div>
                      <div className="text-sm text-muted-foreground">
                        {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                      </div>
                      <Badge variant="secondary" className="text-lg px-4 py-2 font-bold">
                        +{log.quantity_produced}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

