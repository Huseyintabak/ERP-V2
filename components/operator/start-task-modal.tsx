'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

interface StartTaskModalProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function StartTaskModal({ task, isOpen, onClose, onSuccess }: StartTaskModalProps) {
  const [quantity, setQuantity] = useState(task?.planned_quantity || 1);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleStart = async () => {
    if (!task) return;

    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/production/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          action: 'start',
          planId: task.id,
          quantity: quantity,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start task');
      }

      toast.success('Görev başarıyla başlatıldı');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error starting task:', error);
      toast.error(error instanceof Error ? error.message : 'Görev başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Görevi Başlat</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Sipariş</Label>
            <p className="text-sm font-medium">{task.order?.order_number || 'N/A'}</p>
          </div>
          <div>
            <Label>Ürün</Label>
            <p className="text-sm font-medium">{task.product?.name || 'N/A'}</p>
          </div>
          <div>
            <Label>Müşteri</Label>
            <p className="text-sm font-medium">{task.order?.customer_name || 'N/A'}</p>
          </div>
          <div>
            <Label>Planlanan Miktar</Label>
            <p className="text-sm font-medium">{task.planned_quantity} adet</p>
          </div>
          <div>
            <Label htmlFor="quantity">Başlatılacak Miktar</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              max={task.planned_quantity}
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button onClick={handleStart} disabled={loading}>
              {loading ? 'Başlatılıyor...' : 'Başlat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
