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
import { BomVisualTree } from '@/components/bom/bom-visual-tree';
import { useAuthStore } from '@/stores/auth-store';

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
  cost_price?: number;
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
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingBOM, setEditingBOM] = useState<BOMEntry | null>(null);
  const [showVisualTree, setShowVisualTree] = useState(true);
  const [usdRate, setUsdRate] = useState<number | null>(null);
  const [isSaving, setIsSaving] = useState(false); // BOM kaydetme durumu
  const { user } = useAuthStore();

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
    // Fetch USD rate (TCMB via our API)
    (async () => {
      try {
        const r = await fetch('/api/exchange/usd', { cache: 'no-store' });
        if (r.ok) {
          const d = await r.json();
          if (d?.rate) setUsdRate(Number(d.rate));
        }
      } catch {}
    })();
  }, []);

  // Nihai + Yarı mamulleri birleştir
  useEffect(() => {
    const combined: Product[] = [
      ...finishedProducts.map(p => ({
        ...p,
        product_type: 'finished' as const,
      })),
      ...semiFinishedProducts.map(p => ({
        ...p,
        product_type: 'semi' as const,
      }))
    ];
    setAllProducts(combined);
  }, [finishedProducts, semiFinishedProducts]);

  const fetchFinishedProducts = async () => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/stock/finished?limit=1000&t=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        cache: 'no-store'
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
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/stock/raw?limit=1000', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
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
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/stock/semi?limit=1000&t=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        cache: 'no-store'
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
    console.log('fetchBOMData called for product:', productId);
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/bom/${productId}?t=${Date.now()}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        cache: 'no-store'
      });
      
      console.log('BOM API response:', response.status, response.ok);
      
      if (!response.ok) {
        if (response.status === 404) {
          // BOM yoksa boş data döndür
          const product = allProducts.find(p => p.id === productId);
          if (product) {
            console.log('BOM not found, returning empty data for product:', product.name);
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
      console.log('BOM data received:', { materialsCount: result.materials?.length || 0, result });
      
      // Güncel fiyatları allProducts'tan al ve merge et
      const currentProduct = allProducts.find(p => p.id === productId);
      if (currentProduct && result.product) {
        result.product.sale_price = currentProduct.sale_price || currentProduct.unit_cost || result.product.sale_price;
      }
      
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
      console.log('Product selected:', { productId, productName: product.name, productType: product.product_type });
      setSelectedProduct(product);
      fetchBOMData(productId);
      
      // Yarı mamul seçiliyse, newBOMEntries'i sadece hammadde olarak resetle
      if (product.product_type === 'semi') {
        console.log('Semi product selected, resetting BOM entries');
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
      
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
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
      
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/pricing/calculate-all', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
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
      // Small delay to ensure state updates complete
      if (selectedProduct) {
        setTimeout(() => {
          fetchBOMData(selectedProduct.id);
        }, 100);
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

    // Zaten kayıt işlemi devam ediyorsa, tekrar başlatma
    if (isSaving) {
      toast.warning('Kayıt işlemi devam ediyor, lütfen bekleyin...');
      return;
    }

    setIsSaving(true);
    const abortController = new AbortController();

    // Sayfa kapatılmasını engellemek için beforeunload event'i
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'BOM kayıt işlemi devam ediyor. Sayfadan ayrılmak istediğinize emin misiniz?';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      // Önce mevcut BOM kayıtlarını al (ekleme yapmak için)
      const currentBomResponse = await fetch(`/api/bom/${selectedProduct.id}`, {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        cache: 'no-store',
        signal: abortController.signal
      });

      let existingEntries: any[] = [];
      if (currentBomResponse.ok) {
        const currentBomData = await currentBomResponse.json();
        existingEntries = (currentBomData.materials || []).map((m: any) => ({
          material_type: m.material_type,
          material_id: m.material_id,
          quantity_needed: m.quantity_needed
        }));
      }

      // Mevcut kayıtları ve yeni kayıtları birleştir (duplicate kontrolü ile)
      const allEntries = [...existingEntries];
      newBOMEntries.forEach(newEntry => {
        // Aynı malzeme zaten varsa, yenisini ekleme (replace olacak)
        const existingIndex = allEntries.findIndex(
          e => e.material_type === newEntry.material_type && 
               e.material_id === newEntry.material_id
        );
        if (existingIndex >= 0) {
          allEntries[existingIndex] = newEntry;
        } else {
          allEntries.push(newEntry);
        }
      });

      // Tüm kayıtları tek seferde kaydet (mevcut kayıtları silip yenilerini ekler)
      const response = await fetch(`/api/bom/${selectedProduct.id}`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          entries: allEntries
        }),
        signal: abortController.signal
      });

      if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = 'BOM kayıtları eklenirken hata oluştu';
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('BOM saved successfully:', result);

      // beforeunload event'ini kaldır
      window.removeEventListener('beforeunload', handleBeforeUnload);

      toast.success(`${newBOMEntries.length} malzeme başarıyla eklendi`);
      setIsAddDialogOpen(false);
      setNewBOMEntries([{
        material_type: 'raw',
        material_id: '',
        quantity_needed: 1,
      }]);
      
      // BOM verilerini yenile (kısa bir delay ile cache'i bypass etmek için)
      if (selectedProduct) {
        // Hemen yenile
        await fetchBOMData(selectedProduct.id);
        
        // Otomatik maliyet hesapla
        await autoCalculateCost(selectedProduct.id);
      }
    } catch (error: any) {
      // AbortError ise (sayfa kapatıldı), sessizce iptal et
      if (error.name === 'AbortError') {
        console.warn('BOM save işlemi iptal edildi (sayfa kapatıldı)');
        toast.warning('Kayıt işlemi iptal edildi. Lütfen tekrar deneyin.');
        return;
      }
      console.error('Error adding BOM entries:', error);
      toast.error(error.message || 'BOM kayıtları eklenirken hata oluştu');
    } finally {
      setIsSaving(false);
      window.removeEventListener('beforeunload', handleBeforeUnload);
    }
  };

  const handleEditBOMEntry = (entry: BOMEntry) => {
    setEditingBOM(entry);
    setIsEditDialogOpen(true);
  };

  const handleUpdateBOMEntry = async (quantity: number) => {
    if (!editingBOM) return;

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/bom?id=${editingBOM.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          quantity_needed: quantity,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('/login')) {
          console.warn('Redirect to login detected');
          return;
        }
        const error = JSON.parse(errorText);
        throw new Error(error.error || 'Failed to update BOM entry');
      }

      toast.success('BOM kaydı güncellendi');
      setIsEditDialogOpen(false);
      setEditingBOM(null);
      
      // BOM verilerini yenile
      if (selectedProduct) {
        await fetchBOMData(selectedProduct.id);
        
        // Otomatik maliyet hesapla
        await autoCalculateCost(selectedProduct.id);
      }
    } catch (error: any) {
      console.error('Error updating BOM entry:', error);
      toast.error(error.message || 'BOM kaydı güncellenirken hata oluştu');
    }
  };

  const handleDeleteBOMEntry = async (bomId: string) => {
    if (!confirm('Bu BOM kaydını silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/bom?id=${bomId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        if (errorText.includes('/login')) {
          console.warn('Redirect to login detected');
          return;
        }
        
        // 405 hatası için özel mesaj
        if (response.status === 405) {
          throw new Error('İşlem izni yok veya endpoint hatası');
        }
        
        // Boş response kontrolü
        if (!errorText || errorText.trim() === '') {
          throw new Error(`HTTP ${response.status}: Sunucu yanıt vermedi`);
        }
        
        try {
          const error = JSON.parse(errorText);
          throw new Error(error.error || 'Failed to delete BOM entry');
        } catch (parseError) {
          throw new Error(`Sunucu hatası: ${errorText.substring(0, 100)}`);
        }
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
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/bom/export', {
        headers: {
          'x-user-id': user.id
        }
      });
      
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

  const handleVisualTreeSave = async (bomData: any) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      if (!selectedProduct?.id) {
        throw new Error('Ürün seçilmedi');
      }

      console.log('Saving BOM for product:', selectedProduct.id);
      console.log('BOM data received:', bomData);

      // Transform data to API format
      const entries = (bomData.materials || []).map((material: any) => ({
        material_type: material.material_type || material.materialType || 'raw',
        material_id: material.material_id || material.materialId,
        quantity_needed: material.quantity_needed || material.quantity,
        quantity: material.quantity_needed || material.quantity // API accepts both
      }));

      console.log('Transformed entries:', entries);

      // Validate entries
      const invalidEntries = entries.filter((entry: any) => 
        !entry.material_id || !entry.material_type || !entry.quantity_needed
      );

      if (invalidEntries.length > 0) {
        console.error('Invalid entries:', invalidEntries);
        throw new Error('Geçersiz malzeme verileri. Lütfen tüm alanları kontrol edin.');
      }

      const response = await fetch(`/api/bom/${selectedProduct.id}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          product_id: selectedProduct.id,
          entries: entries
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('BOM save error:', response.status, errorText);
        
        let errorMessage = `BOM kaydedilemedi: ${response.status}`;
        try {
          const errorJson = JSON.parse(errorText);
          errorMessage = errorJson.error || errorMessage;
        } catch {
          errorMessage = errorText || errorMessage;
        }
        
        throw new Error(errorMessage);
      }

      const result = await response.json();
      console.log('BOM save success:', result);

      toast.success('BOM başarıyla kaydedildi');
      
      // Refresh BOM data
      await fetchBOMData(selectedProduct.id);
      
      // Auto calculate cost
      await autoCalculateCost(selectedProduct.id);
    } catch (error: any) {
      console.error('Error saving BOM:', error);
      toast.error(error.message || 'BOM kaydedilirken hata oluştu');
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

      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/bom/import', {
        method: 'POST',
        headers: {
          'x-user-id': user.id
        },
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
    <div className="flex flex-col h-[calc(100vh-4rem)] -mx-6 -my-6">
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b bg-background flex-shrink-0">
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

      <div className="flex-1 grid gap-6 lg:grid-cols-3 px-6 pb-6 overflow-hidden">
        {/* Ürün Seçimi */}
        <Card className="lg:col-span-1 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Ürünler (Nihai + Yarı Mamul)
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-1 flex flex-col overflow-hidden">
            <div className="space-y-4 flex-shrink-0">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Ürün ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto mt-4">
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
                      {(() => {
                        const tl = (() => {
                          if (product.product_type === 'semi') return product.unit_cost || 0;
                          const fp = product as unknown as FinishedProduct;
                          return fp.cost_price ?? 0;
                        })();
                        const usd = usdRate ? (tl / usdRate) : null;
                        return usd
                          ? `₺${tl.toFixed(2)} · $${usd.toFixed(2)}`
                          : `₺${tl.toFixed(2)}`;
                      })()}
                    </div>
                  </div>
                ))}
              </div>
          </CardContent>
        </Card>

        {/* BOM Detayları */}
        <Card className="lg:col-span-2 flex flex-col overflow-hidden">
          <CardHeader className="flex-shrink-0">
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
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowVisualTree(!showVisualTree)}
                  >
                    <TreePine className="h-4 w-4 mr-2" />
                    {showVisualTree ? 'Tablo Görünümü' : 'Ağaç Görünümü'}
                  </Button>
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
                  {/* Görsel ağaç görünümünde "Malzeme Ekle" butonunu gizle - BomVisualTree kendi butonuna sahip */}
                  {!showVisualTree && (
                    <Button
                      onClick={() => setIsAddDialogOpen(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Malzeme Ekle
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent className={`flex-1 ${showVisualTree ? 'flex flex-col overflow-hidden p-0' : 'overflow-y-auto'}`}>
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
            ) : showVisualTree ? (
              <div className="flex-1 flex flex-col p-6">
                <BomVisualTree
                  productId={selectedProduct.id}
                  productName={selectedProduct.name}
                  onSave={handleVisualTreeSave}
                  initialData={bomData}
                />
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
                    <div className="text-right">
                      <div className="text-lg font-bold text-green-600">
                        {(() => {
                          const tl = bomData.materials.reduce((total, entry) => {
                            const unitPrice = entry.material.unit_price || entry.material.unit_cost || 0;
                            return total + (unitPrice * entry.quantity_needed);
                          }, 0);
                          return `₺${tl.toFixed(2)}`;
                        })()}
                      </div>
                      {usdRate ? (
                        <div className="text-xs text-muted-foreground">
                          {(() => {
                            const tl = bomData.materials.reduce((total, entry) => {
                              const unitPrice = entry.material.unit_price || entry.material.unit_cost || 0;
                              return total + (unitPrice * entry.quantity_needed);
                            }, 0);
                            const usd = tl / usdRate;
                            return `$ ${usd.toFixed(2)} @ ${usdRate.toFixed(4)}`;
                          })()}
                        </div>
                      ) : null}
                    </div>
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
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEditBOMEntry(entry)}
                                title="Düzenle"
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteBOMEntry(entry.id)}
                                title="Sil"
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
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

            {/* Yeni Satır Ekleme Butonu */}
            <div className="flex justify-center">
              <Button
                variant="outline"
                onClick={addBOMEntry}
                className="w-full"
              >
                <Plus className="h-4 w-4 mr-2" />
                Yeni Satır Ekle
              </Button>
            </div>

            {/* Dialog Butonları */}
            <div className="flex justify-end space-x-2">
              <Button 
                variant="outline" 
                onClick={() => setIsAddDialogOpen(false)}
                disabled={isSaving}
              >
                İptal
              </Button>
              <Button 
                onClick={handleAddBOMEntries}
                disabled={isSaving || newBOMEntries.length === 0}
              >
                {isSaving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Kaydediliyor...
                  </>
                ) : (
                  `Tüm Malzemeleri Ekle (${newBOMEntries.length})`
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Malzeme Düzenleme Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>BOM Malzemesi Düzenle</DialogTitle>
          </DialogHeader>
          {editingBOM && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Malzeme Tipi</label>
                <p className="text-sm mt-1">
                  <Badge variant={editingBOM.material_type === 'raw' ? 'default' : 'secondary'}>
                    {editingBOM.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                  </Badge>
                </p>
              </div>

              <div>
                <label className="text-sm font-medium text-muted-foreground">Malzeme</label>
                <div className="mt-1">
                  <p className="font-medium">{editingBOM.material.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {editingBOM.material.code} • {editingBOM.material.unit}
                  </p>
                </div>
              </div>

              <div>
                <label className="text-sm font-medium">Gerekli Miktar *</label>
                <Input
                  type="number"
                  min="0.01"
                  step={editingBOM.material_type === 'raw' ? '0.001' : '0.01'}
                  defaultValue={editingBOM.quantity_needed}
                  id="edit-quantity"
                  placeholder="0.00"
                  className="mt-1"
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => {
                  setIsEditDialogOpen(false);
                  setEditingBOM(null);
                }}>
                  İptal
                </Button>
                <Button onClick={() => {
                  const input = document.getElementById('edit-quantity') as HTMLInputElement;
                  const quantity = parseFloat(input.value);
                  if (quantity > 0) {
                    handleUpdateBOMEntry(quantity);
                  } else {
                    toast.error('Miktar 0\'dan büyük olmalı');
                  }
                }}>
                  Güncelle
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
