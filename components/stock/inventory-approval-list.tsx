'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { CheckCircle, XCircle, AlertTriangle, TrendingUp, TrendingDown, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';

interface InventoryCount {
  id: string;
  material_type: string;
  material_code: string;
  material_name: string;
  system_quantity: number;
  physical_quantity: number;
  difference: number;
  variance_percentage: number;
  notes: string;
  created_at: string;
  counted_by_user: {
    name: string;
    email: string;
  };
}

export function InventoryApprovalList() {
  const [counts, setCounts] = useState<InventoryCount[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedCount, setSelectedCount] = useState<InventoryCount | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const { user } = useAuthStore();

  useEffect(() => {
    fetchPendingCounts();
  }, []);

  const fetchPendingCounts = async () => {
    setLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/stock/count?status=pending&limit=100', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      setCounts(result.data || []);
    } catch (error: any) {
      toast.error('Sayımlar yüklenemedi');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (countId: string, autoAdjust: boolean = true) => {
    if (!confirm(`Bu sayımı onaylıyor musunuz?${autoAdjust ? ' Stok otomatik güncellenecek.' : ''}`)) {
      return;
    }

    setActionLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/stock/count/${countId}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ action: 'approve', autoAdjust })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(result.message || 'Sayım onaylandı');
      fetchPendingCounts();

    } catch (error: any) {
      toast.error(error.message || 'Onaylama hatası');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedCount) return;

    if (!rejectReason.trim()) {
      toast.error('Lütfen red sebebi girin');
      return;
    }

    setActionLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/stock/count/${selectedCount.id}`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({ action: 'reject', reason: rejectReason })
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(result.message || 'Sayım reddedildi');
      setRejectDialogOpen(false);
      setRejectReason('');
      setSelectedCount(null);
      fetchPendingCounts();

    } catch (error: any) {
      toast.error(error.message || 'Reddetme hatası');
    } finally {
      setActionLoading(false);
    }
  };

  const getVarianceBadge = (variance: number) => {
    const absVariance = Math.abs(variance);
    if (absVariance > 10) {
      return <Badge variant="destructive">Yüksek Sapma</Badge>;
    }
    if (absVariance > 5) {
      return <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Orta Sapma</Badge>;
    }
    if (absVariance > 0) {
      return <Badge variant="default">Düşük Sapma</Badge>;
    }
    return <Badge variant="default" className="bg-green-100 text-green-800">Eşleşme</Badge>;
  };

  const getMaterialTypeBadge = (type: string) => {
    const types = {
      raw: { label: 'Hammadde', variant: 'secondary' as const },
      semi: { label: 'Yarı Mamul', variant: 'default' as const },
      finished: { label: 'Nihai Ürün', variant: 'default' as const }
    };
    const config = types[type as keyof typeof types] || { label: type, variant: 'default' as const };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-2 text-sm text-gray-500">Yükleniyor...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (counts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Onay Bekleyen Sayım Yok
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">
            Tüm envanter sayımları işleme alınmış.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            Onay Bekleyen Envanter Sayımları ({counts.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Malzeme</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead className="text-right">Sistem</TableHead>
                  <TableHead className="text-right">Fiziki</TableHead>
                  <TableHead className="text-right">Fark</TableHead>
                  <TableHead>Sapma</TableHead>
                  <TableHead>Sayan</TableHead>
                  <TableHead>Tarih</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {counts.map((count) => (
                  <TableRow key={count.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{count.material_name}</p>
                        <p className="text-xs text-gray-500 font-mono">{count.material_code}</p>
                      </div>
                    </TableCell>
                    <TableCell>
                      {getMaterialTypeBadge(count.material_type)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {count.system_quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono font-semibold">
                      {count.physical_quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className={`text-right font-mono font-semibold ${
                      count.difference > 0 ? 'text-green-600' : count.difference < 0 ? 'text-red-600' : 'text-gray-600'
                    }`}>
                      {count.difference > 0 ? '+' : ''}{count.difference.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {getVarianceBadge(count.variance_percentage)}
                      <p className="text-xs text-gray-500 mt-1">
                        {count.variance_percentage > 0 ? '+' : ''}{count.variance_percentage.toFixed(2)}%
                      </p>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="text-sm">{count.counted_by_user?.name}</p>
                        <p className="text-xs text-gray-500">{count.counted_by_user?.email}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-gray-500">
                      {new Date(count.created_at).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleApprove(count.id, true)}
                          disabled={actionLoading}
                          title="Onayla ve Stok Güncelle"
                        >
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setSelectedCount(count);
                            setRejectDialogOpen(true);
                          }}
                          disabled={actionLoading}
                          title="Reddet"
                        >
                          <XCircle className="w-4 h-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Reddetme Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Envanter Sayımı Reddet</DialogTitle>
            <DialogDescription>
              {selectedCount?.material_code} - {selectedCount?.material_name}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="rejectReason">Red Sebebi</Label>
              <Textarea
                id="rejectReason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Neden reddedildiğini açıklayın..."
                rows={3}
              />
            </div>

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialogOpen(false);
                  setRejectReason('');
                  setSelectedCount(null);
                }}
                disabled={actionLoading}
              >
                İptal
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={actionLoading || !rejectReason.trim()}
              >
                {actionLoading ? 'Reddediliyor...' : 'Reddet'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

