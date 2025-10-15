'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Upload, 
  Download, 
  Calculator, 
  CheckCircle, 
  AlertTriangle, 
  TrendingUp, 
  TrendingDown,
  FileSpreadsheet,
  RefreshCw,
  Save
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';

interface InventoryItem {
  id: string;
  code: string;
  name: string;
  currentQuantity: number;
  countedQuantity: number;
  difference: number;
  unit: string;
  unitPrice: number;
  valueDifference: number;
  status: 'match' | 'excess' | 'shortage' | 'missing';
}

interface InventoryCountAutomationProps {
  materialType: 'raw' | 'semi' | 'finished';
  onComplete?: (results: InventoryItem[]) => void;
}

export function InventoryCountAutomation({ 
  materialType, 
  onComplete 
}: InventoryCountAutomationProps) {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [step, setStep] = useState<'upload' | 'review' | 'process' | 'complete'>('upload');

  // Load current inventory
  const loadCurrentInventory = useCallback(async () => {
    try {
      setLoading(true);
      const endpoint = materialType === 'raw' 
        ? '/api/stock/raw'
        : materialType === 'semi'
        ? '/api/stock/semi'
        : '/api/stock/finished';

      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Envanter verisi yüklenemedi');
      }

      const data = await response.json();
      const items: InventoryItem[] = (data.data || []).map((item: any) => ({
        id: item.id,
        code: item.code,
        name: item.name,
        currentQuantity: item.quantity || 0,
        countedQuantity: 0,
        difference: 0,
        unit: item.unit || 'adet',
        unitPrice: item.unit_price || item.unit_cost || item.sale_price || 0,
        valueDifference: 0,
        status: 'match' as const
      }));

      setInventoryItems(items);
    } catch (error: any) {
      console.error('Error loading inventory:', error);
      toast.error(error.message || 'Envanter verisi yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, [materialType]);

  useEffect(() => {
    loadCurrentInventory();
  }, [loadCurrentInventory]);

  // Handle Excel file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir');
      return;
    }

    setUploadedFile(file);
    processExcelFile(file);
  };

  // Process Excel file
  const processExcelFile = async (file: File) => {
    try {
      setProcessing(true);
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      // Expected columns: code, name, counted_quantity, unit, notes
      const processedItems = jsonData.map((row: any) => {
        const code = row.code || row.kod || row.Code || row.Kod || '';
        const name = row.name || row.name || row.Name || row.Name || '';
        const countedQuantity = parseFloat(row.counted_quantity || row.sayilan_miktar || row.Counted_Quantity || 0) || 0;
        const unit = row.unit || row.birim || row.Unit || row.Birim || 'adet';
        const notes = row.notes || row.notlar || row.Notes || row.Notlar || '';

        return {
          code: code.toString(),
          name: name.toString(),
          countedQuantity,
          unit,
          notes
        };
      });

      // Match with current inventory
      const matchedItems = inventoryItems.map(item => {
        const countedItem = processedItems.find(p => 
          p.code.toLowerCase() === item.code.toLowerCase() ||
          p.name.toLowerCase() === item.name.toLowerCase()
        );

        if (countedItem) {
          const difference = countedItem.countedQuantity - item.currentQuantity;
          const valueDifference = difference * item.unitPrice;
          
          let status: 'match' | 'excess' | 'shortage' | 'missing' = 'match';
          if (difference > 0) status = 'excess';
          else if (difference < 0) status = 'shortage';
          else if (countedItem.countedQuantity === 0 && item.currentQuantity > 0) status = 'missing';

          return {
            ...item,
            countedQuantity: countedItem.countedQuantity,
            difference,
            valueDifference,
            status
          };
        }

        return item;
      });

      setInventoryItems(matchedItems);
      setStep('review');
      toast.success('Excel dosyası başarıyla işlendi');
    } catch (error: any) {
      console.error('Error processing Excel file:', error);
      toast.error('Excel dosyası işlenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  // Manual count update
  const updateCountedQuantity = (id: string, quantity: number) => {
    setInventoryItems(prev => prev.map(item => {
      if (item.id === id) {
        const difference = quantity - item.currentQuantity;
        const valueDifference = difference * item.unitPrice;
        
        let status: 'match' | 'excess' | 'shortage' | 'missing' = 'match';
        if (difference > 0) status = 'excess';
        else if (difference < 0) status = 'shortage';
        else if (quantity === 0 && item.currentQuantity > 0) status = 'missing';

        return {
          ...item,
          countedQuantity: quantity,
          difference,
          valueDifference,
          status
        };
      }
      return item;
    }));
  };

  // Process inventory updates
  const processInventoryUpdates = async () => {
    try {
      setProcessing(true);
      setStep('process');

      const updates = inventoryItems
        .filter(item => item.difference !== 0)
        .map(item => ({
          materialId: item.id,
          materialType,
          quantity: item.countedQuantity,
          difference: item.difference,
          reason: 'Envanter sayım farkı',
          notes: `Sistem: ${item.currentQuantity}, Sayılan: ${item.countedQuantity}`
        }));

      if (updates.length === 0) {
        toast.info('Güncellenecek fark bulunamadı');
        setStep('complete');
        return;
      }

      // Send updates to API
      const response = await fetch('/api/stock/inventory-count/process', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ updates }),
      });

      if (!response.ok) {
        throw new Error('Envanter güncellemeleri işlenemedi');
      }

      toast.success(`${updates.length} adet envanter farkı güncellendi`);
      setStep('complete');
      onComplete?.(inventoryItems);
    } catch (error: any) {
      console.error('Error processing updates:', error);
      toast.error(error.message || 'Envanter güncellemeleri işlenirken hata oluştu');
    } finally {
      setProcessing(false);
    }
  };

  // Export results
  const exportResults = () => {
    const worksheet = XLSX.utils.json_to_sheet(
      inventoryItems.map(item => ({
        'Malzeme Kodu': item.code,
        'Malzeme Adı': item.name,
        'Mevcut Miktar': item.currentQuantity,
        'Sayılan Miktar': item.countedQuantity,
        'Fark': item.difference,
        'Birim': item.unit,
        'Birim Fiyat': item.unitPrice,
        'Değer Farkı': item.valueDifference,
        'Durum': item.status === 'match' ? 'Eşleşti' : 
                item.status === 'excess' ? 'Fazla' :
                item.status === 'shortage' ? 'Eksik' : 'Eksik'
      }))
    );

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Envanter Sayım Sonuçları');
    XLSX.writeFile(workbook, `envanter_sayim_${materialType}_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  // Get status badge
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'match':
        return <Badge variant="default" className="bg-green-600">Eşleşti</Badge>;
      case 'excess':
        return <Badge variant="default" className="bg-blue-600">Fazla</Badge>;
      case 'shortage':
        return <Badge variant="destructive">Eksik</Badge>;
      case 'missing':
        return <Badge variant="destructive">Eksik</Badge>;
      default:
        return <Badge variant="secondary">Bilinmiyor</Badge>;
    }
  };

  // Calculate summary
  const summary = {
    totalItems: inventoryItems.length,
    matched: inventoryItems.filter(item => item.status === 'match').length,
    excess: inventoryItems.filter(item => item.status === 'excess').length,
    shortage: inventoryItems.filter(item => item.status === 'shortage').length,
    missing: inventoryItems.filter(item => item.status === 'missing').length,
    totalValueDifference: inventoryItems.reduce((sum, item) => sum + item.valueDifference, 0)
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calculator className="h-5 w-5" />
            Envanter Sayım Otomasyonu
            <Badge variant="outline">
              {materialType === 'raw' ? 'Hammaddeler' : 
               materialType === 'semi' ? 'Yarı Mamuller' : 'Nihai Ürünler'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="excel-upload">Excel Dosyası Yükle</Label>
              <Input
                id="excel-upload"
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileUpload}
                disabled={processing}
              />
              <p className="text-sm text-muted-foreground mt-1">
                Excel dosyası: kod, ad, sayılan_miktar, birim sütunları olmalı
              </p>
            </div>
            <div className="flex items-end">
              <Button
                onClick={loadCurrentInventory}
                disabled={loading}
                variant="outline"
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Yenile
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary */}
      {inventoryItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Sayım Özeti</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold">{summary.totalItems}</div>
                <div className="text-sm text-muted-foreground">Toplam</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">{summary.matched}</div>
                <div className="text-sm text-muted-foreground">Eşleşti</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{summary.excess}</div>
                <div className="text-sm text-muted-foreground">Fazla</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">{summary.shortage}</div>
                <div className="text-sm text-muted-foreground">Eksik</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">{summary.missing}</div>
                <div className="text-sm text-muted-foreground">Eksik</div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t">
              <div className="flex justify-between items-center">
                <span className="font-medium">Toplam Değer Farkı:</span>
                <span className={`text-lg font-bold ${
                  summary.totalValueDifference >= 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  ₺{summary.totalValueDifference.toFixed(2)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Processing Steps */}
      {step === 'review' && (
        <Card>
          <CardHeader>
            <CardTitle>Sayım Sonuçlarını İncele</CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="mb-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Aşağıdaki sonuçları inceleyin ve gerekirse düzenleyin. 
                Onayladığınızda envanter otomatik olarak güncellenecektir.
              </AlertDescription>
            </Alert>
            
            <div className="space-y-4">
              <div className="flex gap-2">
                <Button onClick={processInventoryUpdates} disabled={processing}>
                  <Save className="h-4 w-4 mr-2" />
                  {processing ? 'İşleniyor...' : 'Güncellemeleri Uygula'}
                </Button>
                <Button onClick={exportResults} variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Sonuçları Export Et
                </Button>
              </div>

              <div className="max-h-96 overflow-y-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Malzeme</TableHead>
                      <TableHead>Mevcut</TableHead>
                      <TableHead>Sayılan</TableHead>
                      <TableHead>Fark</TableHead>
                      <TableHead>Değer Farkı</TableHead>
                      <TableHead>Durum</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {inventoryItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{item.name}</div>
                            <div className="text-sm text-muted-foreground">{item.code}</div>
                          </div>
                        </TableCell>
                        <TableCell>{item.currentQuantity} {item.unit}</TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            value={item.countedQuantity}
                            onChange={(e) => updateCountedQuantity(item.id, parseFloat(e.target.value) || 0)}
                            className="w-20"
                          />
                        </TableCell>
                        <TableCell>
                          <div className={`flex items-center gap-1 ${
                            item.difference > 0 ? 'text-green-600' : 
                            item.difference < 0 ? 'text-red-600' : 'text-gray-600'
                          }`}>
                            {item.difference > 0 ? <TrendingUp className="h-4 w-4" /> : 
                             item.difference < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                            {item.difference > 0 ? '+' : ''}{item.difference}
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className={
                            item.valueDifference >= 0 ? 'text-green-600' : 'text-red-600'
                          }>
                            ₺{item.valueDifference.toFixed(2)}
                          </span>
                        </TableCell>
                        <TableCell>{getStatusBadge(item.status)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Complete Step */}
      {step === 'complete' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-green-600" />
              Envanter Sayım Tamamlandı
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Envanter sayım işlemi başarıyla tamamlandı. 
                Tüm farklar sisteme uygulandı.
              </AlertDescription>
            </Alert>
            
            <div className="mt-4 flex gap-2">
              <Button onClick={() => setStep('upload')} variant="outline">
                Yeni Sayım Başlat
              </Button>
              <Button onClick={exportResults}>
                <Download className="h-4 w-4 mr-2" />
                Sonuçları Export Et
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
