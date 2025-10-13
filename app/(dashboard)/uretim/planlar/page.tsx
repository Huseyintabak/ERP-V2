'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Filter, 
  Calendar, 
  User, 
  Package, 
  Clock,
  Play,
  Pause,
  CheckCircle,
  XCircle,
  UserPlus,
  MoreHorizontal
} from 'lucide-react';
import { toast } from 'sonner';
import { CompleteProductionDialog } from '@/components/production/complete-production-dialog';
import { useProductionPlans, useOrderActions, useOrderLoading } from '@/stores/order-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';

interface ProductionPlan {
  id: string;
  plan_number: string;
  order_id: string;
  product_id: string;
  target_quantity: number;
  produced_quantity: number;
  status: 'planlandi' | 'devam_ediyor' | 'duraklatildi' | 'tamamlandi' | 'iptal_edildi';
  start_date: string;
  end_date: string;
  assigned_operator_id?: string;
  created_at: string;
  order: {
    order_number: string;
    customer_name: string;
    priority: 'dusuk' | 'orta' | 'yuksek';
    delivery_date: string;
  };
  product: {
    id: string;
    name: string;
    code: string;
  };
  operator?: {
    id: string;
    name: string;
    series: string;
  };
}

interface Operator {
  id: string;
  series: string;
  experience_years: number;
  daily_capacity: number;
  location: string;
  hourly_rate: number;
  active_productions_count: number;
  user: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
}

