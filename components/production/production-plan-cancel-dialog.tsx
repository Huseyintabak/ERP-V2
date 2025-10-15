'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  XCircle, 
  AlertTriangle, 
  Package, 
  Calendar, 
  User, 
  Clock,
  CheckCircle,
  Target,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface ProductionPlan {
  id: string;
  order_id: string;
  product_name: string;
  target_quantity: number;
  produced_quantity: number;
  status: string;
  created_at: string;
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    status: string;
    created_by: string;
  };
}

interface ProductionPlanCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProductionPlan | null;
  onCancelSuccess: () => void;
}

export function ProductionPlanCancelDialog({
  isOpen,
  onClose,
  plan,
  onCancelSuccess
}: ProductionPlanCancelDialogProps) {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && plan) {
      checkPermission();
    }
  }, [isOpen, plan]);

  const checkPermission = async () => {
    if (!plan || !user) return;

    try {
      const response = await fetch(`/api/production-plans/cancel-permission?planId=${plan.id}`);
      const data = await response.json();
      setPermissionCheck(data);
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionCheck({ allowed: false, reason: 'İzin kontrolü başarısız' });
    }
  };

  const handleCancel = async () => {
    if (!reason.trim() || !plan) {
      toast.error('İptal sebebi belirtilmelidir');
      return;
    }

    try {
      setIsCancelling(true);

      const response = await fetch('/api/production-plans/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planId: plan.id,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'İptal işlemi başarısız');
      }

      toast.success('Üretim planı başarıyla iptal edildi');
      onCancelSuccess();
      onClose();
      setReason('');

    } catch (error: any) {
      console.error('Cancel error:', error);
      toast.error(error.message || 'İptal işlemi başarısız');
    } finally {
      setIsCancelling(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'beklemede':
        return <Badge variant="secondary">Beklemede</Badge>;
      case 'onaylandi':
        return <Badge variant="default">Onaylandı</Badge>;
      case 'planlandi':
        return <Badge variant="outline">Planlandı</Badge>;
      case 'uretimde':
        return <Badge variant="destructive">Üretimde</Badge>;
      case 'tamamlandi':
        return <Badge className="bg-green-600">Tamamlandı</Badge>;
      case 'iptal':
        return <Badge variant="outline" className="text-red-600">İptal</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (!plan) return null;

  const progress = Math.round((plan.produced_quantity / plan.target_quantity) * 100);
  const remaining = plan.target_quantity - plan.produced_quantity;
  const hasProduction = plan.produced_quantity > 0;
  const isCompleted = plan.status === 'tamamlandi';

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Üretim Planı İptal Et
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Plan Detayları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Plan Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Ürün</Label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{plan.product_name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Durum</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(plan.status)}
                    {isCompleted && (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Hedef Miktar</Label>
                  <div className="flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{plan.target_quantity} adet</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Üretilen Miktar</Label>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{plan.produced_quantity} adet</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">İlerleme</Label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-medium">{progress}%</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Kalan</Label>
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4 text-gray-500" />
                    <span className="font-medium">{remaining} adet</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Sipariş Detayları */}
          {plan.order && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Bağlı Sipariş</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sipariş No</Label>
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-500" />
                      <span className="font-mono">{plan.order.order_number}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Müşteri</Label>
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-500" />
                      <span>{plan.order.customer_name}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Sipariş Durumu</Label>
                    <div className="flex items-center gap-2">
                      {getStatusBadge(plan.order.status)}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Oluşturulma Tarihi</Label>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4 text-gray-500" />
                      <span className="text-sm">{formatDate(plan.created_at)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Uyarılar */}
          {permissionCheck && !permissionCheck.allowed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {permissionCheck.reason}
              </AlertDescription>
            </Alert>
          )}

          {permissionCheck?.allowed && isCompleted && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bu plan tamamlanmıştır ve iptal edilemez.
              </AlertDescription>
            </Alert>
          )}

          {permissionCheck?.allowed && hasProduction && !isCompleted && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bu planda üretim başlamıştır. İptal işlemi üretilen miktarı geri alacaktır.
              </AlertDescription>
            </Alert>
          )}

          {/* İptal Sebebi */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              İptal Sebebi *
            </Label>
            <Textarea
              id="reason"
              placeholder="İptal sebebini açıklayın..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={!permissionCheck?.allowed}
            />
            <p className="text-xs text-muted-foreground">
              Bu sebep audit log'da kaydedilecektir.
            </p>
          </div>

          {/* Etki Analizi */}
          {permissionCheck?.allowed && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">İptal Etkisi</Label>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <ul className="text-sm space-y-1">
                  <li>• <strong>Plan durumu:</strong> "iptal" olarak değiştirilecek</li>
                  <li>• <strong>Rezervasyonlar:</strong> Serbest bırakılacak</li>
                  {hasProduction && (
                    <li>• <strong>Üretilen miktar:</strong> Stoktan düşülecek</li>
                  )}
                  <li>• <strong>BOM malzemeleri:</strong> Stoka geri eklenecek</li>
                  <li>• <strong>Bu işlem:</strong> Geri alınamaz</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isCancelling}>
            İptal
          </Button>
          <Button
            onClick={handleCancel}
            disabled={!permissionCheck?.allowed || !reason.trim() || isCancelling}
            className="bg-red-600 hover:bg-red-700"
          >
            {isCancelling ? 'İptal Ediliyor...' : 'Planı İptal Et'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
