'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { finishedProductSchema, type FinishedProductFormData } from '@/types';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: FinishedProductFormData) => Promise<void>;
  initialData?: Partial<FinishedProductFormData>;
  isLoading?: boolean;
}

export function FinishedProductForm({ open, onClose, onSubmit, initialData, isLoading }: Props) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    setValue,
    watch,
  } = useForm<FinishedProductFormData>({
    resolver: zodResolver(finishedProductSchema),
    defaultValues: initialData || {
      code: '',
      name: '',
      barcode: '',
      quantity: 0,
      unit: 'adet',
      sale_price: 0,
      critical_level: 5,
      description: '',
    },
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
        barcode: '',
        quantity: 0,
        unit: 'adet',
        sale_price: 0,
        critical_level: 5,
        description: ''
      });
    }
  }, [open, initialData, reset]);

  const handleFormSubmit = async (data: FinishedProductFormData) => {
    // Satış fiyatı artık BOM maliyeti olarak hesaplanıyor, default 0
    const submitData = {
      ...data,
      sale_price: data.sale_price || 0
    };
    await onSubmit(submitData);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {initialData?.id ? 'Nihai Ürün Düzenle' : 'Yeni Nihai Ürün'}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="code">Kod *</Label>
              <Input
                id="code"
                {...register('code')}
                placeholder="NU-001"
                disabled={isLoading}
              />
              {errors.code && <p className="text-sm text-red-600">{errors.code.message}</p>}
            </div>

            <div>
              <Label htmlFor="name">İsim *</Label>
              <Input
                id="name"
                {...register('name')}
                placeholder="Ürün X Model A"
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-red-600">{errors.name.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="barcode">Barkod</Label>
            <Input
              id="barcode"
              {...register('barcode')}
              placeholder="1234567890123"
              disabled={isLoading}
            />
            {errors.barcode && <p className="text-sm text-red-600">{errors.barcode.message}</p>}
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="quantity">Miktar *</Label>
              <Input
                id="quantity"
                type="number"
                step="0.01"
                {...register('quantity', { valueAsNumber: true })}
              />
              {errors.quantity && <p className="text-sm text-red-600">{errors.quantity.message}</p>}
            </div>

            <div>
              <Label htmlFor="unit">Birim *</Label>
              <Select
                value={selectedUnit}
                onValueChange={(value) => setValue('unit', value)}
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
              {errors.unit && <p className="text-sm text-red-600">{errors.unit.message}</p>}
            </div>

            <div>
              <Label htmlFor="critical_level">Kritik Seviye *</Label>
              <Input
                id="critical_level"
                type="number"
                step="0.01"
                {...register('critical_level', { valueAsNumber: true })}
              />
              {errors.critical_level && <p className="text-sm text-red-600">{errors.critical_level.message}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="description">Açıklama</Label>
            <Textarea
              id="description"
              {...register('description')}
              placeholder="Ürün açıklaması"
              disabled={isLoading}
            />
            {errors.description && <p className="text-sm text-red-600">{errors.description.message}</p>}
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
              İptal
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? 'Kaydediliyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}