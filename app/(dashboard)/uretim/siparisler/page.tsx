'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, CheckCircle, Clock, Factory, Edit, Trash2, Users, XCircle, Upload, Download } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { OrderForm } from '@/components/production/order-form';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { OrderCancelDialog } from '@/components/orders/order-cancel-dialog';
import { BulkOrderImportDialog } from '@/components/orders/bulk-order-import-dialog';
import { useOrders, useOrderActions, useOrderLoading } from '@/stores/order-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';

interface Order {
  id: string;
  order_number: string;
  customer?: {
    id: string;
    name: string;
    company?: string;
  };
  items: Array<{
    id: string;
    product: { code: string; name: string };
    quantity: number;
  }>;
  total_quantity: number;
  priority: string;
  status: string;
  delivery_date: string;
  created_at: string;
}

export default function SiparislerPage() {
  const { user } = useAuthStore();
  const orders = useOrders();
  const loading = useOrderLoading();
  const actions = useOrderActions();
  
  const [isOrderFormOpen, setIsOrderFormOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  
  // Real-time updates for orders
  useRoleBasedRealtime('planlama');
  
  useEffect(() => {
    actions.fetchOrders();
  }, [actions]);

  const handleApprove = async (orderId: string) => {
    try {
      await actions.approveOrder(orderId);
      toast.success('Sipariş onaylandı!');
    } catch (error: any) {
      toast.error(error.message || 'Onaylama hatası');
    }
  };

  const handleCancel = (order: Order) => {
    setSelectedOrder(order);
    setCancelDialogOpen(true);
  };

  const handleCancelSuccess = () => {
    actions.fetchOrders();
  };

  const handleDelete = async (orderId: string) => {
    if (!confirm('Bu siparişi silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Sipariş silindi');
      actions.fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Silme hatası');
    }
  };

  const handleOrderSubmit = async (data: any) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success('Sipariş oluşturuldu');
      setIsOrderFormOpen(false);
      actions.fetchOrders();
    } catch (error: any) {
      toast.error(error.message || 'Sipariş oluşturma hatası');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      beklemede: 'secondary',
      onaylandi: 'default',
      uretimde: 'default',
      tamamlandi: 'default',
      iptal: 'destructive',
    } as const;

    const labels = {
      beklemede: 'Beklemede',
      onaylandi: 'Onaylandı',
      uretimde: 'Üretimde',
      tamamlandi: 'Tamamlandı',
      iptal: 'İptal Edildi',
    };

    return (
      <Badge variant={variants[status as keyof typeof variants] || 'secondary'}>
        {labels[status as keyof typeof labels] || status}
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      dusuk: 'secondary',
      normal: 'default',
      yuksek: 'default',
      acil: 'destructive',
    } as const;

    const labels = {
      dusuk: 'Düşük',
      normal: 'Normal',
      yuksek: 'Yüksek',
      acil: 'Acil',
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Sipariş Yönetimi</h1>
          <p className="text-gray-500">Sipariş takibi ve yönetimi</p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isOrderFormOpen} onOpenChange={setIsOrderFormOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Yeni Sipariş
              </Button>
            </DialogTrigger>
            <DialogContent className="order-create-modal flex flex-col">
              <DialogHeader>
                <DialogTitle>Yeni Sipariş Oluştur</DialogTitle>
              </DialogHeader>
              <OrderForm onSuccess={() => setIsOrderFormOpen(false)} />
            </DialogContent>
          </Dialog>
          <BulkOrderImportDialog onImportComplete={() => actions.fetchOrders()} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Sipariş Listesi
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.orders ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Sipariş No</TableHead>
                  <TableHead>Müşteri</TableHead>
                  <TableHead>Ürünler</TableHead>
                  <TableHead>Toplam Miktar</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Teslim Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders.map((order: any) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-medium">{order.order_number}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{order.customer?.name || 'Müşteri Yok'}</div>
                        {order.customer?.company && (
                          <div className="text-sm text-gray-500">{order.customer.company}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {order.items?.slice(0, 2).map((item: any, index: number) => (
                          <div key={index} className="text-sm">
                            <span className="font-medium">{item.product?.code}</span>
                            <span className="text-gray-500 ml-2">({item.quantity} adet)</span>
                          </div>
                        ))}
                        {order.items?.length > 2 && (
                          <div className="text-sm text-gray-500">
                            +{order.items.length - 2} ürün daha
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{order.total_quantity || 0}</TableCell>
                    <TableCell>{getPriorityBadge(order.priority)}</TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>{formatDate(order.delivery_date)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {order.status === 'beklemede' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleApprove(order.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        {order.status !== 'iptal' && order.status !== 'tamamlandi' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCancel(order)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleDelete(order.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {orders.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Factory className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">Henüz sipariş bulunmuyor</p>
                        <Button
                          variant="outline"
                          onClick={() => setIsOrderFormOpen(true)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          İlk siparişi oluştur
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Cancel Dialog */}
      <OrderCancelDialog
        isOpen={cancelDialogOpen}
        onClose={() => {
          setCancelDialogOpen(false);
          setSelectedOrder(null);
        }}
        order={selectedOrder}
        onCancelSuccess={handleCancelSuccess}
      />
    </div>
  );
}