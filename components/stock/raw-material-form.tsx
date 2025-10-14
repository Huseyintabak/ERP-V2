'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { rawMaterialSchema, type RawMaterialFormData } from '@/types';
import { useStockActions } from '@/stores/stock-store';
import { toast } from 'sonner';
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: RawMaterialFormData) => Promise<void>;
  initialData?: RawMaterialFormData;
  isLoading?: boolean;
  isEdit?: boolean;
}

export function RawMaterialForm({
  open,
  onClose,
  onSubmit,
  initialData,
  isLoading,
  isEdit = false,
}: Props) {
  const stockActions = useStockActions();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<RawMaterialFormData>({
    resolver: zodResolver(rawMaterialSchema),
    defaultValues: initialData,
  });

  // Birim seçenekleri
  const unitOptions = [
    { value: 'adet', label: 'Adet' },
    { value: 'kg', label: 'Kilogram (kg)' },
    { value: 'gram', label: 'Gram (g)' },
    { value: 'ton', label: 'Ton (t)' },
    { value: 'litre', label: 'Litre (L)' },
    { value: 'ml', label: 'Mililitre (ml)' },
    { value: 'metre', label: 'Metre (m)' },
    { value: 'cm', label: 'Santimetre (cm)' },
    { value: 'mm', label: 'Milimetre (mm)' },
    { value: 'm2', label: 'Metrekare (m²)' },
    { value: 'm3', label: 'Metreküp (m³)' },
    { value: 'paket', label: 'Paket' },
    { value: 'kutu', label: 'Kutu' },
    { value: 'palet', label: 'Palet' },
    { value: 'takım', label: 'Takım' },
  ];

  const selectedUnit = watch('unit');

  // initialData değiştiğinde formu güncelle
  useEffect(() => {
    if (open && initialData) {
      reset(initialData);
    } else if (open && !initialData) {
      reset({
        code: '',
        name: '',
        unit: 'adet',
        quantity: 0,
        min_level: 10,
        max_level: 100,
        critical_level: 5,
        unit_price: 0,
        supplier: '',
        description: ''
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: RawMaterialFormData) => {
    try {
      // Optimistic update for new materials
      if (!isEdit && initialData?.id) {
        const tempMaterial = {
          id: `temp-${Date.now()}`,
          ...data,
          quantity: data.quantity || 0,
          min_level: data.min_level || 0,
          max_level: data.max_level || 0,
          critical_level: data.critical_level || 0,
          unit_price: data.unit_price || 0,
          supplier: data.supplier || '',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        };
        
        stockActions.optimisticUpdateRawMaterial(initialData.id, tempMaterial);
        toast.success('Hammadde güncelleniyor...');
      }
      
      await onSubmit(data);
      reset();
    } catch (error) {
      // Revert optimistic update on error
      if (!isEdit && initialData?.id) {
        stockActions.fetchRawMaterials();
        toast.error('Güncelleme başarısız oldu, geri alınıyor...');
      }
      throw error;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData ? 'Hammadde Düzenle' : 'Yeni Hammadde'}
          </DialogTitle>
          <DialogDescription>
            Hammadde bilgilerini girin
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="code">Malzeme Kodu *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="HM-001"
                disabled={isLoading}
              />
              {errors.code && (
                <p className="text-sm text-red-600">{errors.code.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="barcode">Barkod</Label>
              <Input
                id="barcode"
                {...register('barcode')}
                placeholder="1234567890123"
                disabled={isLoading}
              />
              {errors.barcode && (
                <p className="text-sm text-red-600">{errors.barcode.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Malzeme Adı *</Label>
            <Input
              id="name"
              {...register('name')}
              placeholder="Çelik Levha"
              disabled={isLoading}
            />
            {errors.name && (
              <p className="text-sm text-red-600">{errors.name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Miktar *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register('quantity', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.quantity && (
                <p className="text-sm text-red-600">{errors.quantity.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="unit">Birim *</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => setValue('unit', value)}
                disabled={isLoading}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Birim seçin" />
                </SelectTrigger>
                <SelectContent>
                  {unitOptions.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.unit && (
                <p className="text-sm text-red-600">{errors.unit.message}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">Birim Fiyat (₺) *</Label>
              <Input
                id="unit_price"
                type="number"
                step="0.01"
                {...register('unit_price', { valueAsNumber: true })}
                placeholder="0.00"
                disabled={isLoading}
              />
              {errors.unit_price && (
                <p className="text-sm text-red-600">{errors.unit_price.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="critical_level">Kritik Seviye</Label>
              <Input
                id="critical_level"
                type="number"
                step="0.01"
                {...register('critical_level', { valueAsNumber: true })}
                placeholder="10.00"
                disabled={isLoading}
              />
              {errors.critical_level && (
                <p className="text-sm text-red-600">{errors.critical_level.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Malzeme hakkında ek bilgiler..."
              rows={3}
              disabled={isLoading}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : initialData ? 'Güncelle' : 'Oluştur'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

