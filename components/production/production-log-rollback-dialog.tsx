'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Clock, User, Package, AlertTriangle, Undo2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface ProductionLog {
  id: string;
  plan_id: string;
  quantity_produced: number;
  barcode_scanned: string;
  created_at: string;
  operator_id: string;
  operator?: {
    name: string;
    email: string;
  };
  production_plans?: {
    id: string;
    product_name: string;
    target_quantity: number;
    produced_quantity: number;
    status: string;
  };
}

interface ProductionLogRollbackDialogProps {
  isOpen: boolean;
  onClose: () => void;
  log: ProductionLog | null;
  onRollbackSuccess: () => void;
}

export function ProductionLogRollbackDialog({
  isOpen,
  onClose,
  log,
  onRollbackSuccess
}: ProductionLogRollbackDialogProps) {
  const { user } = useAuthStore();
  const [reason, setReason] = useState('');
  const [isRollingBack, setIsRollingBack] = useState(false);

  if (!log) return null;

  const canRollback = checkRollbackPermission(log, user);
  const timeDiffMinutes = Math.floor(
    (new Date().getTime() - new Date(log.created_at).getTime()) / (1000 * 60)
  );

  const handleRollback = async () => {
    if (!reason.trim()) {
      toast.error('Geri alma sebebi belirtilmelidir');
      return;
    }

    try {
      setIsRollingBack(true);

      const response = await fetch('/api/production-logs/rollback', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          logId: log.id,
          reason: reason.trim(),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Geri alma işlemi başarısız');
      }

      toast.success('Üretim kaydı başarıyla geri alındı');
      onRollbackSuccess();
      onClose();
      setReason('');

    } catch (error: any) {
      console.error('Rollback error:', error);
      toast.error(error.message || 'Geri alma işlemi başarısız');
    } finally {
      setIsRollingBack(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Undo2 className="h-5 w-5 text-orange-600" />
            Üretim Kaydı Geri Alma
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Kayıt Detayları */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Kayıt Detayları</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm font-medium">Ürün</Label>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-gray-500" />
                  <span>{log.production_plans?.product_name || 'Bilinmiyor'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Üretilen Miktar</Label>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{log.quantity_produced} adet</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Barkod</Label>
                <div className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                  {log.barcode_scanned}
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Operatör</Label>
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-gray-500" />
                  <span>{log.operator?.name || 'Bilinmiyor'}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Kayıt Zamanı</Label>
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-gray-500" />
                  <span className="text-sm">{formatDate(log.created_at)}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-sm font-medium">Geçen Süre</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm">
                    {timeDiffMinutes} dakika önce
                  </span>
                  {timeDiffMinutes > 5 && user?.role === 'operator' && (
                    <Badge variant="destructive" className="text-xs">
                      Süre Aşımı
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Uyarılar */}
          {!canRollback.allowed && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                {canRollback.reason}
              </AlertDescription>
            </Alert>
          )}

          {canRollback.allowed && user?.role === 'operator' && timeDiffMinutes > 3 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Operatörler sadece son 5 dakika içindeki kayıtları geri alabilir. 
                Bu kayıt {timeDiffMinutes} dakika önce oluşturuldu.
              </AlertDescription>
            </Alert>
          )}

          {/* Geri Alma Sebebi */}
          <div className="space-y-2">
            <Label htmlFor="reason" className="text-sm font-medium">
              Geri Alma Sebebi *
            </Label>
            <Textarea
              id="reason"
              placeholder="Geri alma sebebini açıklayın..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              disabled={!canRollback.allowed}
            />
            <p className="text-xs text-muted-foreground">
              Bu sebep audit log'da kaydedilecektir.
            </p>
          </div>

          {/* Etki Analizi */}
          {canRollback.allowed && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">Geri Alma Etkisi</Label>
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <ul className="text-sm space-y-1">
                  <li>• <strong>Nihai ürün stoku:</strong> {log.quantity_produced} adet azalacak</li>
                  <li>• <strong>Plan ilerlemesi:</strong> Üretilen miktar düşürülecek</li>
                  <li>• <strong>Hammadde stoku:</strong> BOM'a göre geri eklenecek</li>
                  <li>• <strong>Bu kayıt:</strong> Tamamen silinecek</li>
                </ul>
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isRollingBack}>
            İptal
          </Button>
          <Button
            onClick={handleRollback}
            disabled={!canRollback.allowed || !reason.trim() || isRollingBack}
            className="bg-orange-600 hover:bg-orange-700"
          >
            {isRollingBack ? 'Geri Alınıyor...' : 'Geri Al'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function checkRollbackPermission(log: ProductionLog, user: any) {
  if (!user) {
    return { allowed: false, reason: 'Kullanıcı oturumu bulunamadı' };
  }

  const isAdmin = user.role === 'yonetici' || user.role === 'planlama';
  const isOperator = user.role === 'operator';
  const isLogOwner = log.operator_id === user.id;

  // Admin ve planlama rolleri her zaman rollback yapabilir
  if (isAdmin) {
    return { allowed: true, reason: '' };
  }

  // Operatörler için kontroller
  if (isOperator) {
    // Kendi kaydı mı kontrol et
    if (!isLogOwner) {
      return { allowed: false, reason: 'Sadece kendi kayıtlarınızı geri alabilirsiniz' };
    }

    // Zaman kontrolü (5 dakika)
    const timeDiffMinutes = Math.floor(
      (new Date().getTime() - new Date(log.created_at).getTime()) / (1000 * 60)
    );

    if (timeDiffMinutes > 5) {
      return { allowed: false, reason: 'Operatörler sadece son 5 dakika içindeki kayıtları geri alabilir' };
    }

    // Plan durumu kontrolü
    if (log.production_plans?.status === 'tamamlandi') {
      return { allowed: false, reason: 'Tamamlanan planlardaki kayıtlar geri alınamaz' };
    }

    return { allowed: true, reason: '' };
  }

  return { allowed: false, reason: 'Bu işlem için yetkiniz bulunmuyor' };
}
