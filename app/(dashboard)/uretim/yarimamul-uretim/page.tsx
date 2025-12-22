'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Factory, Package, Users, Clock, CheckCircle, AlertCircle, Edit, Trash2, Check, Pencil, Brain } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth-store';
import { AiConsensusDialog } from '@/components/production/ai-consensus-dialog';

interface SemiFinishedProduct {
  id: string;
  code: string;
  name: string;
  description?: string;
  unit: string;
  quantity: number;
  reserved_quantity: number;
  created_at: string;
}

interface SemiProductionOrder {
  id: string;
  order_number: string;
  product_id: string;
  product: SemiFinishedProduct;
  planned_quantity: number;
  produced_quantity: number;
  status: 'planlandi' | 'devam_ediyor' | 'tamamlandi' | 'iptal';
  priority: 'dusuk' | 'orta' | 'yuksek';
  assigned_operator_id?: string;
  assigned_operator?: {
    id: string;
    name: string;
  };
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Operator {
  id: string;
  name: string;
  email: string;
  series: string;
  current_status: 'active' | 'idle' | 'busy';
}

export default function YariMamulUretimPage() {
  const { user } = useAuthStore();
  const [semiProducts, setSemiProducts] = useState<SemiFinishedProduct[]>([]);
  const [productionOrders, setProductionOrders] = useState<SemiProductionOrder[]>([]);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTab, setSelectedTab] = useState('active');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingOrder, setEditingOrder] = useState<SemiProductionOrder | null>(null);
  const [selectedOrderForConsensus, setSelectedOrderForConsensus] = useState<SemiProductionOrder | null>(null);
  const [isConsensusDialogOpen, setIsConsensusDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    product_id: '',
    planned_quantity: 0,
    priority: 'orta' as 'dusuk' | 'orta' | 'yuksek',
    assigned_operator_id: '',
    notes: ''
  });

  const fetchSemiProducts = async () => {
    try {
      const response = await fetch('/api/stock/semi?limit=1000');
      const data = await response.json();
      if (response.ok) {
        setSemiProducts(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching semi products:', error);
    }
  };

  const fetchProductionOrders = async () => {
    try {
      const response = await fetch('/api/production/semi-orders');
      const data = await response.json();
      if (response.ok) {
        setProductionOrders(data.data || []);
      } else {
        console.error('Error fetching production orders:', data);
        if (data.error && data.error.includes('table not found')) {
          toast.error('Yarı mamul üretim tablosu bulunamadı. Lütfen Supabase\'de CREATE-SEMI-PRODUCTION-ORDERS.sql dosyasını çalıştırın.');
        }
      }
    } catch (error) {
      console.error('Error fetching production orders:', error);
    }
  };

  const fetchOperators = async () => {
    try {
      const response = await fetch('/api/operators');
      const data = await response.json();
      
      if (response.ok) {
        // API'den gelen veriyi düzelt
        const operatorsData = Array.isArray(data) ? data : (data.data || []);
        
        const formattedOperators = operatorsData.map((op: any) => ({
          id: op.id,
          name: op.user?.name || op.name,
          email: op.user?.email || op.email,
          series: op.series || 'N/A',
          current_status: 'active' as const
        }));
        
        setOperators(formattedOperators);
      } else {
        console.error('Operators API error:', data);
      }
    } catch (error) {
      console.error('Error fetching operators:', error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([
        fetchSemiProducts(),
        fetchProductionOrders(),
        fetchOperators()
      ]);
      setLoading(false);
    };
    loadData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.planned_quantity <= 0) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    try {
      const response = await fetch('/api/production/semi-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      const data = await response.json();
      
      if (response.ok) {
        toast.success('Yarı mamul üretim siparişi oluşturuldu');
        setIsFormOpen(false);
        setFormData({
          product_id: '',
          planned_quantity: 0,
          priority: 'orta',
          assigned_operator_id: '',
          notes: ''
        });
        fetchProductionOrders();
      } else {
        // Detaylı hata mesajını göster
        if (data.details) {
          // Eksik malzemeler varsa detaylı göster
          if (data.insufficient_materials && data.insufficient_materials.length > 0) {
            const materialsList = data.insufficient_materials.map((m: any) => 
              `• ${m.material_name} (${m.material_code}) - ${m.material_type}\n` +
              `  Gerekli: ${m.required_quantity} ${m.unit}\n` +
              `  Mevcut: ${m.available_stock} ${m.unit}\n` +
              `  Eksik: ${m.shortage} ${m.unit}`
            ).join('\n\n');
            
            toast.error(`${data.error}\n\n${materialsList}`, {
              duration: 10000, // 10 saniye göster
            });
          } else {
            toast.error(`${data.error}\n\n${data.details}`, {
              duration: 8000, // 8 saniye göster
            });
          }
        } else {
          toast.error(data.error || 'Bir hata oluştu');
        }
      }
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    }
  };

  const handleStatusUpdate = async (orderId: string, status: string) => {
    try {
      const response = await fetch(`/api/production/semi-orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      });

      if (response.ok) {
        toast.success('Durum güncellendi');
        fetchProductionOrders();
      } else {
        const data = await response.json();
        throw new Error(data.error);
      }
    } catch (error: any) {
      toast.error(error.message);
    }
  };

  const activeOrders = productionOrders.filter(order => order.status === 'devam_ediyor');
  const pendingOrders = productionOrders.filter(order => order.status === 'planlandi');
  const completedOrders = productionOrders.filter(order => order.status === 'tamamlandi');

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
      case 'planlandi': return 'secondary';
      case 'devam_ediyor': return 'default';
      case 'tamamlandi': return 'outline';
      case 'iptal': return 'destructive';
      default: return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'planlandi': return <Clock className="h-4 w-4" />;
      case 'devam_ediyor': return <Factory className="h-4 w-4" />;
      case 'tamamlandi': return <CheckCircle className="h-4 w-4" />;
      case 'iptal': return <AlertCircle className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  const handleEditOrder = (order: SemiProductionOrder) => {
    setEditingOrder(order);
    setFormData({
      product_id: order.product_id,
      planned_quantity: order.planned_quantity,
      priority: order.priority as 'dusuk' | 'orta' | 'yuksek',
      assigned_operator_id: order.assigned_operator_id || '',
      notes: order.notes || ''
    });
    setIsFormOpen(true);
  };

  const handleDeleteOrder = async (orderId: string) => {
    if (!confirm('Bu siparişi silmek istediğinizden emin misiniz?')) {
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(`/api/production/semi-orders/${orderId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });

      if (response.ok) {
        toast.success('Sipariş başarıyla silindi');
        fetchProductionOrders();
      } else {
        toast.error('Sipariş silinirken hata oluştu');
      }
    } catch (error) {
      console.error('Error deleting order:', error);
      toast.error('Sipariş silinirken hata oluştu');
    }
  };

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.planned_quantity <= 0) {
      toast.error('Lütfen tüm gerekli alanları doldurun');
      return;
    }

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const url = editingOrder 
        ? `/api/production/semi-orders/${editingOrder.id}`
        : '/api/production/semi-orders';
      
      const method = editingOrder ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        toast.success(editingOrder ? 'Sipariş güncellendi' : 'Yarı mamul üretim siparişi oluşturuldu');
        setIsFormOpen(false);
        setEditingOrder(null);
        setFormData({
          product_id: '',
          planned_quantity: 0,
          priority: 'orta',
          assigned_operator_id: '',
          notes: ''
        });
        fetchProductionOrders();
      } else {
        const errorData = await response.json();
        toast.error(errorData.error || 'Bir hata oluştu');
      }
    } catch (error) {
      console.error('Error creating/updating order:', error);
      toast.error('Bir hata oluştu');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          <p className="mt-2 text-gray-500">Yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Başlık ve İstatistikler */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Yarı Mamul Üretimi</h1>
          <p className="text-gray-500">Yarı mamul üretim siparişleri ve takibi</p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={(open) => {
          setIsFormOpen(open);
          if (!open) {
            setEditingOrder(null);
            setFormData({
              product_id: '',
              planned_quantity: 0,
              priority: 'orta',
              assigned_operator_id: '',
              notes: ''
            });
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Üretim Siparişi
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {editingOrder ? 'Yarı Mamul Üretim Siparişini Düzenle' : 'Yeni Yarı Mamul Üretim Siparişi'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleFormSubmit} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="product_id">Yarı Mamul Ürün *</Label>
                  <Select
                    value={formData.product_id}
                    onValueChange={(value) => setFormData({ ...formData, product_id: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Ürün seçin" />
                    </SelectTrigger>
                    <SelectContent>
                      {semiProducts.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name} ({product.code})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="planned_quantity">Planlanan Miktar *</Label>
                  <Input
                    id="planned_quantity"
                    type="number"
                    min="1"
                    value={formData.planned_quantity}
                    onChange={(e) => setFormData({ ...formData, planned_quantity: Number(e.target.value) })}
                    className="w-full"
                    placeholder="Miktar girin"
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="priority">Öncelik</Label>
                  <Select
                    value={formData.priority}
                    onValueChange={(value: 'dusuk' | 'orta' | 'yuksek') => setFormData({ ...formData, priority: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="dusuk">Düşük</SelectItem>
                      <SelectItem value="orta">Orta</SelectItem>
                      <SelectItem value="yuksek">Yüksek</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="assigned_operator_id">Atanan Operatör</Label>
                  <Select
                    value={formData.assigned_operator_id}
                    onValueChange={(value) => setFormData({ ...formData, assigned_operator_id: value })}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Operatör seçin (opsiyonel)" />
                    </SelectTrigger>
                    <SelectContent>
                      {operators.length > 0 ? (
                        operators.map((operator) => (
                          <SelectItem key={operator.id} value={operator.id}>
                            {operator.name} ({operator.series})
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="" disabled>
                          Operatör bulunamadı
                        </SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <Label htmlFor="notes">Notlar</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Üretim notları..."
                />
              </div>
              
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setIsFormOpen(false)}>
                  İptal
                </Button>
                <Button type="submit">Oluştur</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* İstatistik Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Üretim</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Devam eden üretimler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planlanan</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Bekleyen siparişler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tamamlanan</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{completedOrders.length}</div>
            <p className="text-xs text-muted-foreground">
              Bu ay tamamlanan
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Ürün</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{semiProducts.length}</div>
            <p className="text-xs text-muted-foreground">
              Yarı mamul ürün sayısı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Üretim Siparişleri */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Üretim Siparişleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={selectedTab} onValueChange={setSelectedTab}>
            <TabsList>
              <TabsTrigger value="active">Aktif Üretim</TabsTrigger>
              <TabsTrigger value="pending">Planlanan</TabsTrigger>
              <TabsTrigger value="completed">Tamamlanan</TabsTrigger>
            </TabsList>

            <TabsContent value="active" className="space-y-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sipariş No</TableHead>
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Operatör</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.product.name}</div>
                          <div className="text-sm text-gray-500">{order.product.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.produced_quantity} / {order.planned_quantity}
                      </TableCell>
                      <TableCell>
                        {order.assigned_operator ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {order.assigned_operator.name}
                          </div>
                        ) : (
                          <span className="text-gray-500">Atanmamış</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrderForConsensus(order);
                              setIsConsensusDialogOpen(true);
                            }}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            AI Konsensüs
                          </Button>
                        </div>
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
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Operatör</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.product.name}</div>
                          <div className="text-sm text-gray-500">{order.product.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>{order.planned_quantity}</TableCell>
                      <TableCell>
                        {order.assigned_operator ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {order.assigned_operator.name}
                          </div>
                        ) : (
                          <span className="text-gray-500">Atanmamış</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedOrderForConsensus(order);
                              setIsConsensusDialogOpen(true);
                            }}
                          >
                            <Brain className="h-4 w-4 mr-1" />
                            AI Konsensüs
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEditOrder(order)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="default"
                            onClick={() => handleStatusUpdate(order.id, 'devam_ediyor')}
                          >
                            <Check className="h-4 w-4 mr-1" />
                            Onayla
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDeleteOrder(order.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
                    <TableHead>Ürün</TableHead>
                    <TableHead>Miktar</TableHead>
                    <TableHead>Operatör</TableHead>
                    <TableHead>Öncelik</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Tamamlanma</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {completedOrders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-medium">{order.order_number}</TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium">{order.product.name}</div>
                          <div className="text-sm text-gray-500">{order.product.code}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {order.produced_quantity} / {order.planned_quantity}
                      </TableCell>
                      <TableCell>
                        {order.assigned_operator ? (
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4" />
                            {order.assigned_operator.name}
                          </div>
                        ) : (
                          <span className="text-gray-500">Atanmamış</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getPriorityColor(order.priority)}>
                          {order.priority.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusColor(order.status)} className="flex items-center gap-1">
                          {getStatusIcon(order.status)}
                          {order.status.toUpperCase()}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {formatDate(order.updated_at)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* AI Consensus Dialog */}
      <AiConsensusDialog
        isOpen={isConsensusDialogOpen}
        onClose={() => {
          setIsConsensusDialogOpen(false);
          setSelectedOrderForConsensus(null);
        }}
        semiOrder={selectedOrderForConsensus}
      />
    </div>
  );
}
