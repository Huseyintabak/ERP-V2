'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect, type SearchableSelectOption } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { ClipboardList, AlertTriangle, CheckCircle, TrendingUp, TrendingDown } from 'lucide-react';
import { toast } from 'sonner';

const countSchema = z.object({
  materialType: z.enum(['raw', 'semi', 'finished']),
  materialId: z.string().min(1, 'Malzeme seçin'),
  physicalQuantity: z.number().min(0, 'Miktar 0 veya üzeri olmalı'),
  notes: z.string().optional()
});

type CountFormData = z.infer<typeof countSchema>;

interface Material {
  id: string;
  code: string;
  name: string;
  quantity: number;
  unit: string;
}

interface InventoryCountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function InventoryCountDialog({
  open,
  onOpenChange,
  onSuccess
}: InventoryCountDialogProps) {
  const [loading, setLoading] = useState(false);
  const [materialsLoading, setMaterialsLoading] = useState(false);
  const [materials, setMaterials] = useState<Material[]>([]);
  const [selectedMaterial, setSelectedMaterial] = useState<Material | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    reset,
    formState: { errors }
  } = useForm<CountFormData>({
    resolver: zodResolver(countSchema),
    defaultValues: {
      materialType: 'raw',
      materialId: '',
      physicalQuantity: 0,
      notes: ''
    }
  });

  const watchMaterialType = watch('materialType');
  const watchMaterialId = watch('materialId');
  const watchPhysicalQty = watch('physicalQuantity');

  // SearchableSelect için material options'ı hazırla
  const materialOptions: SearchableSelectOption[] = materials.map((material) => ({
    value: material.id,
    label: material.name,
    description: material.code,
    badge: `${material.quantity} ${material.unit}`,
  }));

  // Malzeme tipine göre malzemeleri yükle
  useEffect(() => {
    if (open && watchMaterialType) {
      loadMaterials(watchMaterialType);
    }
  }, [watchMaterialType, open]);

  // Seçilen malzemeyi bul
  useEffect(() => {
    if (watchMaterialId) {
      const material = materials.find(m => m.id === watchMaterialId);
      setSelectedMaterial(material || null);
    } else {
      setSelectedMaterial(null);
    }
  }, [watchMaterialId, materials]);

  const loadMaterials = async (type: 'raw' | 'semi' | 'finished') => {
    setMaterialsLoading(true);
    try {
      const endpoints = {
        raw: '/api/stock/raw?limit=1000',
        semi: '/api/stock/semi?limit=1000',
        finished: '/api/stock/finished?limit=1000'
      };

      const response = await fetch(endpoints[type]);
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setMaterials(result.data || []);
    } catch (error: any) {
      toast.error('Malzemeler yüklenemedi');
      setMaterials([]);
    } finally {
      setMaterialsLoading(false);
    }
  };

  const onSubmit = async (data: CountFormData) => {
    setLoading(true);
    try {
      const response = await fetch('/api/stock/count', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success('Envanter sayımı kaydedildi');
      reset();
      onSuccess?.();
      onOpenChange(false);

    } catch (error: any) {
      toast.error(error.message || 'Kayıt hatası');
    } finally {
      setLoading(false);
    }
  };

  // Fark hesaplama
  const systemQty = selectedMaterial?.quantity || 0;
  const physicalQty = watchPhysicalQty || 0;
  const difference = physicalQty - systemQty;
  const variancePercent = systemQty > 0 
    ? ((difference / systemQty) * 100).toFixed(2)
    : '0';

  const getVarianceSeverity = () => {
    const variance = Math.abs(parseFloat(variancePercent));
    if (variance > 10) return { color: 'text-red-600', bg: 'bg-red-50', label: 'Yüksek Sapma', icon: AlertTriangle };
    if (variance > 5) return { color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Orta Sapma', icon: AlertTriangle };
    if (variance > 0) return { color: 'text-blue-600', bg: 'bg-blue-50', label: 'Düşük Sapma', icon: CheckCircle };
    return { color: 'text-green-600', bg: 'bg-green-50', label: 'Eşleşme', icon: CheckCircle };
  };

  const severity = getVarianceSeverity();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardList className="w-5 h-5" />
            Envanter Sayımı
          </DialogTitle>
          <DialogDescription>
            Fiziki stok sayımı yapın ve sistem ile karşılaştırın
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Malzeme Tipi */}
          <div className="space-y-2">
            <Label htmlFor="materialType">Malzeme Tipi</Label>
            <Select
              value={watchMaterialType}
              onValueChange={(value) => {
                setValue('materialType', value as any);
                setValue('materialId', '');
                setSelectedMaterial(null);
              }}
            >
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
            <Label htmlFor="materialId">Malzeme</Label>
            <SearchableSelect
              options={materialOptions}
              value={watchMaterialId}
              onValueChange={(value) => setValue('materialId', value)}
              placeholder={materialsLoading ? 'Yükleniyor...' : 'Malzeme seçin'}
              searchPlaceholder="Malzeme adı veya kodu ile ara..."
              emptyText="Malzeme bulunamadı"
              disabled={materialsLoading}
              loading={materialsLoading}
              allowClear
              maxHeight="300px"
            />
            {errors.materialId && (
              <p className="text-sm text-red-600">{errors.materialId.message}</p>
            )}
          </div>

          {/* Sistem Stoğu (Read-only) */}
          {selectedMaterial && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Seçilen Malzeme</p>
                  <p className="font-semibold">{selectedMaterial.code} - {selectedMaterial.name}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">Sistem Stoğu</p>
                  <p className="text-lg font-bold text-blue-700">
                    {selectedMaterial.quantity.toFixed(2)} {selectedMaterial.unit}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Fiziki Sayım */}
          <div className="space-y-2">
            <Label htmlFor="physicalQuantity">Fiziki Sayım Miktarı</Label>
            <div className="flex gap-2">
              <Input
                id="physicalQuantity"
                type="number"
                step="0.01"
                {...register('physicalQuantity', { valueAsNumber: true })}
                placeholder="0.00"
                className="text-lg font-semibold"
              />
              {selectedMaterial && (
                <div className="flex items-center text-sm text-gray-600 whitespace-nowrap">
                  {selectedMaterial.unit}
                </div>
              )}
            </div>
            {errors.physicalQuantity && (
              <p className="text-sm text-red-600">{errors.physicalQuantity.message}</p>
            )}
          </div>

          {/* Fark Analizi */}
          {selectedMaterial && watchPhysicalQty !== undefined && (
            <div className={`${severity.bg} border rounded-lg p-4 space-y-3`}>
              <div className="flex items-center gap-2">
                <severity.icon className={`w-5 h-5 ${severity.color}`} />
                <h3 className="font-semibold">Fark Analizi</h3>
                <Badge variant={difference >= 0 ? 'default' : 'destructive'} className="ml-auto">
                  {severity.label}
                </Badge>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-gray-600">Sistem Stoğu</p>
                  <p className="text-lg font-bold">
                    {systemQty.toFixed(2)} {selectedMaterial.unit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Fiziki Sayım</p>
                  <p className="text-lg font-bold">
                    {physicalQty.toFixed(2)} {selectedMaterial.unit}
                  </p>
                </div>

                <div>
                  <p className="text-xs text-gray-600">Fark</p>
                  <p className={`text-lg font-bold flex items-center gap-1 ${
                    difference > 0 ? 'text-green-600' : difference < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {difference > 0 && <TrendingUp className="w-4 h-4" />}
                    {difference < 0 && <TrendingDown className="w-4 h-4" />}
                    {difference > 0 ? '+' : ''}{difference.toFixed(2)} {selectedMaterial.unit}
                  </p>
                  <p className="text-xs text-gray-600">
                    ({parseFloat(variancePercent) > 0 ? '+' : ''}{variancePercent}%)
                  </p>
                </div>
              </div>

              {Math.abs(parseFloat(variancePercent)) > 10 && (
                <div className="bg-white border border-red-300 rounded p-3 text-sm">
                  <p className="font-semibold text-red-800">⚠️ Yüksek Sapma Tespit Edildi</p>
                  <p className="text-red-700">
                    %10'dan fazla fark var. Lütfen sayımı kontrol edin.
                  </p>
                </div>
              )}

              {difference !== 0 && (
                <div className="bg-white rounded p-3 text-sm">
                  <p className="text-gray-700">
                    <strong>Sonuç:</strong> Onaylandığında sistem stoğu{' '}
                    <strong className="text-blue-600">
                      {physicalQty.toFixed(2)} {selectedMaterial.unit}
                    </strong>
                    {' '}olarak güncellenecek.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Notlar */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Sayım notları, sorunlar, açıklamalar..."
              rows={3}
            />
          </div>

          {/* Uyarı */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
            <p className="font-semibold">ℹ️ Bilgi</p>
            <p>
              Envanter sayımı kaydedildikten sonra yönetici onayı bekleyecektir.
              Onaylandığında sistem stoğu otomatik güncellenecektir.
            </p>
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                reset();
                onOpenChange(false);
              }}
              disabled={loading}
            >
              İptal
            </Button>
            <Button 
              type="submit" 
              disabled={loading || !selectedMaterial}
            >
              {loading ? 'Kaydediliyor...' : 'Kaydet ve Onaya Gönder'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

