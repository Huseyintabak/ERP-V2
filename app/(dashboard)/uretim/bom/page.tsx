'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Trash2, 
  Package,
  TreePine,
  Upload,
  Download,
  Eye,
  Edit,
  Calculator
} from 'lucide-react';
import { toast } from 'sonner';
import { CostCalculationDialog } from '@/components/pricing/cost-calculation-dialog';

interface Product {
  id: string;
  name: string;
  code: string;
  unit: string;
  sale_price?: number;
  unit_cost?: number;
  product_type: 'finished' | 'semi'; // Ürün tipi
}

interface FinishedProduct {
  id: string;
  name: string;
  code: string;
  unit: string;
  sale_price: number;
}

interface BOMEntry {
  id: string;
  material_type: 'raw' | 'semi';
  material_id: string;
  quantity_needed: number;
  material: {
    id: string;
    name: string;
    code: string;
    unit: string;
    unit_price?: number;
    unit_cost?: number;
  };
}

interface BOMData {
  product: FinishedProduct;
  materials: BOMEntry[];
}

interface RawMaterial {
  id: string;
  name: string;
  code: string;
  unit: string;
  unit_price: number;
}

interface SemiFinishedProduct {
  id: string;
  name: string;
  code: string;
  unit: string;
  unit_cost: number;
}

