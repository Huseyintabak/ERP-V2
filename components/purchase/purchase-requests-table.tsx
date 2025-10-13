'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Package,
  ShoppingCart,
  Truck,
  Trash2
} from 'lucide-react';
import { toast } from 'sonner';

interface PurchaseRequest {
  id: string;
  material_type: 'raw' | 'semi';
  material_id: string;
  material_name: string;
  material_code: string;
  material_unit: string;
  current_stock: number;
  requested_quantity: number;
  approved_quantity?: number;
  status: 'pending' | 'approved' | 'rejected' | 'ordered' | 'received' | 'cancelled';
  priority: 'low' | 'normal' | 'high' | 'critical';
  notes?: string;
  created_at: string;
  approved_at?: string;
  ordered_at?: string;
  received_at?: string;
}

interface PurchaseRequestsTableProps {
  requests: PurchaseRequest[];
  onUpdateRequest: (requestId: string, updates: Partial<PurchaseRequest>) => void;
  onDeleteRequest: (requestId: string) => void;
}

export function PurchaseRequestsTable({ 
  requests, 
  onUpdateRequest, 
  onDeleteRequest 
}: PurchaseRequestsTableProps) {
  const [selectedRequest, setSelectedRequest] = useState<PurchaseRequest | null>(null);
  const [isUpdateDialogOpen, setIsUpdateDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [updateData, setUpdateData] = useState({
    status: '',
    notes: '',
    approved_quantity: ''
  });

  const getStatusBadge = (status: string) => {
    const statusMap = {
      'pending': { label: 'Bekliyor', variant: 'secondary' as const, icon: Clock },
      'approved': { label: 'Onaylandı', variant: 'default' as const, icon: CheckCircle },
      'rejected': { label: 'Reddedildi', variant: 'destructive' as const, icon: XCircle },
      'ordered': { label: 'Sipariş Verildi', variant: 'default' as const, icon: ShoppingCart },
      'received': { label: 'Teslim Alındı', variant: 'outline' as const, icon: Truck },
      'cancelled': { label: 'İptal Edildi', variant: 'destructive' as const, icon: XCircle },
    };
    
    const config = statusMap[status as keyof typeof statusMap] || { 
      label: status, 
      variant: 'secondary' as const, 
      icon: Clock 
    };
    const Icon = config.icon;
    
    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {config.label}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const priorityMap = {
      'low': { label: 'Düşük', variant: 'secondary' as const },
      'normal': { label: 'Normal', variant: 'default' as const },
      'high': { label: 'Yüksek', variant: 'default' as const },
      'critical': { label: 'Kritik', variant: 'destructive' as const },
    };
    
    const config = priorityMap[priority as keyof typeof priorityMap] || { 
      label: priority, 
      variant: 'secondary' as const 
    };
    
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleUpdateRequest = () => {
    if (!selectedRequest || !updateData.status) return;

    const updates: Partial<PurchaseRequest> = {
      status: updateData.status as any
    };

    if (updateData.notes) {
      updates.notes = updateData.notes;
    }

    if (updateData.approved_quantity) {
      updates.approved_quantity = parseInt(updateData.approved_quantity);
    }

    onUpdateRequest(selectedRequest.id, updates);
    setIsUpdateDialogOpen(false);
    setUpdateData({ status: '', notes: '', approved_quantity: '' });
    setSelectedRequest(null);
  };

  const handleDeleteRequest = () => {
    if (!selectedRequest) return;
    
    onDeleteRequest(selectedRequest.id);
    setIsDeleteDialogOpen(false);
    setSelectedRequest(null);
  };

  const openUpdateDialog = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setUpdateData({
      status: request.status,
      notes: request.notes || '',
      approved_quantity: request.approved_quantity?.toString() || ''
    });
    setIsUpdateDialogOpen(true);
  };

  const openDeleteDialog = (request: PurchaseRequest) => {
    setSelectedRequest(request);
    setIsDeleteDialogOpen(true);
  };

  const canUpdate = (request: PurchaseRequest) => {
    return ['pending', 'approved'].includes(request.status);
  };

  const canDelete = (request: PurchaseRequest) => {
    return request.status === 'pending';
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Sipariş Talepleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          {requests.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz sipariş talebi bulunmuyor
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Malzeme</TableHead>
                    <TableHead>Tür</TableHead>
                    <TableHead>Mevcut Stok</TableHead>
                    <TableHead>Talep Miktarı</TableHead>
                    <TableHead>Onay Miktarı</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((request) => (
                    <TableRow key={request.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{request.material_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {request.material_code}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {request.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span>{request.current_stock}</span>
                          <span className="text-sm text-muted-foreground">
                            {request.material_unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">{request.requested_quantity}</span>
                          <span className="text-sm text-muted-foreground">
                            {request.material_unit}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        {request.approved_quantity ? (
                          <div className="flex items-center gap-1">
                            <span className="font-medium">{request.approved_quantity}</span>
                            <span className="text-sm text-muted-foreground">
                              {request.material_unit}
                            </span>
                          </div>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {getPriorityBadge(request.priority)}
                      </TableCell>
                      <TableCell>
                        {getStatusBadge(request.status)}
                      </TableCell>
                      <TableCell>
                        {new Date(request.created_at).toLocaleDateString('tr-TR')}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {canUpdate(request) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openUpdateDialog(request)}
                            >
                              <CheckCircle className="h-4 w-4" />
                            </Button>
                          )}
                          {canDelete(request) && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => openDeleteDialog(request)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Update Request Dialog */}
      <Dialog open={isUpdateDialogOpen} onOpenChange={setIsUpdateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Talebini Güncelle</DialogTitle>
            <DialogDescription>
              {selectedRequest?.material_name} sipariş talebini güncelleyin
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="status">Durum</Label>
              <Select value={updateData.status} onValueChange={(value) => setUpdateData({ ...updateData, status: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seçin" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Bekliyor</SelectItem>
                  <SelectItem value="approved">Onaylandı</SelectItem>
                  <SelectItem value="rejected">Reddedildi</SelectItem>
                  <SelectItem value="ordered">Sipariş Verildi</SelectItem>
                  <SelectItem value="received">Teslim Alındı</SelectItem>
                  <SelectItem value="cancelled">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {updateData.status === 'approved' && (
              <div className="space-y-2">
                <Label htmlFor="approved_quantity">Onaylanan Miktar</Label>
                <Input
                  id="approved_quantity"
                  type="number"
                  value={updateData.approved_quantity}
                  onChange={(e) => setUpdateData({ ...updateData, approved_quantity: e.target.value })}
                  placeholder="Onaylanan miktarı girin"
                  min="1"
                />
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notlar</Label>
              <Textarea
                id="notes"
                value={updateData.notes}
                onChange={(e) => setUpdateData({ ...updateData, notes: e.target.value })}
                placeholder="Güncelleme notları..."
                rows={3}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUpdateDialogOpen(false)}>
              İptal
            </Button>
            <Button onClick={handleUpdateRequest}>
              Güncelle
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Request Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Sipariş Talebini Sil</DialogTitle>
            <DialogDescription>
              {selectedRequest?.material_name} sipariş talebini silmek istediğinizden emin misiniz?
              Bu işlem geri alınamaz.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              İptal
            </Button>
            <Button variant="destructive" onClick={handleDeleteRequest}>
              Sil
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
