'use client';

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { 
  Users, 
  Play, 
  Pause, 
  CheckCircle, 
  Clock, 
  AlertTriangle,
  Target,
  Factory,
  UserPlus,
  Eye,
  BarChart3,
  TrendingUp,
  Activity
} from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { logger } from '@/lib/utils/logger';

interface Operator {
  id: string;
  name: string;
  email: string;
  series: string;
  experience_years: number;
  daily_capacity: number;
  location: string;
  hourly_rate: number;
  is_active: boolean;
  current_task?: {
    id: string;
    product_name: string;
    target_quantity: number;
    produced_quantity: number;
    status: string;
    started_at: string;
  };
}

interface ProductionTask {
  id: string;
  order_id: string;
  product_name: string;
  target_quantity: number;
  produced_quantity: number;
  status: string;
  priority: string;
  assigned_operators: string[];
  max_operators: number;
  created_at: string;
  deadline: string;
}

interface MultiOperatorProductionProps {
  onTaskUpdate?: (taskId: string, updates: any) => void;
}

export function MultiOperatorProduction({ onTaskUpdate }: MultiOperatorProductionProps) {
  const { user } = useAuthStore();
  const [operators, setOperators] = useState<Operator[]>([]);
  const [productionTasks, setProductionTasks] = useState<ProductionTask[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [isMonitorDialogOpen, setIsMonitorDialogOpen] = useState(false);

  // Load operators and tasks
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      
      // Load operators
      const operatorsResponse = await fetch('/api/operators', {
        headers: {
          'x-user-id': user.id
        }
      });
      if (operatorsResponse.ok) {
        const operatorsData = await operatorsResponse.json();
        setOperators(operatorsData.data || []);
      }

      // Load production tasks
      const tasksResponse = await fetch('/api/production/multi-operator-tasks', {
        headers: {
          'x-user-id': user.id
        }
      });
      if (tasksResponse.ok) {
        const tasksData = await tasksResponse.json();
        setProductionTasks(tasksData.data || []);
      }
    } catch (error) {
      logger.error('Error loading data:', error);
      toast.error('Veri yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    
    // Real-time updates
    const interval = setInterval(loadData, 5000);
    return () => clearInterval(interval);
  }, [loadData]);

  // Assign operator to task
  const assignOperator = async (taskId: string, operatorId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/production/assign-operator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId,
          operatorId,
          assignedBy: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Operatör ataması başarısız');
      }

      toast.success('Operatör başarıyla atandı');
      loadData();
      onTaskUpdate?.(taskId, { assigned_operators: [...selectedTask?.assigned_operators || [], operatorId] });
    } catch (error: any) {
      logger.error('Error assigning operator:', error);
      toast.error(error.message || 'Operatör ataması başarısız');
    }
  };

  // Remove operator from task
  const removeOperator = async (taskId: string, operatorId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/production/remove-operator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId,
          operatorId,
          removedBy: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Operatör kaldırma başarısız');
      }

      toast.success('Operatör görevden kaldırıldı');
      loadData();
    } catch (error: any) {
      logger.error('Error removing operator:', error);
      toast.error(error.message || 'Operatör kaldırma başarısız');
    }
  };

  // Start production for operator
  const startProduction = async (taskId: string, operatorId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/production/start-multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId,
          operatorId,
          startedBy: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Üretim başlatma başarısız');
      }

      toast.success('Üretim başlatıldı');
      loadData();
    } catch (error: any) {
      logger.error('Error starting production:', error);
      toast.error(error.message || 'Üretim başlatma başarısız');
    }
  };

  // Pause production for operator
  const pauseProduction = async (taskId: string, operatorId: string) => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/production/pause-multi', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify({
          taskId,
          operatorId,
          pausedBy: user?.id
        }),
      });

      if (!response.ok) {
        throw new Error('Üretim duraklatma başarısız');
      }

      toast.success('Üretim duraklatıldı');
      loadData();
    } catch (error: any) {
      logger.error('Error pausing production:', error);
      toast.error(error.message || 'Üretim duraklatma başarısız');
    }
  };

  // Get operator status
  const getOperatorStatus = (operator: Operator) => {
    if (operator.current_task) {
      return {
        status: 'busy',
        text: 'Meşgul',
        color: 'bg-orange-500',
        task: operator.current_task
      };
    }
    return {
      status: 'available',
      text: 'Müsait',
      color: 'bg-green-500',
      task: null
    };
  };

  // Get task priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'yuksek':
        return 'bg-red-500';
      case 'orta':
        return 'bg-yellow-500';
      case 'dusuk':
        return 'bg-green-500';
      default:
        return 'bg-gray-500';
    }
  };

  // Calculate task progress
  const getTaskProgress = (task: ProductionTask) => {
    return Math.round((task.produced_quantity / task.target_quantity) * 100);
  };

  // Get available operators for task
  const getAvailableOperators = (task: ProductionTask) => {
    return operators.filter(op => 
      op.is_active && 
      !task.assigned_operators.includes(op.id) &&
      !op.current_task
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Users className="h-6 w-6" />
            Çoklu Operatör Üretim Sistemi
          </h2>
          <p className="text-muted-foreground">
            Birden fazla operatörle eş zamanlı üretim yönetimi
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setIsMonitorDialogOpen(true)}
            variant="outline"
          >
            <BarChart3 className="h-4 w-4 mr-2" />
            Canlı İzleme
          </Button>
          <Button onClick={loadData} disabled={loading}>
            <Activity className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Yenile
          </Button>
        </div>
      </div>

      {/* Operators Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Operatör Durumları
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {operators.map((operator) => {
              const status = getOperatorStatus(operator);
              return (
                <div key={operator.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${status.color}`} />
                      <span className="font-medium">{operator.name}</span>
                    </div>
                    <Badge variant="outline">{operator.series}</Badge>
                  </div>
                  
                  <div className="text-sm text-muted-foreground mb-2">
                    {operator.email}
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <span>Günlük Kapasite:</span>
                    <span className="font-medium">{operator.daily_capacity} adet</span>
                  </div>
                  
                  {status.task && (
                    <div className="mt-2 p-2 bg-muted rounded text-sm">
                      <div className="font-medium">{status.task.product_name}</div>
                      <div className="text-muted-foreground">
                        {status.task.produced_quantity}/{status.task.target_quantity} adet
                      </div>
                      <Progress 
                        value={Math.round((status.task.produced_quantity / status.task.target_quantity) * 100)} 
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Production Tasks */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Factory className="h-5 w-5" />
            Üretim Görevleri
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Görev</TableHead>
                <TableHead>Hedef</TableHead>
                <TableHead>İlerleme</TableHead>
                <TableHead>Atanan Operatörler</TableHead>
                <TableHead>Durum</TableHead>
                <TableHead>İşlemler</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productionTasks.map((task) => {
                const progress = getTaskProgress(task);
                const assignedOps = operators.filter(op => task.assigned_operators.includes(op.id));
                const availableOps = getAvailableOperators(task);
                
                return (
                  <TableRow key={task.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{task.product_name}</div>
                        <div className="text-sm text-muted-foreground">
                          Sipariş: {task.order_id.slice(0, 8)}
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="text-center">
                        <div className="font-medium">{task.target_quantity} adet</div>
                        <div className="text-sm text-muted-foreground">
                          {task.produced_quantity} üretildi
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{progress}%</span>
                          <span>{task.produced_quantity}/{task.target_quantity}</span>
                        </div>
                        <Progress value={progress} />
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <div className="space-y-1">
                        {assignedOps.map((op) => (
                          <div key={op.id} className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${
                              op.current_task?.id === task.id ? 'bg-green-500' : 'bg-gray-400'
                            }`} />
                            <span className="text-sm">{op.name}</span>
                            {op.current_task?.id === task.id && (
                              <Badge variant="outline" className="text-xs">
                                Aktif
                              </Badge>
                            )}
                          </div>
                        ))}
                        <div className="text-xs text-muted-foreground">
                          {task.assigned_operators.length}/{task.max_operators} operatör
                        </div>
                      </div>
                    </TableCell>
                    
                    <TableCell>
                      <Badge 
                        className={`${getPriorityColor(task.priority)} text-white`}
                      >
                        {task.priority}
                      </Badge>
                    </TableCell>
                    
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsAssignDialogOpen(true);
                          }}
                          disabled={availableOps.length === 0 || task.assigned_operators.length >= task.max_operators}
                        >
                          <UserPlus className="h-4 w-4" />
                        </Button>
                        
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTask(task);
                            setIsMonitorDialogOpen(true);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Assign Operator Dialog */}
      <Dialog open={isAssignDialogOpen} onOpenChange={setIsAssignDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Operatör Ata</DialogTitle>
          </DialogHeader>
          
          {selectedTask && (
            <div className="space-y-4">
              <div>
                <Label>Görev</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="font-medium">{selectedTask.product_name}</div>
                  <div className="text-sm text-muted-foreground">
                    Hedef: {selectedTask.target_quantity} adet
                  </div>
                </div>
              </div>
              
              <div>
                <Label>Müsait Operatörler</Label>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getAvailableOperators(selectedTask).map((operator) => (
                    <div
                      key={operator.id}
                      className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted cursor-pointer"
                      onClick={() => {
                        assignOperator(selectedTask.id, operator.id);
                        setIsAssignDialogOpen(false);
                      }}
                    >
                      <div>
                        <div className="font-medium">{operator.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {operator.series} • {operator.daily_capacity} adet/gün
                        </div>
                      </div>
                      <Button size="sm">
                        <UserPlus className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAssignDialogOpen(false)}>
              İptal
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Monitor Dialog */}
      <Dialog open={isMonitorDialogOpen} onOpenChange={setIsMonitorDialogOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Canlı Üretim İzleme</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-green-600">
                    {operators.filter(op => op.is_active && !op.current_task).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Müsait Operatör</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-orange-600">
                    {operators.filter(op => op.current_task).length}
                  </div>
                  <div className="text-sm text-muted-foreground">Aktif Operatör</div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <div className="text-2xl font-bold text-blue-600">
                    {productionTasks.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Toplam Görev</div>
                </CardContent>
              </Card>
            </div>
            
            <div className="space-y-2">
              <h4 className="font-medium">Aktif Üretimler</h4>
              {operators
                .filter(op => op.current_task)
                .map((operator) => (
                  <div key={operator.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">{operator.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {operator.current_task?.product_name}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm">
                          {operator.current_task?.produced_quantity}/{operator.current_task?.target_quantity}
                        </div>
                        <Progress 
                          value={Math.round((operator.current_task?.produced_quantity || 0) / (operator.current_task?.target_quantity || 1) * 100)} 
                          className="w-20"
                        />
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMonitorDialogOpen(false)}>
              Kapat
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