export default function UretimPlanlariPage() {
  const { user } = useAuthStore();
  const plans = useProductionPlans();
  const loading = useOrderLoading();
  const actions = useOrderActions();
  
  const [operators, setOperators] = useState<Operator[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [operatorFilter, setOperatorFilter] = useState('all');
  
  // Real-time updates for production plans
  useRoleBasedRealtime('planlama');
  
  useEffect(() => {
    actions.fetchProductionPlans();
    fetchOperators();
  }, [actions]);

  const fetchOperators = async () => {
    try {
      const response = await fetch('/api/operators');
      const result = await response.json();
      
      if (!response.ok) throw new Error(result.error);
      
      setOperators(result.data || []);
    } catch (error: any) {
      console.error('Error fetching operators:', error);
    }
  };

  const handleStartProduction = async (planId: string) => {
    try {
      const response = await fetch(`/api/production/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'devam_ediyor',
          start_date: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Üretim başlatıldı!');
      actions.fetchProductionPlans();
    } catch (error: any) {
      toast.error(error.message || 'Üretim başlatma hatası');
    }
  };

  const handlePauseProduction = async (planId: string) => {
    try {
      const response = await fetch(`/api/production/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'duraklatildi' }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Üretim duraklatıldı!');
      actions.fetchProductionPlans();
    } catch (error: any) {
      toast.error(error.message || 'Üretim duraklatma hatası');
    }
  };

  const handleAssignOperator = async (planId: string, operatorId: string) => {
    try {
      const response = await fetch(`/api/production/plans/${planId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ assigned_operator_id: operatorId }),
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Operatör atandı!');
      actions.fetchProductionPlans();
    } catch (error: any) {
      toast.error(error.message || 'Operatör atama hatası');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      planlandi: 'secondary',
      devam_ediyor: 'default',
      duraklatildi: 'destructive',
      tamamlandi: 'default',
      iptal_edildi: 'destructive',
    } as const;

    const labels = {
      planlandi: 'Planlandı',
      devam_ediyor: 'Devam Ediyor',
      duraklatildi: 'Duraklatıldı',
      tamamlandi: 'Tamamlandı',
      iptal_edildi: 'İptal Edildi',
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
      orta: 'default',
      yuksek: 'destructive',
    } as const;

    const labels = {
      dusuk: 'Düşük',
      orta: 'Orta',
      yuksek: 'Yüksek',
    };

    return (
      <Badge variant={variants[priority as keyof typeof variants] || 'secondary'}>
        {labels[priority as keyof typeof labels] || priority}
      </Badge>
    );
  };

  const filteredPlans = plans.filter((plan: any) => {
    const matchesSearch = plan.order?.order_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         plan.product?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    const matchesPriority = priorityFilter === 'all' || plan.order?.priority === priorityFilter;
    const matchesOperator = operatorFilter === 'all' || plan.assigned_operator_id === operatorFilter;
    
    return matchesSearch && matchesStatus && matchesPriority && matchesOperator;
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Üretim Planları</h1>
        <p className="text-gray-500">Üretim planları takibi ve yönetimi</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filtreler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Arama</label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Sipariş no veya ürün adı..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Durum</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Durum seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="planlandi">Planlandı</SelectItem>
                  <SelectItem value="devam_ediyor">Devam Ediyor</SelectItem>
                  <SelectItem value="duraklatildi">Duraklatıldı</SelectItem>
                  <SelectItem value="tamamlandi">Tamamlandı</SelectItem>
                  <SelectItem value="iptal_edildi">İptal Edildi</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Öncelik</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Öncelik seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="dusuk">Düşük</SelectItem>
                  <SelectItem value="orta">Orta</SelectItem>
                  <SelectItem value="yuksek">Yüksek</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <label className="text-sm font-medium mb-2 block">Operatör</label>
              <Select value={operatorFilter} onValueChange={setOperatorFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Operatör seç" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  {operators.map((operator) => (
                    <SelectItem key={operator.id} value={operator.id}>
                      {operator.user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Production Plans Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Üretim Planları
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading.productionPlans ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Plan No</TableHead>
                  <TableHead>Sipariş</TableHead>
                  <TableHead>Ürün</TableHead>
                  <TableHead>Hedef</TableHead>
                  <TableHead>Üretilen</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Öncelik</TableHead>
                  <TableHead>Operatör</TableHead>
                  <TableHead>Teslim Tarihi</TableHead>
                  <TableHead>İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPlans.map((plan: any) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.plan_number || plan.id.slice(0, 8)}</TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.order?.order_number || 'N/A'}</div>
                        <div className="text-sm text-gray-500">{plan.order?.customer_name || 'Müşteri Yok'}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">{plan.product?.name || 'Ürün Yok'}</div>
                        <div className="text-sm text-gray-500">{plan.product?.code || 'N/A'}</div>
                      </div>
                    </TableCell>
                    <TableCell>{plan.target_quantity || 0}</TableCell>
                    <TableCell>{plan.produced_quantity || 0}</TableCell>
                    <TableCell>{getStatusBadge(plan.status)}</TableCell>
                    <TableCell>{getPriorityBadge(plan.order?.priority || 'orta')}</TableCell>
                    <TableCell>
                      {plan.operator ? (
                        <div>
                          <div className="font-medium">{plan.operator.name}</div>
                          <div className="text-sm text-gray-500">{plan.operator.series}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400">Atanmamış</span>
                      )}
                    </TableCell>
                    <TableCell>{plan.order?.delivery_date ? new Date(plan.order.delivery_date).toLocaleDateString('tr-TR') : 'N/A'}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {plan.status === 'planlandi' && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartProduction(plan.id)}
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        
                        {plan.status === 'devam_ediyor' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handlePauseProduction(plan.id)}
                            >
                              <Pause className="h-4 w-4" />
                            </Button>
                            <CompleteProductionDialog 
                              plan={{
                                id: plan.id,
                                order_number: plan.order?.order_number || 'N/A',
                                product_name: plan.product?.name || 'N/A',
                                planned_quantity: plan.target_quantity || 0,
                                produced_quantity: plan.produced_quantity || 0,
                                status: plan.status,
                                created_at: plan.created_at
                              }}
                              onComplete={() => actions.fetchProductionPlans()}
                            />
                          </>
                        )}
                        
                        {!plan.assigned_operator_id && (
                          <Select onValueChange={(operatorId) => handleAssignOperator(plan.id, operatorId)}>
                            <SelectTrigger className="w-32">
                              <SelectValue placeholder="Operatör" />
                            </SelectTrigger>
                            <SelectContent>
                              {operators.map((operator) => (
                                <SelectItem key={operator.id} value={operator.id}>
                                  {operator.user.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
                {filteredPlans.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="text-center py-8">
                      <div className="flex flex-col items-center gap-2">
                        <Calendar className="h-12 w-12 text-gray-400" />
                        <p className="text-gray-500">Henüz üretim planı bulunmuyor</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}