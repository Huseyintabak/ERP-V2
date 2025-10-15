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
  X
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  status: string;
  created_at: string;
  created_by: string;
  production_plans?: Array<{
    id: string;
    product_name: string;
    target_quantity: number;
    produced_quantity: number;
    status: string;
  }>;
}

interface OrderCancelDialogProps {
  isOpen: boolean;
  onClose: () => void;
  order: Order | null;
  onCancelSuccess: () => void;
}

export function OrderCancelDialog({
  isOpen,
  onClose,
  order,
  onCancelSuccess
}: OrderCancelDialogProps) {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [isCancelling, setIsCancelling] = useState(false);
  const [permissionCheck, setPermissionCheck] = useState<{
    allowed: boolean;
    reason: string;
  } | null>(null);

  useEffect(() => {
    if (isOpen && order) {
      checkPermission();
    }
  }, [isOpen, order]);

  const checkPermission = async () => {
    if (!order || !user) return;

    try {
      const response = await fetch(`/api/orders/cancel-permission?orderId=${order.id}`);
      const data = await response.json();
      setPermissionCheck(data);
    } catch (error) {
      console.error('Permission check error:', error);
      setPermissionCheck({ allowed: false, reason: 'İzin kontrolü başarısız' });
    }
  };

  const handleCancel = async () => {
    if (!reason.trim() || !order) {
      toast.error('İptal sebebi belirtilmelidir');
      return;
    }

    try {
      setIsCancelling(true);

      const response = await fetch('/api/orders/cancel', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          orderId: order.id,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'İptal işlemi başarısız');
      }

      toast.success('Sipariş başarıyla iptal edildi');
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

  if (!order) return null;

  const hasCompletedPlans = order.production_plans?.some(plan => plan.status === 'tamamlandi');
  const hasProduction = order.production_plans?.some(plan => plan.produced_quantity > 0);
  const totalPlans = order.production_plans?.length || 0;
  const completedPlans = order.production_plans?.filter(plan => plan.status === 'tamamlandi').length || 0;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-600" />
            Sipariş İptal Et
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Sipariş Detayları */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Sipariş Detayları</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm font-medium">Sipariş No</Label>
                  <div className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-gray-500" />
                    <span className="font-mono">{order.order_number}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Müşteri</Label>
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4 text-gray-500" />
                    <span>{order.customer_name}</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Durum</Label>
                  <div className="flex items-center gap-2">
                    {getStatusBadge(order.status)}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm font-medium">Oluşturulma Tarihi</Label>
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-500" />
                    <span className="text-sm">{formatDate(order.created_at)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Plan Detayları */}
          {order.production_plans && order.production_plans.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Üretim Planları</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {order.production_plans.map((plan) => (
                    <div key={plan.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                          <Package className="h-4 w-4 text-white" />
                        </div>
                        <div>
                          <div className="font-medium">{plan.product_name}</div>
                          <div className="text-sm text-gray-500">
                            Hedef: {plan.target_quantity} | Üretilen: {plan.produced_quantity}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {getStatusBadge(plan.status)}
                        {plan.status === 'tamamlandi' && (
                          <CheckCircle className="h-4 w-4 text-green-600" />
                        )}
                        {plan.produced_quantity > 0 && (
                          <Clock className="h-4 w-4 text-orange-600" />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>Özet:</strong> {totalPlans} plan, {completedPlans} tamamlandı, {hasProduction ? 'Üretim başlamış' : 'Üretim başlamamış'}
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

          {permissionCheck?.allowed && hasCompletedPlans && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bu siparişte tamamlanan planlar bulunmaktadır. İptal işlemi tüm planları iptal edecektir.
              </AlertDescription>
            </Alert>
          )}

          {permissionCheck?.allowed && hasProduction && !hasCompletedPlans && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Bu siparişte üretim başlamış ancak henüz tamamlanmamış planlar bulunmaktadır.
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
                  <li>• <strong>Sipariş durumu:</strong> "iptal" olarak değiştirilecek</li>
                  <li>• <strong>Tüm planlar:</strong> İptal edilecek</li>
                  <li>• <strong>Rezervasyonlar:</strong> Serbest bırakılacak</li>
                  <li>• <strong>Stok hareketleri:</strong> Geri alınacak</li>
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
            {isCancelling ? 'İptal Ediliyor...' : 'Siparişi İptal Et'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
