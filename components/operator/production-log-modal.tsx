'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Barcode, 
  Clock, 
  Package, 
  Target, 
  CheckCircle, 
  AlertCircle,
  History,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner';

interface ProductionLogModalProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ProductionLog {
  id: string;
  barcode_scanned: string;
  quantity_produced: number;
  timestamp: string;
}

interface BomMaterial {
  material_type: 'raw' | 'semi';
  material_code: string;
  material_name: string;
  quantity_needed: number;
  current_stock: number;
  consumption_per_unit: number;
}

export function ProductionLogModal({ task, isOpen, onClose, onSuccess }: ProductionLogModalProps) {
  const [barcode, setBarcode] = useState('');
  const [logs, setLogs] = useState<ProductionLog[]>([]);
  const [bomMaterials, setBomMaterials] = useState<BomMaterial[]>([]);
  const [loading, setLoading] = useState(false);
  const [fetchingLogs, setFetchingLogs] = useState(false);
  const [scanning, setScanning] = useState(false);

  // Progress hesaplama
  const progress = task ? Math.round((task.produced_quantity / task.planned_quantity) * 100) : 0;
  const remaining = task ? task.planned_quantity - task.produced_quantity : 0;
  const isComplete = remaining <= 0;

  useEffect(() => {
    if (isOpen && task) {
      fetchLogs();
      fetchBomMaterials();
    }
  }, [isOpen, task]);

  const fetchLogs = async () => {
    if (!task?.id) return;
    
    setFetchingLogs(true);
    try {
      const response = await fetch(`/api/production/logs?plan_id=${task.id}&limit=10`);
      if (response.ok) {
        const data = await response.json();
        setLogs(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching logs:', error);
    } finally {
      setFetchingLogs(false);
    }
  };

  const fetchBomMaterials = async () => {
    if (!task?.id) return;
    
    try {
      const response = await fetch(`/api/bom/snapshot/${task.id}`);
      if (response.ok) {
        const data = await response.json();
        setBomMaterials(data.materials || []);
      }
    } catch (error) {
      console.error('Error fetching BOM materials:', error);
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
          quantity_produced: 1
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Üretim kaydı oluşturulamadı');
      }
      
      // Success feedback
      toast.success(`Üretim kaydı oluşturuldu ✓ (+1 adet)`);
      setBarcode('');
      
      // Verileri yenile
      fetchLogs();
      onSuccess(); // Parent component'i güncelle
      
      // Tamamlanma kontrolü
      if (data.planProgress.remaining <= 0) {
        toast.success('🎉 Hedef miktar tamamlandı! Görevi bitirebilirsiniz.');
      }
      
    } catch (error) {
      console.error('Barcode submit error:', error);
      toast.error(error instanceof Error ? error.message : 'Üretim kaydı oluşturulamadı');
    } finally {
      setLoading(false);
      setScanning(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !loading) {
      handleBarcodeSubmit();
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="w-[95vw] h-[95vh] max-w-[1800px] overflow-y-auto p-10">
        <DialogHeader className="mb-6">
          <DialogTitle className="flex items-center gap-3 text-2xl">
            <Barcode className="h-6 w-6 text-blue-600" />
            Üretim Kaydı - {task.order?.order_number}
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Sol Taraf - Sipariş Bilgileri, İlerleme ve Barkod */}
          <div className="space-y-4">
            {/* Sipariş Bilgileri */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold">Sipariş Bilgileri</CardTitle>
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

            {/* İlerleme Göstergesi */}
            <Card>
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  İlerleme
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between text-base">
                    <span className="font-medium">Üretilen / Hedef</span>
                    <span className="font-bold text-lg">{task.produced_quantity} / {task.planned_quantity}</span>
                  </div>
                  <Progress value={progress} className="h-3" />
                  <div className="text-center text-base text-muted-foreground font-medium">
                    %{progress} tamamlandı
                  </div>
                </div>
                
                <Separator />
                
                <div className="flex justify-between text-base">
                  <span className="text-muted-foreground font-medium">Kalan:</span>
                  <span className={`font-bold text-lg ${remaining <= 0 ? 'text-green-600' : ''}`}>
                    {remaining} adet
                  </span>
                </div>
                
                {isComplete && (
                  <div className="flex items-center gap-2 text-green-600 text-sm">
                    <CheckCircle className="h-4 w-4" />
                    Hedef tamamlandı!
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Barkod Okutma */}
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2 text-blue-700">
                  <Barcode className="h-5 w-5" />
                  Barkod Okut
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <Label htmlFor="barcode" className="text-base font-medium">Barkod veya Ürün Kodu</Label>
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
                        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
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
          </div>

          {/* Sağ Taraf - Son Kayıtlar + BOM Malzemeleri */}
          <div className="space-y-4">
            {/* Son Kayıtlar */}
            <Card>
              <CardHeader className="pb-4">
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
                    <div className="space-y-3 p-6">
                      {logs.map((log) => (
                        <div key={log.id} className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-xl">
                          <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-blue-500 rounded-full flex items-center justify-center">
                              <Package className="h-6 w-6 text-white" />
                            </div>
                            <div>
                              <div className="font-bold text-base">{log.barcode_scanned}</div>
                              <div className="text-sm text-muted-foreground">
                                {new Date(log.timestamp).toLocaleTimeString('tr-TR')}
                              </div>
                            </div>
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

            {/* Gerekli Malzemeler */}
            <Card className="h-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold flex items-center gap-2">
                  <Package className="h-5 w-5" />
                  Gerekli Malzemeler
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ScrollArea className="h-[350px]">
                  {bomMaterials.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      BOM bilgileri yükleniyor...
                    </div>
                  ) : (
                    <div className="space-y-4 p-6">
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
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Kapat
          </Button>
          {isComplete && (
            <Button onClick={() => {
              // Tamamla action'ı burada çağırılabilir
              onClose();
            }}>
              Görevi Tamamla
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
