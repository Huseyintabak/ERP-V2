'use client';

import { useState, useEffect } from 'react';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  PackagePlus,
  ArrowLeft,
  Camera,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  Search,
  Plus,
  Package,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { scanSuccess, scanError, transferSuccess } from '@/lib/utils/feedback';

interface Product {
  id: string;
  code: string;
  name: string;
  barcode: string;
  quantity: number;
  unit?: string;
  material_type: 'raw' | 'semi' | 'finished';
  material_type_label: string;
}

interface EntryItem {
  product: Product;
  quantity: number;
}

export default function StokGirisPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [centerZoneId, setCenterZoneId] = useState<string>('');

  // Entry items
  const [entryItems, setEntryItems] = useState<EntryItem[]>([]);

  // Manual product selection
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [products, setProducts] = useState<Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCenterZone();
    fetchProducts();
  }, []);

  const fetchCenterZone = async () => {
    try {
      const response = await fetch('/api/warehouse/zones');
      if (response.ok) {
        const data = await response.json();
        const centerZone = data.data?.find((z: any) => z.zone_type === 'center');
        if (centerZone) {
          setCenterZoneId(centerZone.id);
        } else {
          toast.error('Merkez zone bulunamadı');
        }
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const fetchProducts = async () => {
    try {
      // Fetch only raw materials for stock entry
      const response = await fetch('/api/products/raw-materials');

      if (response.ok) {
        const data = await response.json();
        const rawMaterials = (data.data || []).map((p: any) => ({
          ...p,
          material_type: 'raw' as const,
          material_type_label: 'Hammadde',
        }));
        setProducts(rawMaterials);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };

  const handleScan = async (barcode: string) => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);

      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          scanError();
          toast.error(data.message || 'Barkod bulunamadı');
          return;
        }
        throw new Error('Barkod sorgulanamadı');
      }

      const data = await response.json();

      if (data.found && data.product) {
        addProduct(data.product);
        scanSuccess();
      } else {
        scanError();
        toast.error('Ürün bulunamadı');
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      scanError();
      toast.error('Barkod tarama hatası');
    } finally {
      setIsLoading(false);
    }
  };

  const addProduct = (product: Product) => {
    const existingIndex = entryItems.findIndex(
      (item) => item.product.id === product.id
    );

    if (existingIndex >= 0) {
      // Increment quantity
      const newItems = [...entryItems];
      newItems[existingIndex].quantity += 1;
      setEntryItems(newItems);
      toast.success(`${product.name} miktarı: ${newItems[existingIndex].quantity}`);
    } else {
      // Add new item
      setEntryItems([...entryItems, { product, quantity: 1 }]);
      toast.success(`${product.name} listeye eklendi`);
    }
  };

  const removeItem = (index: number) => {
    setEntryItems((prev) => prev.filter((_, i) => i !== index));
    toast.info('Ürün listeden kaldırıldı');
  };

  const updateQuantity = (index: number, quantity: number) => {
    if (quantity < 1) return;
    setEntryItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity } : item))
    );
  };

  const handleStockEntry = async () => {
    if (entryItems.length === 0) {
      toast.error('Lütfen en az bir ürün ekleyin');
      return;
    }

    if (!centerZoneId) {
      toast.error('Merkez zone bulunamadı');
      return;
    }

    setIsProcessing(true);

    try {
      let successCount = 0;
      let failCount = 0;

      for (const item of entryItems) {
        try {
          const response = await fetch('/api/warehouse/stock-entry', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              productId: item.product.id,
              zoneId: centerZoneId,
              quantity: item.quantity,
              material_type: item.product.material_type,
            }),
          });

          if (response.ok) {
            successCount++;
          } else {
            failCount++;
            const errorData = await response.json();
            console.error('Stock entry failed:', errorData);
          }
        } catch (error) {
          failCount++;
          console.error('Stock entry error:', error);
        }
      }

      if (successCount > 0) {
        transferSuccess();
        toast.success(`${successCount} ürün başarıyla merkez stoğa eklendi! 🎉`);
      }

      if (failCount > 0) {
        toast.error(`${failCount} ürün eklenemedi`);
      }

      // Clear list if all successful
      if (failCount === 0) {
        setEntryItems([]);
      }
    } catch (error) {
      console.error('Batch stock entry error:', error);
      scanError();
      toast.error('Stok giriş hatası');
    } finally {
      setIsProcessing(false);
    }
  };

  const clearAll = () => {
    setEntryItems([]);
    toast.info('Liste temizlendi');
  };

  const typeMap: Record<string, { label: string; color: string }> = {
    raw: { label: 'Hammadde', color: 'bg-blue-100 text-blue-700' },
    semi: { label: 'Yarı Mamul', color: 'bg-purple-100 text-purple-700' },
    finished: { label: 'Mamul', color: 'bg-green-100 text-green-700' },
  };

  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      product.barcode?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-500 to-green-600 text-white p-4 sticky top-0 z-10 shadow-lg">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.back()}
            className="text-white hover:bg-white/20 -ml-2"
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-bold">Stok Giriş</h1>
            <p className="text-green-100 text-xs mt-0.5">
              Merkez Depo - {entryItems.length} ürün
            </p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <Button
            onClick={() => setShowScanner(!showScanner)}
            variant={showScanner ? 'default' : 'outline'}
            className="h-16"
          >
            <Camera className="h-5 w-5 mr-2" />
            {showScanner ? 'Kamerayı Kapat' : 'Barkod Tara'}
          </Button>

          <Dialog open={showProductDialog} onOpenChange={setShowProductDialog}>
            <DialogTrigger asChild>
              <Button variant="outline" className="h-16">
                <Plus className="h-5 w-5 mr-2" />
                Manuel Ekle
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col p-0">
              <DialogHeader className="px-6 pt-6 pb-4">
                <DialogTitle className="text-xl">Malzeme Seç</DialogTitle>
              </DialogHeader>
              <div className="flex-1 overflow-hidden flex flex-col">
                {/* Search */}
                <div className="px-6 pb-4">
                  <div className="relative">
                    <Search className="absolute left-4 top-4 h-5 w-5 text-gray-400" />
                    <Input
                      placeholder="Malzeme adı veya kodu ile ara..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-12 h-14 text-base bg-gray-50 border-gray-200"
                    />
                  </div>
                </div>

                {/* Product List */}
                <div className="flex-1 overflow-y-auto min-h-0 border-t border-gray-200">
                  {filteredProducts.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <Package className="h-16 w-16 mx-auto mb-3 opacity-20" />
                      <p className="text-sm">Ürün bulunamadı</p>
                    </div>
                  ) : (
                    filteredProducts.map((product) => (
                      <button
                        key={product.id}
                        onClick={() => {
                          addProduct(product);
                          setShowProductDialog(false);
                          setSearchTerm('');
                        }}
                        className="w-full px-6 py-4 hover:bg-gray-50 text-left transition-colors border-b border-gray-100 last:border-b-0"
                      >
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-semibold text-base text-gray-900 truncate">
                              {product.name}
                            </h4>
                            <p className="text-sm text-gray-500 mt-0.5">
                              {product.code}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <span className="text-sm text-gray-600">
                              {product.quantity} {product.unit || 'adet'}
                            </span>
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Scanner */}
        {showScanner && (
          <Card className="border-0 shadow-lg overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <Camera className="h-5 w-5 text-green-600" />
                Barkod Tarayıcı
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <BarcodeScanner onScan={handleScan} />
            </CardContent>
          </Card>
        )}

        {/* Entry Items List */}
        {entryItems.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Package className="h-5 w-5 text-blue-600" />
                  Giriş Yapılacak Ürünler
                </CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary" className="text-sm">
                    {entryItems.length} ürün
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearAll}
                    className="h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    Temizle
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {entryItems.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 space-y-3"
                >
                  {/* Product Info */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-sm">{item.product.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="outline" className="text-xs">
                          {item.product.code}
                        </Badge>
                        <Badge
                          className={`text-xs ${
                            typeMap[item.product.material_type]?.color || 'bg-gray-100'
                          }`}
                        >
                          {item.product.material_type_label}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeItem(index)}
                      className="h-8 w-8 p-0 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>

                  {/* Quantity Input */}
                  <div className="flex items-center gap-2">
                    <Label className="text-xs text-gray-600 w-16">Miktar:</Label>
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        updateQuantity(index, parseInt(e.target.value) || 1)
                      }
                      className="h-9 w-24 text-sm"
                      min="1"
                    />
                    <span className="text-xs text-gray-500">
                      {item.product.unit || 'adet'}
                    </span>
                  </div>

                  {/* Current Stock */}
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span>Mevcut Stok:</span>
                    <Badge variant="secondary" className="text-xs">
                      {item.product.quantity} {item.product.unit || 'adet'}
                    </Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Submit Section */}
        {entryItems.length > 0 && (
          <Card className="border-0 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b">
              <CardTitle className="text-lg flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Stok Giriş Onayı
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {/* Zone Info */}
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-600" />
                  <p className="text-sm text-blue-800 font-medium">
                    Tüm ürünler <strong>Merkez Depo</strong>'ya eklenecek
                  </p>
                </div>
              </div>

              {/* Summary */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Toplam Ürün Çeşidi:</span>
                  <span className="font-semibold">{entryItems.length}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Toplam Adet:</span>
                  <span className="font-semibold">
                    {entryItems.reduce((sum, item) => sum + item.quantity, 0)}
                  </span>
                </div>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleStockEntry}
                disabled={isProcessing}
                className="w-full h-12 bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-base font-semibold"
                size="lg"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <PackagePlus className="h-5 w-5 mr-2" />
                    Merkez Depoya Ekle
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {entryItems.length === 0 && !showScanner && (
          <Card className="border-0 shadow-lg">
            <CardContent className="p-8 text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <PackagePlus className="h-8 w-8 text-green-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Stok Girişi Başlat
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Barkod tarayarak veya manuel olarak ürün ekleyip merkez depoya stok girişi yapabilirsiniz
              </p>
              <div className="flex flex-col gap-2 max-w-xs mx-auto">
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Barkodlu ürünler için kamera ile tarama</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Barkod olmayan ürünler için manuel seçim</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <span>Otomatik merkez depo ataması</span>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