export default function BOMPage() {
  const [allProducts, setAllProducts] = useState<Product[]>([]); // Nihai + Yarı mamul birlikte
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [semiFinishedProducts, setSemiFinishedProducts] = useState<SemiFinishedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [bomData, setBomData] = useState<BOMData | null>(null);
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  // Yeni BOM entry form state - array olarak değiştir
  const [newBOMEntries, setNewBOMEntries] = useState<Array<{
    material_type: 'raw' | 'semi';
    material_id: string;
    quantity_needed: number;
  }>>([{
    material_type: 'raw',
    material_id: '',
    quantity_needed: 1,
  }]);

  useEffect(() => {
    fetchFinishedProducts();
    fetchRawMaterials();
    fetchSemiFinishedProducts();
  }, []);

  // Nihai + Yarı mamulleri birleştir
  useEffect(() => {
    const combined: Product[] = [
      ...finishedProducts.map(p => ({
        ...p,
        product_type: 'finished' as const,
        unit_cost: p.sale_price
      })),
      ...semiFinishedProducts.map(p => ({
        ...p,
        product_type: 'semi' as const,
        sale_price: p.unit_cost
      }))
    ];
    setAllProducts(combined);
  }, [finishedProducts, semiFinishedProducts]);

  const fetchFinishedProducts = async () => {
    try {
      const response = await fetch('/api/stock/finished?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      setFinishedProducts(result.data || []);
    } catch (error) {
      console.error('Error fetching finished products:', error);
      toast.error('Nihai ürünler yüklenirken hata oluştu');
    }
  };

  const fetchRawMaterials = async () => {
    try {
      setMaterialsLoading(true);
      const response = await fetch('/api/stock/raw?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      console.log('Raw materials fetched:', result.data?.length || 0);
      setRawMaterials(result.data || []);
    } catch (error) {
      console.error('Error fetching raw materials:', error);
      toast.error('Hammaddeler yüklenirken hata oluştu');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const fetchSemiFinishedProducts = async () => {
    try {
      setMaterialsLoading(true);
      const response = await fetch('/api/stock/semi?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const text = await response.text();
      if (!text || text.includes('/login')) {
        console.warn('Redirect to login detected');
        return;
      }
      
      const result = JSON.parse(text);
      console.log('Semi-finished products fetched:', result.data?.length || 0);
      setSemiFinishedProducts(result.data || []);
    } catch (error) {
      console.error('Error fetching semi-finished products:', error);
      toast.error('Yarı mamuller yüklenirken hata oluştu');
    } finally {
      setMaterialsLoading(false);
    }
  };

  const fetchBOMData = async (productId: string) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/bom/${productId}`, {
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (!response.ok) {
        if (response.status === 404) {
          // BOM yoksa boş data döndür
          const product = allProducts.find(p => p.id === productId);
          if (product) {
            setBomData({
              product: {
                id: product.id,
                name: product.name,
                code: product.code,
                unit: product.unit,
                sale_price: product.sale_price || product.unit_cost || 0
              },
              materials: [],
            });
          }
          return;
        }
        
        // Response text olarak oku
        const errorText = await response.text();
        console.error('BOM fetch error:', errorText);
        
        // Eğer login redirect'i ise
        if (errorText.includes('/login') || response.status === 401) {
          toast.error('Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.');
          return;
        }
        
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      setBomData(result);
    } catch (error) {
      console.error('Error fetching BOM data:', error);
      toast.error(error instanceof Error ? error.message : 'BOM verileri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleProductSelect = (productId: string) => {
    const product = allProducts.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      fetchBOMData(productId);
      
      // Yarı mamul seçiliyse, newBOMEntries'i sadece hammadde olarak resetle
      if (product.product_type === 'semi') {
        setNewBOMEntries([{
          material_type: 'raw',
          material_id: '',
          quantity_needed: 1,
        }]);
      }
    }
  };

  // Malzeme ekleme fonksiyonu
  const addBOMEntry = () => {
    setNewBOMEntries(prev => [...prev, {
      material_type: 'raw',
      material_id: '',
      quantity_needed: 1,
    }]);
  };

  // Malzeme silme fonksiyonu
  const removeBOMEntry = (index: number) => {
    if (newBOMEntries.length > 1) {
      setNewBOMEntries(prev => prev.filter((_, i) => i !== index));
    }
  };

  // Malzeme güncelleme fonksiyonu
  const updateBOMEntry = (index: number, field: string, value: any) => {
    setNewBOMEntries(prev => prev.map((entry, i) => 
      i === index ? { ...entry, [field]: value } : entry
    ));
  };

  // Otomatik maliyet hesaplama
  const autoCalculateCost = async (productId: string) => {
    try {
      console.log('🔄 Otomatik maliyet hesaplanıyor...');
      
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Maliyet otomatik güncellendi:', result.calculation.total_cost);
        toast.success('Maliyet otomatik güncellendi', { duration: 2000 });
      }
    } catch (error) {
      console.warn('Otomatik maliyet hesaplama hatası:', error);
      // Silent fail - kullanıcıyı rahatsız etme
    }
  };

  // Toplu maliyet hesaplama
  const handleCalculateAllCosts = async () => {
    if (!confirm('Tüm BOM\'u olan ürünlerin maliyetlerini hesaplamak istiyor musunuz?\n\nBu işlem birkaç dakika sürebilir.')) {
      return;
    }

    try {
      toast.info('Toplu maliyet hesaplama başlatılıyor...');
      
      const response = await fetch('/api/pricing/calculate-all', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Toplu hesaplama hatası');
      }

      toast.success(result.message);
      
      // Show errors if any
      if (result.stats.failed > 0) {
        console.warn('⚠️ Toplu hesaplama hataları:', result.stats.errors);
        toast.warning(`${result.stats.failed} ürün hesaplanamadı. Konsolu kontrol edin.`);
      }

      // Refresh product lists to show updated costs
      await fetchFinishedProducts();
      await fetchSemiFinishedProducts();
      
      // Refresh current product if selected
      if (selectedProduct) {
        fetchBOMData(selectedProduct.id);
      }
    } catch (error: any) {
      console.error('❌ Bulk calculation error:', error);
      toast.error(error.message || 'Toplu hesaplama hatası');
    }
  };

  const handleAddBOMEntries = async () => {
    if (!selectedProduct) {
      toast.error('Lütfen bir ürün seçin');
      return;
    }

    // Validation
    const invalidEntries = newBOMEntries.filter(entry => 
      !entry.material_id || entry.quantity_needed <= 0
    );

    if (invalidEntries.length > 0) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      // Her malzeme için ayrı ayrı API çağrısı yap
      const promises = newBOMEntries.map(entry => 
        fetch('/api/bom', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            finished_product_id: selectedProduct.id,
            product_type: selectedProduct.product_type, // Ürün tipini ekle
            material_type: entry.material_type,
            material_id: entry.material_id,
            quantity_needed: entry.quantity_needed,
          }),
        })
      );

      const responses = await Promise.all(promises);
      const errors = responses.filter(response => !response.ok);

      if (errors.length > 0) {
        throw new Error(`${errors.length} malzeme eklenirken hata oluştu`);
      }

      toast.success(`${newBOMEntries.length} malzeme başarıyla eklendi`);
      setIsAddDialogOpen(false);
      setNewBOMEntries([{
        material_type: 'raw',
        material_id: '',
        quantity_needed: 1,
      }]);
      
      // BOM verilerini yenile
      if (selectedProduct) {
        await fetchBOMData(selectedProduct.id);
        
        // Otomatik maliyet hesapla
        await autoCalculateCost(selectedProduct.id);
      }
    } catch (error: any) {
      console.error('Error adding BOM entries:', error);
      toast.error(error.message || 'BOM kayıtları eklenirken hata oluştu');
    }
  };

  const handleDeleteBOMEntry = async (bomId: string) => {
    if (!confirm('Bu BOM kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      const response = await fetch(`/api/bom?id=${bomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('/login')) {
          console.warn('Redirect to login detected');
          return;
        }
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'Failed to delete BOM entry');
      }

      toast.success('BOM kaydı başarıyla silindi');
      
      // BOM verilerini yenile
      if (selectedProduct) {
        await fetchBOMData(selectedProduct.id);
        
        // Otomatik maliyet hesapla
        await autoCalculateCost(selectedProduct.id);
      }
    } catch (error: any) {
      console.error('Error deleting BOM entry:', error);
      toast.error(error.message || 'BOM kaydı silinirken hata oluştu');
    }
  };

  const handleExportBOM = async () => {
    try {
      const response = await fetch('/api/bom/export');
      
      if (!response.ok) {
        throw new Error('Export failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `bom_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('BOM export edildi');
    } catch (error: unknown) {
      console.error('Export error:', error);
      toast.error('Export hatası');
    }
  };

  const handleImportBOM = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    
    console.log('📥 Import file selected:', file?.name);
    
    if (!file) {
      console.log('❌ No file selected');
      return;
    }

    // Validate file extension
    if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      toast.error('Sadece Excel dosyaları (.xlsx, .xls) yüklenebilir');
      event.target.value = '';
      return;
    }

    try {
      console.log('🚀 Starting import...');
      toast.info('Import işlemi başlatılıyor...');

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bom/import', {
        method: 'POST',
        body: formData,
      });

      console.log('📡 Response status:', response.status);
      const result = await response.json();
      console.log('📦 Response data:', result);

      if (!response.ok) {
        throw new Error(result.error || 'Import hatası');
      }

      toast.success(result.message || 'BOM import başarılı');
      
      // Show errors if any
      if (result.errors && result.errors.length > 0) {
        console.warn('⚠️ Import warnings:', result.errors);
        toast.warning(`${result.stats.errors} satırda hata oluştu. Konsolu kontrol edin.`);
      }

      // Refresh current product's BOM if selected
      if (selectedProduct) {
        console.log('🔄 Refreshing BOM data...');
        await fetchBOMData(selectedProduct.id);
        
        // Otomatik maliyet hesapla
        await autoCalculateCost(selectedProduct.id);
      }

      event.target.value = ''; // Reset file input
    } catch (error: any) {
      console.error('❌ Import error:', error);
      toast.error(error.message || 'Import hatası');
      event.target.value = ''; // Reset file input
    }
  };

  const getMaterialOptions = (materialType: 'raw' | 'semi') => {
    console.log('getMaterialOptions called:', {
      material_type: materialType,
      rawMaterials: rawMaterials.length,
      semiFinishedProducts: semiFinishedProducts.length
    });
    
    if (materialType === 'raw') {
      return rawMaterials.map(material => ({
        id: material.id,
        name: material.name,
        code: material.code,
      }));
    } else {
      return semiFinishedProducts.map(material => ({
        id: material.id,
        name: material.name,
        code: material.code,
      }));
    }
  };

  const filteredProducts = allProducts.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">BOM Yönetimi</h1>
          <p className="text-muted-foreground">Ürün Ağacı (Bill of Materials) yönetimi</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={() => {
              const link = document.createElement('a');
              link.href = '/bom-sample-data.xlsx';
              link.download = 'bom-sample-data.xlsx';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
              toast.success('Sample Excel dosyası indirildi');
            }}
          >
            <Download className="h-4 w-4 mr-2" />
            Sample Excel
          </Button>
          <div>
            <input
              ref={(input) => {
                if (input) {
                  (window as any).bomImportInput = input;
                }
              }}
              type="file"
              accept=".xlsx,.xls"
              onChange={handleImportBOM}
              style={{ display: 'none' }}
              id="bom-import-input"
            />
            <Button
              variant="outline"
              onClick={() => {
                const input = document.getElementById('bom-import-input') as HTMLInputElement;
                input?.click();
              }}
            >
              <Upload className="h-4 w-4 mr-2" />
              Excel Import
            </Button>
          </div>
          <Button 
            variant="outline"
            onClick={handleExportBOM}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel Export
          </Button>
          <Button 
            variant="default"
            onClick={handleCalculateAllCosts}
            className="bg-green-600 hover:bg-green-700"
          >
            <Calculator className="h-4 w-4 mr-2" />
            Tüm Maliyetleri Hesapla
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ürün Seçimi */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Ürünler (Nihai + Yarı Mamul)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="space-y-2 max-h-96 overflow-y-auto">
                {filteredProducts.map((product) => (
                  <div
                    key={product.id}
                    className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                      selectedProduct?.id === product.id
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => handleProductSelect(product.id)}
                  >
                    <div className="flex items-center gap-2">
                      <div className="font-medium">{product.name}</div>
                      <Badge variant={product.product_type === 'finished' ? 'default' : 'secondary'} className="text-xs">
                        {product.product_type === 'finished' ? 'Nihai' : 'Yarı'}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {product.code} • {product.unit}
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      ₺{(product.sale_price || product.unit_cost || 0).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* BOM Detayları */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <TreePine className="h-5 w-5 mr-2" />
                Ürün Ağacı
                {selectedProduct && (
                  <span className="ml-2 text-lg font-normal text-muted-foreground">
                    - {selectedProduct.name}
                    <Badge variant={selectedProduct.product_type === 'finished' ? 'default' : 'secondary'} className="ml-2">
                      {selectedProduct.product_type === 'finished' ? 'Nihai' : 'Yarı Mamul'}
                    </Badge>
                  </span>
                )}
              </CardTitle>
              {selectedProduct && (
                <div className="flex gap-2">
                  <CostCalculationDialog
                    productId={selectedProduct.id}
                    productCode={selectedProduct.code}
                    productName={selectedProduct.name}
                    currentSalePrice={selectedProduct.sale_price || selectedProduct.unit_cost || 0}
                    trigger={
                      <Button variant="outline" size="sm">
                        <Calculator className="h-4 w-4 mr-2" />
                        Maliyet Hesapla
                      </Button>
                    }
                  />
                  <Button
                    onClick={() => setIsAddDialogOpen(true)}
                    size="sm"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Malzeme Ekle
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {!selectedProduct ? (
              <div className="text-center py-12 text-muted-foreground">
                <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>BOM görüntülemek için bir ürün seçin</p>
              </div>
            ) : loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="mt-2 text-muted-foreground">Yükleniyor...</p>
              </div>
            ) : !bomData || bomData.materials.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <TreePine className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>Bu ürün için BOM tanımlanmamış</p>
                <Button
                  className="mt-4"
                  onClick={() => setIsAddDialogOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Malzemeyi Ekle
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Toplam Maliyet Hesaplama */}
                <div className="bg-muted/50 p-4 rounded-lg">
                  <div className="flex justify-between items-center">
                    <span className="font-medium">Toplam Maliyet:</span>
                    <span className="text-lg font-bold text-green-600">
                      ₺{bomData.materials.reduce((total, entry) => {
                        const unitPrice = entry.material.unit_price || entry.material.unit_cost || 0;
                        return total + (unitPrice * entry.quantity_needed);
                      }, 0).toFixed(2)}
                    </span>
                  </div>
                </div>

                {/* BOM Tablosu */}
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Malzeme Tipi</TableHead>
                        <TableHead>Malzeme</TableHead>
                        <TableHead>Miktar</TableHead>
                        <TableHead>Birim Fiyat</TableHead>
                        <TableHead>Toplam</TableHead>
                        <TableHead>İşlemler</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {bomData.materials.map((entry) => (
                        <TableRow key={entry.id}>
                          <TableCell>
                            <Badge variant={entry.material_type === 'raw' ? 'default' : 'secondary'}>
                              {entry.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div>
                              <div className="font-medium">{entry.material.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {entry.material.code} • {entry.material.unit}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>{entry.quantity_needed}</TableCell>
                          <TableCell>
                            ₺{((entry.material.unit_price || entry.material.unit_cost) || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="font-medium">
                            ₺{(((entry.material.unit_price || entry.material.unit_cost) || 0) * entry.quantity_needed).toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteBOMEntry(entry.id)}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Malzeme Ekleme Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="max-w-[calc(7xl+50px)] max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>BOM Malzemeleri Ekle</DialogTitle>
            {selectedProduct && (
              <p className="text-sm text-muted-foreground">
                {selectedProduct.code} - {selectedProduct.name}
                <Badge variant={selectedProduct.product_type === 'finished' ? 'default' : 'secondary'} className="ml-2">
                  {selectedProduct.product_type === 'finished' ? 'Nihai Ürün' : 'Yarı Mamul'}
                </Badge>
              </p>
            )}
          </DialogHeader>
          <div className="space-y-6">
            {/* Malzeme Listesi */}
            <div className="space-y-4">
              {newBOMEntries.map((entry, index) => (
                <div key={index} className="border rounded-lg p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Malzeme {index + 1}</h4>
                    {newBOMEntries.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeBOMEntry(index)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
                    <div>
                      <label className="text-sm font-medium">Malzeme Tipi</label>
                      <Select
                        value={entry.material_type}
                        onValueChange={(value: 'raw' | 'semi') => {
                          updateBOMEntry(index, 'material_type', value);
                          updateBOMEntry(index, 'material_id', '');
                        }}
                        disabled={selectedProduct?.product_type === 'semi'}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw">Hammadde</SelectItem>
                          {selectedProduct?.product_type === 'finished' && (
                            <SelectItem value="semi">Yarı Mamul</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                      {selectedProduct?.product_type === 'semi' && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Yarı mamul ürünlere sadece hammadde eklenebilir
                        </p>
                      )}
                    </div>

                    <div className="xl:col-span-2">
                      <label className="text-sm font-medium">Malzeme</label>
                      <Select
                        value={entry.material_id}
                        onValueChange={(value) => updateBOMEntry(index, 'material_id', value)}
                        disabled={materialsLoading}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder={materialsLoading ? "Yükleniyor..." : "Malzeme seçin"} />
                        </SelectTrigger>
                        <SelectContent>
                          {materialsLoading ? (
                            <SelectItem value="" disabled>
                              <div className="text-center py-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary mx-auto"></div>
                                <div className="text-sm text-muted-foreground mt-2">Yükleniyor...</div>
                              </div>
                            </SelectItem>
                          ) : (
                            getMaterialOptions(entry.material_type).map((material) => (
                              <SelectItem key={material.id} value={material.id}>
                                <div className="min-w-0">
                                  <div className="font-medium truncate" title={material.name}>
                                    {material.name}
                                  </div>
                                  <div className="text-sm text-muted-foreground truncate" title={material.code}>
                                    {material.code}
                                  </div>
                                </div>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Gerekli Miktar</label>
                      <Input
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={entry.quantity_needed}
                        onChange={(e) => updateBOMEntry(index, 'quantity_needed', parseFloat(e.target.value) || 0)}
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Malzeme Ekleme Butonu */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={addBOMEntry}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Malzeme Ekle
              </Button>
            </div>

            {/* Dialog Butonları */}
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleAddBOMEntries}>
                Tüm Malzemeleri Ekle ({newBOMEntries.length})
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
