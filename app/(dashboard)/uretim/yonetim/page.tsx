'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Package, TrendingUp, Users } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatCurrency } from '@/lib/utils';
import { useRealtimeUnified } from '@/lib/hooks/use-realtime-unified';
import { useAuthStore } from '@/stores/auth-store';

interface OrderItem {
  id: string;
  order_id: string;
  product_id: string;
  quantity: number;
  product: {
    id: string;
    name: string;
    code: string;
  };
}

interface Order {
  id: string;
  order_number: string;
  customer_name: string;
  delivery_date: string;
  priority: 'dusuk' | 'orta' | 'yuksek';
  status: 'beklemede' | 'uretimde' | 'tamamlandi';
  total_quantity: number;
  assigned_operator_id?: string;
  items: OrderItem[];
  created_by: {
    id: string;
    name: string;
  };
  created_at: string;
}

export default function UretimYonetimPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('active');
  const { user } = useAuthStore();
  // toast from sonner is already imported

  const fetchOrders = async () => {
    try {
      setLoading(true);
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch('/api/orders', {
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data.data);
      } else {
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  // Real-time updates for orders with unified system
  useRealtimeUnified(
    'orders',
    (newOrder) => {
      setOrders(prev => [newOrder, ...prev]);
      toast.success('Yeni sipariş eklendi!');
    },
    (updatedOrder) => {
      setOrders(prev => prev.map(order => 
        order.id === updatedOrder.id ? updatedOrder : order
      ));
      toast.info('Sipariş güncellendi!');
    },
    (deletedOrder) => {
      setOrders(prev => prev.filter(order => order.id !== deletedOrder.id));
      toast.success('Sipariş silindi!');
    },
    () => fetchOrders(), // fallback fetch
    {
      maxRetries: 3,
      retryDelay: 2000,
      enableFallback: true,
      fallbackInterval: 30000
    }
  );

  const handleApproveOrder = async (orderId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }
      const response = await fetch(`/api/orders/${orderId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        }
      });
      const data = await response.json();

      if (response.ok) {
        toast.success('Sipariş onaylandı ve üretim planı oluşturuldu');
        fetchOrders();
      } else {
        // Show detailed error message for insufficient materials
        if (data.error) {
          toast.error(data.error, {
            duration: 15000, // Show for 15 seconds
            style: {
              whiteSpace: 'pre-line', // Allow line breaks
              maxWidth: '600px'
            }
          });
        } else if (data.missing_materials) {
          toast.error(`${data.missing_materials.length} malzeme eksik`);
        } else {
          throw new Error(data.error || 'Bilinmeyen hata');
        }
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };


  const activeOrders = orders.filter(order => order.status === 'uretimde');
  const pendingOrders = orders.filter(order => order.status === 'beklemede');
  const completedOrders = orders.filter(order => order.status === 'tamamlandi');

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'yuksek': return 'destructive';
      case 'orta': return 'default';
      case 'dusuk': return 'secondary';
      default: return 'secondary';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'beklemede': return 'secondary';
      case 'uretimde': return 'default';
      case 'tamamlandi': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6">
      {/* Hızlı Erişim Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Siparişler</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Üretimde olan siparişler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bekleyen Siparişler</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Onay bekleyen siparişler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan Siparişler</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Bu ay tamamlanan
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Sipariş Yönetimi */}
      <Card>
        <CardHeader>
          <div>
            <CardTitle>Sipariş Yönetimi</CardTitle>
            <CardDescription>
              Siparişleri görüntüleyin, onaylayın ve yönetin
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="active">Üretimdeki Siparişler</TabsTrigger>
              <TabsTrigger value="pending">Bekleyen Siparişler</TabsTrigger>
              <TabsTrigger value="completed">Tamamlanan Siparişler</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Teslim Tarihi</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items?.map((item, index) => (
                            <div key={item.id} className="text-sm">
                              {item.product.name} ({item.product.code}) - {item.quantity} adet
                              {index < (order.items?.length || 0) - 1 && <br />}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{order.total_quantity}</TableCell>
                      <TableCell>{formatDate(order.delivery_date)}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Görüntüle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="pending" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Teslim Tarihi</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items?.map((item, index) => (
                            <div key={item.id} className="text-sm">
                              {item.product.name} ({item.product.code}) - {item.quantity} adet
                              {index < (order.items?.length || 0) - 1 && <br />}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{order.total_quantity}</TableCell>
                      <TableCell>{formatDate(order.delivery_date)}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button 
                          onClick={() => handleApproveOrder(order.id)}
                          size="sm"
                        >
                          Onayla
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="completed" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Müşteri</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Teslim Tarihi</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>{order.customer_name}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {order.items?.map((item, index) => (
                            <div key={item.id} className="text-sm">
                              {item.product.name} ({item.product.code}) - {item.quantity} adet
                              {index < (order.items?.length || 0) - 1 && <br />}
                            </div>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell>{order.total_quantity}</TableCell>
                      <TableCell>{formatDate(order.delivery_date)}</TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)}>
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          Görüntüle
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
