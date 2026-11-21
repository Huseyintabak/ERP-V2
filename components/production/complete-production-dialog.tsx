'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, Package, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

interface ProductionPlan {
  id: string;
  order_id?: string;
  product_id?: string;
  order_number: string;
  product_name: string;
  planned_quantity: number;
  produced_quantity?: number;
  status: string;
  created_at: string;
}

interface CompleteProductionDialogProps {
  plan: ProductionPlan;
  onComplete?: () => void;
}

export function CompleteProductionDialog({ plan, onComplete }: CompleteProductionDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Planı tamamlar. Operatör ekranıyla aynı yol: /api/production/plan-status (action: complete).
  // Stok, üretim kayıtları girilirken trigger'larla güncellenir; burada stoğa ayrıca dokunulmaz.
  // (Önceki /api/production/complete çağrısı kalan miktarı BOM tüketimi yapmadan nihai ürün
  // stoğuna ekliyordu; plan durumunu da geçersiz 'completed' değeriyle güncellemeye çalışıyordu.)
  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const remaining = (plan.planned_quantity || 0) - (plan.produced_quantity || 0);
      if (remaining > 0) {
        toast.error('Plan tamamlanamaz', {
          description: `Hedefe ${remaining} adet kaldı. Önce operatör üretim kaydı girmeli.`,
        });
        return;
      }

      const response = await fetch('/api/production/plan-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: plan.id, action: 'complete' }),
      });
      const data = await response.json();

      if (response.ok && data.success) {
        toast.success('Üretim planı tamamlandı', {
          description: `Sipariş ${plan.order_number}: kalan rezervasyonlar serbest bırakıldı.`,
        });
        setIsOpen(false);
        onComplete?.();
      } else {
        toast.error('Plan tamamlanamadı', {
          description: data.error || 'Bilinmeyen bir hata oluştu.',
        });
      }
    } catch (error: any) {
      logger.error('Complete production error:', error);
      toast.error('Plan tamamlanamadı', {
        description: error.message || 'Bağlantı hatası oluştu.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'planlandi':
        return <Badge variant="secondary">Planlandı</Badge>;
      case 'devam_ediyor':
        return <Badge variant="default">Devam Ediyor</Badge>;
      case 'tamamlandi':
        return <Badge variant="outline" className="text-green-600 border-green-600">Tamamlandı</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // Üretim tamamlanmamış ve devam ediyor veya planlandı durumunda olmalı
  const remainingQuantity = (plan.planned_quantity || 0) - (plan.produced_quantity || 0);
  const canComplete = (plan.status === 'devam_ediyor' || plan.status === 'planlandi') && remainingQuantity > 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>
        <Button 
          variant="default" 
          size="sm"
          disabled={!canComplete}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle className="h-4 w-4 mr-2" />
          Üretimi Tamamla
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent className="max-w-2xl">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Üretim Tamamlama
          </AlertDialogTitle>
          <AlertDialogDescription>
            Bu işlem geri alınamaz. Üretim tamamlandığında stoklar otomatik olarak güncellenecek.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <div className="space-y-4">
          {/* Production Plan Details */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Üretim Planı Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Sipariş No</label>
                  <p className="font-semibold">{plan.order_number}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Durum</label>
                  <div className="mt-1">{getStatusBadge(plan.status)}</div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Ürün</label>
                  <p className="font-semibold">{plan.product_name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Planlanan Miktar</label>
                  <p className="font-semibold">{plan.planned_quantity.toLocaleString()} adet</p>
                </div>
                {plan.produced_quantity && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-gray-500">Üretilen Miktar</label>
                    <p className="font-semibold">{plan.produced_quantity.toLocaleString()} adet</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Warning */}
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertTriangle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
            <div className="text-sm">
              <p className="font-medium text-amber-800">Dikkat!</p>
              <p className="text-amber-700 mt-1">
                Üretim tamamlandığında:
              </p>
              <ul className="list-disc list-inside text-amber-700 mt-2 space-y-1">
                <li>BOM&apos;a göre malzemeler otomatik tüketilecek</li>
                <li>Nihai ürün stoka eklenecek</li>
                <li>Stok hareketleri kaydedilecek</li>
                <li>Bildirim gönderilecek</li>
              </ul>
            </div>
          </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>
            İptal
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={handleComplete}
            disabled={isLoading}
            className="bg-green-600 hover:bg-green-700"
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Tamamlanıyor...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4 mr-2" />
                Üretimi Tamamla
              </>
            )}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
