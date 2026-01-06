'use client';

import { useState, useEffect } from 'react';
import { Search, Package, Boxes, ShoppingBag, X, Check, Sparkles } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { LabelProduct, ProductType } from '@/lib/utils/barcode-label';

interface ProductSelectorProps {
  selectedProducts: LabelProduct[];
  onSelectionChange: (products: LabelProduct[]) => void;
}

export function ProductSelector({
  selectedProducts,
  onSelectionChange,
}: ProductSelectorProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [products, setProducts] = useState<LabelProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedType, setSelectedType] = useState<ProductType | 'all'>('all');

  // Fetch products
  useEffect(() => {
    fetchProducts();
  }, []);

  async function fetchProducts() {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/products/all-with-barcodes');
      if (!response.ok) {
        throw new Error('Failed to fetch products');
      }

      const data = await response.json();
      setProducts(data.products || []);
    } catch (err) {
      console.error('Error fetching products:', err);
      setError('Ürünler yüklenemedi');
    } finally {
      setLoading(false);
    }
  }

  // Filter products based on search and type
  const filteredProducts = products.filter((product) => {
    const matchesSearch =
      !searchQuery ||
      product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.code.toLowerCase().includes(searchQuery.toLowerCase()) ||
      product.barcode.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesType = selectedType === 'all' || product.type === selectedType;

    return matchesSearch && matchesType;
  });

  // Toggle product selection
  function toggleProduct(product: LabelProduct) {
    const isSelected = selectedProducts.some((p) => p.id === product.id);

    if (isSelected) {
      onSelectionChange(selectedProducts.filter((p) => p.id !== product.id));
    } else {
      onSelectionChange([...selectedProducts, product]);
    }
  }

  // Select all filtered products
  function selectAll() {
    const newSelections = [...selectedProducts];
    filteredProducts.forEach((product) => {
      if (!newSelections.some((p) => p.id === product.id)) {
        newSelections.push(product);
      }
    });
    onSelectionChange(newSelections);
  }

  // Clear all selections
  function clearAll() {
    onSelectionChange([]);
  }

  // Get product type icon
  function getTypeIcon(type: ProductType) {
    switch (type) {
      case 'finished':
        return <Package className="w-4 h-4" />;
      case 'semi_finished':
        return <Boxes className="w-4 h-4" />;
      case 'raw_material':
        return <ShoppingBag className="w-4 h-4" />;
    }
  }

  // Get product type label
  function getTypeLabel(type: ProductType) {
    switch (type) {
      case 'finished':
        return 'Nihai Ürün';
      case 'semi_finished':
        return 'Yarı Mamul';
      case 'raw_material':
        return 'Hammadde';
    }
  }

  return (
    <Card className="p-4">
      <div className="flex flex-col gap-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-medium">Ürün Seçimi</h3>
            <p className="text-xs text-muted-foreground">
              {selectedProducts.length} ürün seçildi
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={selectAll}
              disabled={filteredProducts.length === 0}
            >
              <Check className="w-4 h-4 mr-1" />
              Tümünü Seç
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={clearAll}
              disabled={selectedProducts.length === 0}
            >
              <X className="w-4 h-4 mr-1" />
              Temizle
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Ürün adı, kodu veya barkod ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>

        {/* Type Filter */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant={selectedType === 'all' ? 'default' : 'outline'}
            onClick={() => setSelectedType('all')}
          >
            Tümü
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'finished' ? 'default' : 'outline'}
            onClick={() => setSelectedType('finished')}
          >
            <Package className="w-4 h-4 mr-1" />
            Nihai Ürün
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'semi_finished' ? 'default' : 'outline'}
            onClick={() => setSelectedType('semi_finished')}
          >
            <Boxes className="w-4 h-4 mr-1" />
            Yarı Mamul
          </Button>
          <Button
            size="sm"
            variant={selectedType === 'raw_material' ? 'default' : 'outline'}
            onClick={() => setSelectedType('raw_material')}
          >
            <ShoppingBag className="w-4 h-4 mr-1" />
            Hammadde
          </Button>
        </div>

        {/* Products List */}
        <ScrollArea className="h-[400px] rounded border">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Yükleniyor...</p>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">
                {searchQuery ? 'Ürün bulunamadı' : 'Barkodlu ürün yok'}
              </p>
            </div>
          ) : (
            <div className="p-2 space-y-2">
              {filteredProducts.map((product) => {
                const isSelected = selectedProducts.some(
                  (p) => p.id === product.id
                );

                return (
                  <div
                    key={product.id}
                    className={`p-3 rounded border cursor-pointer transition-all hover:border-primary ${
                      isSelected
                        ? 'border-primary bg-primary/5'
                        : 'border-border'
                    }`}
                    onClick={() => toggleProduct(product)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {getTypeIcon(product.type)}
                          <h4 className="text-sm font-medium truncate">
                            {product.name}
                          </h4>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <span className="font-mono">{product.code}</span>
                          <span>•</span>
                          <div className="flex items-center gap-1">
                            <span className="font-mono">{product.barcode}</span>
                            {(product.barcode.startsWith('FIN-') ||
                              product.barcode.startsWith('SFP-') ||
                              product.barcode.startsWith('RAW-')) && (
                              <Sparkles className="w-3 h-3 text-yellow-500" title="Otomatik oluşturulmuş barkod" />
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          <Badge variant="secondary" className="text-xs">
                            {getTypeLabel(product.type)}
                          </Badge>
                          {product.unit && (
                            <Badge variant="outline" className="text-xs">
                              {product.unit}
                            </Badge>
                          )}
                          {product.category && (
                            <Badge variant="outline" className="text-xs">
                              {product.category}
                            </Badge>
                          )}
                          {product.price && (
                            <Badge variant="outline" className="text-xs">
                              ₺{product.price.toFixed(2)}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0">
                        {isSelected && (
                          <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                            <Check className="w-3 h-3 text-primary-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </ScrollArea>

        {/* Summary */}
        {selectedProducts.length > 0 && (
          <div className="pt-2 border-t">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Seçili Ürünler:</span>
              <span className="font-medium">{selectedProducts.length} adet</span>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
}
