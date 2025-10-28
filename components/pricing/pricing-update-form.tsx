'use client';

import { useState } from 'react';
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
import { Badge } from '@/components/ui/badge';
import { DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

const pricingSchema = z.object({
  salePrice: z.number().positive(`Satış fiyatı 0'dan büyük olmalı`),
  costPrice: z.number().min(0, 'Maliyet negatif olamaz').optional(),
  profitMargin: z.number().min(0).max(100, 'Kar marjı 0-100 arası olmalı').optional(),
  notes: z.string().optional()
});

type PricingFormData = z.infer<typeof pricingSchema>;

interface PricingUpdateFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  productId: string;
  productCode: string;
  productName: string;
  currentSalePrice: number;
  currentCostPrice?: number;
  currentMargin?: number;
  onSuccess?: () => void;
}

export function PricingUpdateForm({
  open,
  onOpenChange,
  productId,
  productCode,
  productName,
  currentSalePrice,
  currentCostPrice = 0,
  currentMargin = 20,
  onSuccess
}: PricingUpdateFormProps) {
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors }
  } = useForm<PricingFormData>({
    resolver: zodResolver(pricingSchema),
    defaultValues: {
      salePrice: currentSalePrice,
      costPrice: currentCostPrice,
      profitMargin: currentMargin
    }
  });

  const watchSalePrice = watch('salePrice');
  const watchCostPrice = watch('costPrice') || 0;
  const watchMargin = watch('profitMargin') || 0;

  // Gerçek kar marjı hesapla
  const actualProfit = watchSalePrice - watchCostPrice;
  const actualMarginPercent = watchCostPrice > 0 
    ? ((actualProfit / watchCostPrice) * 100).toFixed(2)
    : '0.00';

  // Hedef marj ile önerilen fiyat hesapla
  const recommendedPrice = watchCostPrice * (1 + watchMargin / 100);

  const onSubmit = async (data: PricingFormData) => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/stock/finished/${productId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          sale_price: data.salePrice,
          cost_price: data.costPrice || 0,
          profit_margin: data.profitMargin || 20
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error);
      }

      toast.success('Fiyatlandırma güncellendi');
      onSuccess?.();
      onOpenChange(false);

    } catch (error: any) {
      toast.error(error.message || 'Güncelleme hatası');
    } finally {
      setLoading(false);
    }
  };

  const calculatePriceWithMargin = () => {
    if (watchCostPrice > 0 && watchMargin > 0) {
      const newPrice = watchCostPrice * (1 + watchMargin / 100);
      setValue('salePrice', parseFloat(newPrice.toFixed(2)));
      toast.success(`Fiyat %${watchMargin} marj ile hesaplandı`);
    } else {
      toast.error('Maliyet ve marj değerlerini girin');
    }
  };

  const getProfitabilityColor = () => {
    const profit = parseFloat(actualMarginPercent);
    if (profit < 0) return 'text-red-600';
    if (profit < 10) return 'text-yellow-600';
    if (profit < 25) return 'text-blue-600';
    return 'text-green-600';
  };

  const getProfitabilityStatus = () => {
    const profit = parseFloat(actualMarginPercent);
    if (profit < 0) return <Badge variant="destructive">Zarar</Badge>;
    if (profit < 10) return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Düşük Marj</Badge>;
    if (profit < 25) return <Badge variant="default">Normal Marj</Badge>;
    return <Badge variant="default" className="bg-green-100 text-green-800">Yüksek Marj</Badge>;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Fiyatlandırma Güncelle
          </DialogTitle>
          <DialogDescription>
            {productCode} - {productName}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Mevcut Değerler */}
          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
            <h3 className="font-semibold text-sm">Mevcut Değerler</h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <p className="text-gray-600">Satış Fiyatı</p>
                <p className="font-semibold">₺{currentSalePrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-gray-600">Maliyet</p>
                <p className="font-semibold">₺{currentCostPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}</p>
              </div>
              <div>
                <p className="text-gray-600">Hedef Marj</p>
                <p className="font-semibold">{currentMargin}%</p>
              </div>
            </div>
          </div>

          {/* Form Alanları */}
          <div className="grid grid-cols-2 gap-4">
            {/* Maliyet */}
            <div className="space-y-2">
              <Label htmlFor="costPrice">Maliyet (₺)</Label>
              <Input
                id="costPrice"
                type="number"
                step="0.01"
                {...register('costPrice', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.costPrice && (
                <p className="text-sm text-red-600">{errors.costPrice.message}</p>
              )}
            </div>

            {/* Hedef Marj */}
            <div className="space-y-2">
              <Label htmlFor="profitMargin">Hedef Kar Marjı (%)</Label>
              <Input
                id="profitMargin"
                type="number"
                step="1"
                {...register('profitMargin', { valueAsNumber: true })}
                placeholder="20"
              />
              {errors.profitMargin && (
                <p className="text-sm text-red-600">{errors.profitMargin.message}</p>
              )}
            </div>
          </div>

          {/* Satış Fiyatı */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="salePrice">Satış Fiyatı (₺)</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={calculatePriceWithMargin}
                className="gap-2"
              >
                <Calculator className="w-4 h-4" />
                Marj ile Hesapla
              </Button>
            </div>
            <Input
              id="salePrice"
              type="number"
              step="0.01"
              {...register('salePrice', { valueAsNumber: true })}
              placeholder="0.00"
              className="text-lg font-semibold"
            />
            {errors.salePrice && (
              <p className="text-sm text-red-600">{errors.salePrice.message}</p>
            )}
          </div>

          {/* Canlı Kar Analizi */}
          <div className="border rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" />
              <h3 className="font-semibold text-sm">Kar Analizi</h3>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <p className="text-xs text-gray-600">Kar Tutarı</p>
                <p className={`text-lg font-bold ${getProfitabilityColor()}`}>
                  ₺{actualProfit.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Gerçek Marj</p>
                <p className={`text-lg font-bold ${getProfitabilityColor()}`}>
                  {actualMarginPercent}%
                </p>
              </div>

              <div>
                <p className="text-xs text-gray-600">Durum</p>
                <div className="mt-1">
                  {getProfitabilityStatus()}
                </div>
              </div>
            </div>

            {watchCostPrice > 0 && watchMargin > 0 && (
              <div className="bg-blue-50 rounded p-3 text-sm">
                <p className="text-gray-700">
                  <strong>Önerilen Fiyat:</strong> ₺
                  {recommendedPrice.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  {' '}
                  (%{watchMargin} marj ile)
                </p>
              </div>
            )}
          </div>

          {/* Notlar */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notlar (Opsiyonel)</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Fiyat değişikliği ile ilgili notlar..."
              rows={3}
            />
          </div>

          {/* Butonlar */}
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              İptal
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Güncelleniyor...' : 'Kaydet'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

