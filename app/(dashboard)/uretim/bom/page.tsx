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
  Edit
} from 'lucide-react';
import { toast } from 'sonner';

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
  const [finishedProducts, setFinishedProducts] = useState<FinishedProduct[]>([]);
  const [rawMaterials, setRawMaterials] = useState<RawMaterial[]>([]);
  const [semiFinishedProducts, setSemiFinishedProducts] = useState<SemiFinishedProduct[]>([]);
  const [selectedProduct, setSelectedProduct] = useState<FinishedProduct | null>(null);
  const [bomData, setBomData] = useState<BOMData | null>(null);
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);

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

  const fetchFinishedProducts = async () => {
    try {
      const response = await fetch('/api/stock/finished', {
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
      const response = await fetch('/api/stock/raw', {
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
      const response = await fetch('/api/stock/semi', {
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
          const product = finishedProducts.find(p => p.id === productId);
          if (product) {
            setBomData({
              product,
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
    const product = finishedProducts.find(p => p.id === productId);
    if (product) {
      setSelectedProduct(product);
      fetchBOMData(productId);
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
        fetchBOMData(selectedProduct.id);
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
        fetchBOMData(selectedProduct.id);
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

  const filteredProducts = finishedProducts.filter(product =>
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
          <Button
            variant="outline"
            onClick={() => setIsImportDialogOpen(true)}
          >
            <Upload className="h-4 w-4 mr-2" />
            Excel Import
          </Button>
          <Button 
            variant="outline"
            onClick={handleExportBOM}
          >
            <Download className="h-4 w-4 mr-2" />
            Excel Export
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Ürün Seçimi */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Nihai Ürünler
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
                    <div className="font-medium">{product.name}</div>
                    <div className="text-sm text-muted-foreground">
                      {product.code} • {product.unit}
                    </div>
                    <div className="text-sm font-medium text-green-600">
                      ₺{product.sale_price.toFixed(2)}
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
                  </span>
                )}
              </CardTitle>
              {selectedProduct && (
                <Button
                  onClick={() => setIsAddDialogOpen(true)}
                  size="sm"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Malzeme Ekle
                </Button>
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
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="raw">Hammadde</SelectItem>
                          <SelectItem value="semi">Yarı Mamul</SelectItem>
                        </SelectContent>
                      </Select>
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

      {/* Excel Import Dialog */}
      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excel'den BOM Import</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-sm text-muted-foreground">
              <p>Excel dosyası formatı:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>product_code | product_name | material_code | material_name | quantity | unit | notes</li>
                <li>Sample Excel dosyasını indirerek formatı görebilirsiniz</li>
                <li>Excel dosyasında 2 tab var: "BOM Sample" ve "Nihai Ürünler"</li>
                <li>"Nihai Ürünler" tab'ından mevcut ürün kodlarını görebilirsiniz</li>
                <li>Örnek: THP-001 | Thunder Pro Laptop | CPU-001 | Intel Core i7 | 1 | adet | Ana işlemci</li>
              </ul>
            </div>
            
            <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-8 text-center">
              <Upload className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Excel dosyasını buraya sürükleyin veya tıklayarak seçin
              </p>
              <input
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                id="bom-import-file"
              />
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => document.getElementById('bom-import-file')?.click()}
              >
                Dosya Seç
              </Button>
            </div>

            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
                İptal
              </Button>
              <Button disabled>
                Import Et
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
