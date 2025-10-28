'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

interface BreakModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function BreakModal({ isOpen, onClose, onSuccess }: BreakModalProps) {
  const [breakType, setBreakType] = useState<'lunch' | 'rest' | 'other'>('rest');
  const [duration, setDuration] = useState(15);
  const [loading, setLoading] = useState(false);
  const { user } = useAuthStore();

  const handleBreak = async () => {
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
          action: 'break',
          breakType: breakType,
          duration: duration,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to start break');
      }

      toast.success('Mola başlatıldı');
      onSuccess();
      onClose();
    } catch (error) {
      logger.error('Error starting break:', error);
      toast.error(error instanceof Error ? error.message : 'Mola başlatılamadı');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Mola Bildir</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="breakType">Mola Türü</Label>
            <Select value={breakType} onValueChange={(value: 'lunch' | 'rest' | 'other') => setBreakType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="rest">Dinlenme</SelectItem>
                <SelectItem value="lunch">Yemek Molası</SelectItem>
                <SelectItem value="other">Diğer</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="duration">Süre (Dakika)</Label>
            <Input
              id="duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(Number(e.target.value))}
              min="5"
              max="120"
            />
          </div>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose} disabled={loading}>
              İptal
            </Button>
            <Button onClick={handleBreak} disabled={loading}>
              {loading ? 'Başlatılıyor...' : 'Mola Başlat'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
