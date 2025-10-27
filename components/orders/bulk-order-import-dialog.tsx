'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, FileSpreadsheet, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import { logger } from '@/lib/utils/logger';

interface BulkOrderImportDialogProps {
  onImportComplete?: () => void;
}

interface ImportOrder {
  customer_name: string;
  product_code: string;
  quantity: number;
  delivery_date: string;
  priority: 'dusuk' | 'orta' | 'yuksek';
  assigned_operator?: string;
  notes?: string;
}

interface ImportResult {
  success: boolean;
  message: string;
  order?: any;
  errors?: string[];
}

export function BulkOrderImportDialog({ onImportComplete }: BulkOrderImportDialogProps) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [importData, setImportData] = useState<ImportOrder[]>([]);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState<ImportResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const downloadTemplate = () => {
    const templateData = [
      {
        'Müşteri Adı': 'Örnek Müşteri',
        'Ürün Kodu': 'THUNDER-001',
        'Miktar': 10,
        'Teslim Tarihi': '2025-01-15',
        'Öncelik': 'orta',
        'Atanan Operatör': 'Operatör Adı (opsiyonel)',
        'Notlar': 'Örnek not'
      }
    ];

    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Siparişler');
    
    XLSX.writeFile(wb, 'siparis_template.xlsx');
    toast.success('Template dosyası indirildi');
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = event.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      parseExcelFile(selectedFile);
    }
  };

  const parseExcelFile = async (file: File) => {
    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data);
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsedOrders: ImportOrder[] = jsonData.map((row: any) => ({
        customer_name: row['Müşteri Adı'] || '',
        product_code: row['Ürün Kodu'] || '',
        quantity: Number(row['Miktar']) || 0,
        delivery_date: row['Teslim Tarihi'] || '',
        priority: (row['Öncelik'] || 'orta') as 'dusuk' | 'orta' | 'yuksek',
        assigned_operator: row['Atanan Operatör'] || '',
        notes: row['Notlar'] || ''
      }));

      setImportData(parsedOrders);
      toast.success(`${parsedOrders.length} sipariş yüklendi`);
    } catch (error) {
      toast.error('Excel dosyası okunamadı');
      logger.error('Excel parse error:', error);
    }
  };

  const validateImportData = (): string[] => {
    const errors: string[] = [];
    
    importData.forEach((order, index) => {
      if (!order.customer_name) {
        errors.push(`Satır ${index + 2}: Müşteri adı gerekli`);
      }
      if (!order.product_code) {
        errors.push(`Satır ${index + 2}: Ürün kodu gerekli`);
      }
      if (!order.quantity || order.quantity <= 0) {
        errors.push(`Satır ${index + 2}: Geçerli miktar gerekli`);
      }
      if (!order.delivery_date) {
        errors.push(`Satır ${index + 2}: Teslim tarihi gerekli`);
      }
      if (!['dusuk', 'orta', 'yuksek'].includes(order.priority)) {
        errors.push(`Satır ${index + 2}: Geçerli öncelik gerekli (dusuk/orta/yuksek)`);
      }
    });

    return errors;
  };

  const handleImport = async () => {
    const validationErrors = validateImportData();
    if (validationErrors.length > 0) {
      toast.error(`${validationErrors.length} hata bulundu`);
      setImportResults(validationErrors.map(error => ({
        success: false,
        message: error,
        errors: [error]
      })));
      setShowResults(true);
      return;
    }

    setImporting(true);
    setImportProgress(0);
    const results: ImportResult[] = [];

    for (let i = 0; i < importData.length; i++) {
      const order = importData[i];
      
      try {
        // Önce müşteriyi bul veya oluştur
        const customerResponse = await fetch('/api/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: order.customer_name,
            email: `${order.customer_name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            phone: '',
            address: ''
          })
        });

        let customerId;
        if (customerResponse.ok) {
          const customerData = await customerResponse.json();
          customerId = customerData.data.id;
        } else {
          // Müşteri zaten varsa, mevcut müşteriyi bul
          const searchResponse = await fetch(`/api/customers?search=${encodeURIComponent(order.customer_name)}`);
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            customerId = searchData.data[0].id;
          } else {
            throw new Error('Müşteri oluşturulamadı');
          }
        }

        // Ürünü bul
        const productResponse = await fetch(`/api/stock/finished?search=${encodeURIComponent(order.product_code)}`);
        const productData = await productResponse.json();
        
        if (!productData.data || productData.data.length === 0) {
          throw new Error(`Ürün bulunamadı: ${order.product_code}`);
        }

        const product = productData.data[0];

        // Operatörü bul (eğer belirtilmişse)
        let assignedOperatorId = undefined;
        if (order.assigned_operator) {
          const operatorResponse = await fetch(`/api/operators?search=${encodeURIComponent(order.assigned_operator)}`);
          const operatorData = await operatorResponse.json();
          
          if (operatorData.data && operatorData.data.length > 0) {
            assignedOperatorId = operatorData.data[0].id;
          }
        }

        // Siparişi oluştur
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customer_name: order.customer_name,
            customer_id: customerId,
            items: [{
              product_id: product.id,
              quantity: order.quantity
            }],
            delivery_date: order.delivery_date,
            priority: order.priority,
            assigned_operator_id: assignedOperatorId,
            notes: order.notes
          })
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          results.push({
            success: true,
            message: `Sipariş oluşturuldu: ${order.customer_name} - ${order.product_code}`,
            order: orderData.data
          });
        } else {
          const errorData = await orderResponse.json();
          results.push({
            success: false,
            message: `Sipariş oluşturulamadı: ${order.customer_name}`,
            errors: [errorData.error]
          });
        }
      } catch (error: any) {
        results.push({
          success: false,
          message: `Hata: ${order.customer_name}`,
          errors: [error.message]
        });
      }

      setImportProgress(((i + 1) / importData.length) * 100);
    }

    setImportResults(results);
    setShowResults(true);
    setImporting(false);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount} sipariş başarıyla oluşturuldu`);
      onImportComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} sipariş oluşturulamadı`);
    }
  };

  const resetDialog = () => {
    setFile(null);
    setImportData([]);
    setImportResults([]);
    setShowResults(false);
    setImportProgress(0);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetDialog();
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="h-4 w-4 mr-2" />
          Excel İçe Aktar
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Toplu Sipariş İçe Aktarma</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Template İndirme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">1. Template İndir</CardTitle>
              <CardDescription>
                Önce template dosyasını indirip doldurun
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={downloadTemplate} variant="outline">
                <Download className="h-4 w-4 mr-2" />
                Template İndir (.xlsx)
              </Button>
            </CardContent>
          </Card>

          {/* Dosya Yükleme */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">2. Excel Dosyası Yükle</CardTitle>
              <CardDescription>
                Doldurduğunuz Excel dosyasını seçin
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
                <Button
                  onClick={() => fileInputRef.current?.click()}
                  variant="outline"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Dosya Seç
                </Button>
                {file && (
                  <p className="mt-2 text-sm text-gray-600">
                    Seçilen dosya: {file.name}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Önizleme */}
          {importData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">3. Önizleme</CardTitle>
                <CardDescription>
                  {importData.length} sipariş yüklendi
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {importData.slice(0, 5).map((order, index) => (
                      <div key={index} className="flex items-center justify-between p-2 border rounded">
                        <div>
                          <span className="font-medium">{order.customer_name}</span>
                          <span className="text-gray-500 ml-2">- {order.product_code}</span>
                          <span className="text-gray-500 ml-2">({order.quantity} adet)</span>
                          {order.assigned_operator && (
                            <span className="text-blue-600 ml-2">👤 {order.assigned_operator}</span>
                          )}
                        </div>
                        <Badge variant={order.priority === 'yuksek' ? 'destructive' : order.priority === 'orta' ? 'default' : 'secondary'}>
                          {order.priority}
                        </Badge>
                      </div>
                    ))}
                    {importData.length > 5 && (
                      <p className="text-sm text-gray-500 text-center">
                        ... ve {importData.length - 5} sipariş daha
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* İçe Aktarma */}
          {importData.length > 0 && !showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">4. İçe Aktar</CardTitle>
                <CardDescription>
                  Siparişleri sisteme aktarın
                </CardDescription>
              </CardHeader>
              <CardContent>
                {importing && (
                  <div className="space-y-2">
                    <Progress value={importProgress} />
                    <p className="text-sm text-center">İçe aktarılıyor... %{Math.round(importProgress)}</p>
                  </div>
                )}
                <div className="flex gap-2">
                  <Button
                    onClick={handleImport}
                    disabled={importing}
                    className="flex-1"
                  >
                    {importing ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
                  </Button>
                  <Button
                    onClick={resetDialog}
                    variant="outline"
                    disabled={importing}
                  >
                    Sıfırla
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Sonuçlar */}
          {showResults && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">İçe Aktarma Sonuçları</CardTitle>
                <CardDescription>
                  {importResults.filter(r => r.success).length} başarılı, {importResults.filter(r => !r.success).length} hatalı
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {importResults.map((result, index) => (
                    <Alert key={index} variant={result.success ? 'default' : 'destructive'}>
                      <div className="flex items-center">
                        {result.success ? (
                          <CheckCircle className="h-4 w-4 mr-2" />
                        ) : (
                          <XCircle className="h-4 w-4 mr-2" />
                        )}
                        <AlertDescription>
                          {result.message}
                          {result.errors && result.errors.length > 0 && (
                            <ul className="mt-1 text-xs">
                              {result.errors.map((error, i) => (
                                <li key={i}>• {error}</li>
                              ))}
                            </ul>
                          )}
                        </AlertDescription>
                      </div>
                    </Alert>
                  ))}
                </div>
                <div className="flex gap-2 mt-4">
                  <Button onClick={handleClose} className="flex-1">
                    Tamam
                  </Button>
                  <Button onClick={resetDialog} variant="outline">
                    Yeni İçe Aktarma
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
