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
import { useAuthStore } from '@/stores/auth-store';

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
  const { user } = useAuthStore();

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
      // Excel dosyasını oku - tarihleri string olarak al
      const workbook = XLSX.read(data, { 
        cellDates: false, // Tarihleri string olarak oku
        cellNF: false,
        cellText: false
      });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      // Excel'den tarihleri raw (number) olarak al ki serial date'leri yakalayabilelim
      const jsonData = XLSX.utils.sheet_to_json(worksheet, {
        raw: true, // Tarihleri raw (number) olarak al - Excel serial date'leri yakalamak için
        defval: '' // Boş hücreler için varsayılan değer
      });

      // Excel serial date'i tarihe çeviren fonksiyon
      const excelSerialToDate = (serial: number): string => {
        // Excel epoch: 1899-12-30 (Excel'de 0 = 1899-12-30)
        // Excel serial date 1 = 1900-01-01
        // Excel'de 1900 yılı artık yıl olarak kabul edilir (yanlış ama Excel'in hatası)
        // Bu yüzden 1 gün çıkarıyoruz: (serial - 1)
        // Excel epoch: 1899-12-30 00:00:00 UTC
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + (serial - 1) * 86400000);
        // YYYY-MM-DD formatında döndür
        const year = date.getUTCFullYear();
        const month = String(date.getUTCMonth() + 1).padStart(2, '0');
        const day = String(date.getUTCDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      const parsedOrders: ImportOrder[] = jsonData.map((row: any) => {
        // Tarih formatını düzelt (Excel'den Date objesi veya serial number gelebilir)
        let deliveryDate = row['Teslim Tarihi'] || '';
        
        if (deliveryDate instanceof Date) {
          // Date objesi ise ISO string'e çevir
          deliveryDate = deliveryDate.toISOString().split('T')[0];
        } else if (typeof deliveryDate === 'number') {
          // Excel serial date number ise Date'e çevir
          deliveryDate = excelSerialToDate(deliveryDate);
        } else if (typeof deliveryDate === 'string') {
          // String ise önce trim yap
          deliveryDate = deliveryDate.trim();
          
          // Eğer sadece sayı içeriyorsa (Excel serial date string olarak gelmiş olabilir)
          const numValue = Number(deliveryDate);
          if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
            // Muhtemelen Excel serial date
            deliveryDate = excelSerialToDate(numValue);
          }
        } else {
          // Diğer durumlarda string'e çevir ve kontrol et
          const strValue = String(deliveryDate || '');
          const numValue = Number(strValue);
          if (!isNaN(numValue) && numValue > 0 && numValue < 1000000) {
            deliveryDate = excelSerialToDate(numValue);
          } else {
            deliveryDate = strValue;
          }
        }

        return {
          customer_name: String(row['Müşteri Adı'] || '').trim(),
          product_code: String(row['Ürün Kodu'] || '').trim(),
          quantity: Number(row['Miktar']) || 0,
          delivery_date: deliveryDate,
          priority: (row['Öncelik'] || 'orta') as 'dusuk' | 'orta' | 'yuksek',
          assigned_operator: String(row['Atanan Operatör'] || '').trim(),
          notes: String(row['Notlar'] || '').trim()
        };
      });

      setImportData(parsedOrders);
      
      // Müşteri sayısını hesapla
      const uniqueCustomers = new Set(parsedOrders.map(o => o.customer_name.toLowerCase().trim()));
      toast.success(`${uniqueCustomers.size} müşteri için ${parsedOrders.length} ürün yüklendi`);
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

    // Müşterilere göre grupla - aynı müşteri için tek sipariş
    const ordersByCustomer = new Map<string, ImportOrder[]>();
    
    for (const order of importData) {
      const customerKey = order.customer_name.toLowerCase().trim();
      if (!ordersByCustomer.has(customerKey)) {
        ordersByCustomer.set(customerKey, []);
      }
      ordersByCustomer.get(customerKey)!.push(order);
    }

    const totalCustomers = ordersByCustomer.size;
    let processedCustomers = 0;

    // Her müşteri için tek bir sipariş oluştur
    for (const [customerKey, customerOrders] of ordersByCustomer.entries()) {
      const firstOrder = customerOrders[0]; // İlk siparişten müşteri bilgilerini al
      
      try {
        if (!user?.id) {
          throw new Error('Kullanıcı kimlik doğrulaması gerekli');
        }

        // Önce müşteriyi bul veya oluştur
        let customerId;
        
        // Önce mevcut müşteriyi ara
        const searchResponse = await fetch(`/api/customers?search=${encodeURIComponent(firstOrder.customer_name)}`, {
          headers: {
            'x-user-id': user.id
          }
        });
        
        if (searchResponse.ok) {
          const searchData = await searchResponse.json();
          if (searchData.data && searchData.data.length > 0) {
            // Müşteri zaten varsa, onu kullan
            customerId = searchData.data[0].id;
          } else {
            // Müşteri yoksa, oluştur
            const customerResponse = await fetch('/api/customers', {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-user-id': user.id
              },
              body: JSON.stringify({
                name: firstOrder.customer_name,
                email: '', // Email opsiyonel, boş bırakabiliriz
                phone: '',
                address: ''
              })
            });

            if (customerResponse.ok) {
              const customerData = await customerResponse.json();
              customerId = customerData.data?.id || customerData.customer?.id;
              if (!customerId) {
                throw new Error('Müşteri oluşturuldu ama ID alınamadı');
              }
            } else {
              const errorData = await customerResponse.json().catch(() => ({ error: 'Bilinmeyen hata' }));
              throw new Error(`Müşteri oluşturulamadı: ${errorData.error || customerResponse.statusText}`);
            }
          }
        } else {
          throw new Error('Müşteri arama hatası');
        }

        // Tüm ürünleri bul ve items array'i oluştur
        const items: Array<{ product_id: string; quantity: number }> = [];
        const productErrors: string[] = [];

        for (const orderItem of customerOrders) {
          // Ürünü bul - önce tam eşleşme, sonra partial search
          const productCode = orderItem.product_code.trim();
          let productResponse = await fetch(`/api/stock/finished?search=${encodeURIComponent(productCode)}&limit=100`, {
            headers: {
              'x-user-id': user.id
            }
          });
          let productData = await productResponse.json();
          
          // Önce tam eşleşme ara
          let product = productData.data?.find((p: any) => 
            p.code?.toLowerCase() === productCode.toLowerCase()
          );
          
          // Tam eşleşme yoksa, ilk sonucu al (partial match)
          if (!product && productData.data && productData.data.length > 0) {
            product = productData.data[0];
          }
          
          // Hala bulunamadıysa, case-insensitive exact match dene
          if (!product && productData.data && productData.data.length > 0) {
            product = productData.data.find((p: any) => 
              p.code && p.code.toLowerCase().includes(productCode.toLowerCase())
            );
          }
          
          if (!product || !product.id) {
            productErrors.push(`Ürün bulunamadı: ${orderItem.product_code}`);
            continue;
          }

          items.push({
            product_id: product.id,
            quantity: Number(orderItem.quantity)
          });
        }

        // Eğer hiç ürün bulunamadıysa, hata ver
        if (items.length === 0) {
          throw new Error(`Hiç ürün bulunamadı. Hatalar: ${productErrors.join(', ')}`);
        }

        // Eğer bazı ürünler bulunamadıysa, uyarı ver ama devam et
        if (productErrors.length > 0) {
          logger.warn(`Bazı ürünler bulunamadı: ${productErrors.join(', ')}`);
        }

        // Operatörü bul (ilk siparişten al, eğer belirtilmişse)
        let assignedOperatorId: string | undefined = undefined;
        if (firstOrder.assigned_operator && firstOrder.assigned_operator.trim() !== '') {
          const operatorResponse = await fetch(`/api/operators?search=${encodeURIComponent(firstOrder.assigned_operator)}`, {
            headers: {
              'x-user-id': user.id
            }
          });
          const operatorData = await operatorResponse.json();
          
          if (operatorData.data && operatorData.data.length > 0) {
            assignedOperatorId = operatorData.data[0].id;
          }
        }

        // Request body hazırla - ilk siparişten tarih ve öncelik bilgilerini al
        // delivery_date'i güvenli şekilde string'e çevir
        // Excel'den Date / sayı da gelebilir (tip string olsa da)
        let deliveryDate: unknown = firstOrder.delivery_date;
        if (deliveryDate instanceof Date) {
          deliveryDate = deliveryDate.toISOString().split('T')[0];
        } else if (typeof deliveryDate === 'string') {
          deliveryDate = deliveryDate.trim();
        } else {
          deliveryDate = String(deliveryDate || '');
        }

        const requestBody: any = {
          customer_name: String(firstOrder.customer_name || '').trim(),
          items: items, // Tüm ürünleri tek siparişe ekle
          delivery_date: deliveryDate,
          priority: firstOrder.priority,
        };
        
        // Opsiyonel alanları ekle (sadece varsa)
        if (customerId) {
          requestBody.customer_id = customerId;
        }
        if (assignedOperatorId) {
          requestBody.assigned_operator_id = assignedOperatorId;
        }

        // Siparişi oluştur
        const orderResponse = await fetch('/api/orders', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-user-id': user.id
          },
          body: JSON.stringify(requestBody)
        });

        if (orderResponse.ok) {
          const orderData = await orderResponse.json();
          const productCodes = customerOrders.map(o => o.product_code).join(', ');
          results.push({
            success: true,
            message: `Sipariş oluşturuldu: ${firstOrder.customer_name} - ${items.length} ürün (${productCodes})`,
            order: orderData.data || orderData.order
          });
        } else {
          const errorData = await orderResponse.json().catch(() => ({ error: 'Bilinmeyen hata' }));
          const errorMessage = errorData.error || errorData.message || `HTTP ${orderResponse.status}: ${orderResponse.statusText}`;
          results.push({
            success: false,
            message: `Sipariş oluşturulamadı: ${firstOrder.customer_name}`,
            errors: Array.isArray(errorData.details) 
              ? errorData.details.map((d: any) => d.message || d.error || String(d))
              : [errorMessage]
          });
        }
      } catch (error: any) {
        results.push({
          success: false,
          message: `Hata: ${firstOrder.customer_name}`,
          errors: [error.message]
        });
      }

      processedCustomers++;
      setImportProgress((processedCustomers / totalCustomers) * 100);
    }

    setImportResults(results);
    setShowResults(true);
    setImporting(false);

    const successCount = results.filter(r => r.success).length;
    const errorCount = results.filter(r => !r.success).length;

    if (successCount > 0) {
      toast.success(`${successCount} müşteri için sipariş başarıyla oluşturuldu`);
      onImportComplete?.();
    }
    if (errorCount > 0) {
      toast.error(`${errorCount} müşteri için sipariş oluşturulamadı`);
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
          {importData.length > 0 && (() => {
            // Müşterilere göre grupla
            const previewGroups = new Map<string, ImportOrder[]>();
            for (const order of importData) {
              const customerKey = order.customer_name.toLowerCase().trim();
              if (!previewGroups.has(customerKey)) {
                previewGroups.set(customerKey, []);
              }
              previewGroups.get(customerKey)!.push(order);
            }
            
            const previewArray = Array.from(previewGroups.entries()).slice(0, 5);
            const totalGroups = previewGroups.size;
            
            return (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">3. Önizleme</CardTitle>
                  <CardDescription>
                    {totalGroups} müşteri için {importData.length} ürün yüklendi
                    <br />
                    <span className="text-xs text-muted-foreground">
                      Aynı müşteriye ait ürünler tek siparişte birleştirilecek
                    </span>
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="max-h-60 overflow-y-auto">
                    <div className="space-y-3">
                      {previewArray.map(([customerKey, orders], index) => (
                        <div key={index} className="p-3 border rounded-lg bg-gray-50">
                          <div className="font-medium text-sm mb-2">{orders[0].customer_name}</div>
                          <div className="space-y-1 ml-2">
                            {orders.slice(0, 3).map((order, orderIndex) => (
                              <div key={orderIndex} className="flex items-center justify-between text-xs">
                                <div>
                                  <span className="text-gray-600">• {order.product_code}</span>
                                  <span className="text-gray-500 ml-2">({order.quantity} adet)</span>
                                </div>
                                <Badge variant={order.priority === 'yuksek' ? 'destructive' : order.priority === 'orta' ? 'default' : 'secondary'} className="text-xs">
                                  {order.priority}
                                </Badge>
                              </div>
                            ))}
                            {orders.length > 3 && (
                              <p className="text-xs text-gray-500 ml-2">
                                ... ve {orders.length - 3} ürün daha
                              </p>
                            )}
                          </div>
                          {orders[0].assigned_operator && (
                            <div className="text-xs text-blue-600 mt-2 ml-2">
                              👤 {orders[0].assigned_operator}
                            </div>
                          )}
                        </div>
                      ))}
                      {totalGroups > 5 && (
                        <p className="text-sm text-gray-500 text-center">
                          ... ve {totalGroups - 5} müşteri daha
                        </p>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })()}

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
                  {importResults.filter(r => r.success).length} müşteri başarılı, {importResults.filter(r => !r.success).length} müşteri hatalı
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
