'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

interface CompleteTaskModalProps {
  task: any;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function CompleteTaskModal({ task, isOpen, onClose, onSuccess }: CompleteTaskModalProps) {
  const [quantity, setQuantity] = useState(1);
  const [barcode, setBarcode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleComplete = async () => {
    if (!task) return;

    setLoading(true);
    try {
      const response = await fetch('/api/production/actions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          action: 'complete',
          planId: task.id,
          quantity: quantity,
          barcode: barcode || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to complete task');
      }

      toast.success('Görev başarıyla tamamlandı');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error completing task:', error);
      toast.error(error instanceof Error ? error.message : 'Görev tamamlanamadı');
    } finally {
      setLoading(false);
    }
  };

  if (!task) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Görevi Tamamla</DialogTitle>
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
            <Label>Üretilen Miktar</Label>
            <p className="text-sm font-medium">{task.produced_quantity || 0} adet</p>
          </div>
          <div>
            <Label htmlFor="quantity">Tamamlanan Miktar</Label>
            <Input
              id="quantity"
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value))}
              min="1"
              max={task.planned_quantity - (task.produced_quantity || 0)}
            />
          </div>
          <div>
            <Label htmlFor="barcode">Barkod (Opsiyonel)</Label>
            <Input
              id="barcode"
              type="text"
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="Ürün barkodunu girin"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button onClick={handleComplete} disabled={loading}>
              {loading ? 'Tamamlanıyor...' : 'Tamamla'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
