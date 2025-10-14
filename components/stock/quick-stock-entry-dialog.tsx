'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
  type: 'giris' | 'cikis';
}

export function QuickStockEntryDialog({ open, onClose, type }: Props) {
  const [materialType, setMaterialType] = useState<'raw' | 'semi' | 'finished'>('raw');
  const [materials, setMaterials] = useState<any[]>([]);
  const [selectedMaterialId, setSelectedMaterialId] = useState('');
  const [quantity, setQuantity] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMaterials();
    }
  }, [open, materialType]);

  const fetchMaterials = async () => {
    try {
      const endpoint = 
        materialType === 'raw' ? '/api/stock/raw?limit=1000' :
        materialType === 'semi' ? '/api/stock/semi?limit=1000' :
        '/api/stock/finished?limit=1000';
      
      const response = await fetch(endpoint);
      const result = await response.json();
      setMaterials(result.data || []);
    } catch (error) {
      console.error('Failed to fetch materials:', error);
      toast.error('Malzemeler yüklenemedi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedMaterialId || !quantity) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/stock/movements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          material_type: materialType,
          material_id: selectedMaterialId,
          movement_type: type,
          quantity: parseFloat(quantity),
          description: description || `${type === 'giris' ? 'Hızlı stok girişi' : 'Hızlı stok çıkışı'}`
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'İşlem başarısız');
      }

      toast.success(`Stok ${type === 'giris' ? 'girişi' : 'çıkışı'} kaydedildi`);
      onClose();
      
      // Reset form
      setSelectedMaterialId('');
      setQuantity('');
      setDescription('');
      
      // Reload page to refresh data
      window.location.reload();
    } catch (error: any) {
      toast.error(error.message || 'İşlem hatası');
    } finally {
      setLoading(false);
    }
  };

  const selectedMaterial = materials.find(m => m.id === selectedMaterialId);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {type === 'giris' ? (
              <>
                <TrendingUp className="h-5 w-5 text-green-600" />
                Hızlı Stok Girişi
              </>
            ) : (
              <>
                <TrendingDown className="h-5 w-5 text-red-600" />
                Hızlı Stok Çıkışı
              </>
            )}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Malzeme Tipi */}
          <div className="space-y-2">
            <Label>Malzeme Tipi</Label>
            <Select value={materialType} onValueChange={(value: any) => {
              setMaterialType(value);
              setSelectedMaterialId('');
            }}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="raw">Hammadde</SelectItem>
                <SelectItem value="semi">Yarı Mamul</SelectItem>
                <SelectItem value="finished">Nihai Ürün</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Malzeme Seçimi */}
          <div className="space-y-2">
            <Label>Malzeme</Label>
            <Select value={selectedMaterialId} onValueChange={setSelectedMaterialId}>
              <SelectTrigger>
                <SelectValue placeholder="Malzeme seçin..." />
              </SelectTrigger>
              <SelectContent>
                {materials.map((material) => (
                  <SelectItem key={material.id} value={material.id}>
                    {material.code} - {material.name} (Stok: {material.quantity} {material.unit})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Mevcut Stok Bilgisi */}
          {selectedMaterial && (
            <div className="bg-gray-50 p-3 rounded-lg space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Mevcut Stok:</span>
                <span className="font-medium">{selectedMaterial.quantity} {selectedMaterial.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Kritik Seviye:</span>
                <span className="font-medium">{selectedMaterial.critical_level} {selectedMaterial.unit}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Birim Fiyat:</span>
                <span className="font-medium">₺{selectedMaterial.unit_price?.toLocaleString() || 0}</span>
              </div>
            </div>
          )}

          {/* Miktar */}
          <div className="space-y-2">
            <Label>Miktar {selectedMaterial && `(${selectedMaterial.unit})`}</Label>
            <Input
              type="number"
              step="0.01"
              min="0.01"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="Örn: 100"
              required
            />
            {selectedMaterial && quantity && (
              <p className="text-xs text-gray-500">
                {type === 'giris' ? 'Yeni stok:' : 'Kalan stok:'} {' '}
                <span className="font-medium">
                  {type === 'giris' 
                    ? (parseFloat(selectedMaterial.quantity) + parseFloat(quantity)).toFixed(2)
                    : (parseFloat(selectedMaterial.quantity) - parseFloat(quantity)).toFixed(2)
                  } {selectedMaterial.unit}
                </span>
              </p>
            )}
          </div>

          {/* Açıklama */}
          <div className="space-y-2">
            <Label>Açıklama (Opsiyonel)</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Stok hareketi hakkında not..."
              rows={3}
            />
          </div>

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedMaterialId || !quantity}
              className={type === 'giris' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}
            >
              {loading ? 'Kaydediliyor...' : (type === 'giris' ? 'Stok Girişi Yap' : 'Stok Çıkışı Yap')}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}


