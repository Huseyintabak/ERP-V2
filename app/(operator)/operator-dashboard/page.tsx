'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Target,
  CheckCircle,
  Clock,
  TrendingUp,
  Activity,
  Award,
  Timer,
  Zap,
  Factory,
  BarChart3,
  Calendar,
  User,
  Play,
  Pause,
  PlayCircle,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useRealtime } from '@/lib/hooks/use-realtime';
import { useAuthStore } from '@/stores/auth-store';
import { TaskDetailPanel } from '@/components/operator/task-detail-panel';
import { toast } from 'sonner';

interface OperatorStats {
  // Personal Performance KPIs
  dailyCompleted: number;
  weeklyCompleted: number;
  personalEfficiency: number;
  qualityRate: number;
  
  // Work KPIs
  assignedOrders: number;
  activeProductions: number;
  averageWorkTime: number;
  machineUtilization: number;
  
  // Performance Metrics
  weeklyPerformance: number;
  monthlyPerformance: number;
  improvementRate: number;
  targetAchievement: number;
  
  // Work Status
  currentTask: string;
  nextTask: string;
  estimatedCompletion: string;
  workStatus: 'active' | 'idle' | 'break';
}

interface ProductionTask {
  id: string;
  order_id: string;
  product_id: string;
  planned_quantity: number;
  produced_quantity: number;
  status: 'planlandi' | 'devam_ediyor' | 'duraklatildi' | 'tamamlandi' | 'iptal_edildi';
  assigned_operator_id?: string;
  started_at?: string;
  completed_at?: string;
  created_at: string;
  updated_at: string;
  order?: {
    id: string;
    order_number: string;
    customer_name: string;
    delivery_date: string;
    priority: 'dusuk' | 'orta' | 'yuksek';
  };
  product?: {
    id: string;
    name: string;
    code: string;
    barcode?: string;
  };
}

export default function OperatorDashboard() {
  const { user } = useAuthStore();
  const operatorId = user?.id;

  const [stats, setStats] = useState<OperatorStats>({
    dailyCompleted: 0,
    weeklyCompleted: 0,
    personalEfficiency: 0,
    qualityRate: 0,
    assignedOrders: 0,
    activeProductions: 0,
    averageWorkTime: 0,
    machineUtilization: 0,
    weeklyPerformance: 0,
    monthlyPerformance: 0,
    improvementRate: 0,
    targetAchievement: 0,
    currentTask: '',
    nextTask: '',
    estimatedCompletion: '',
    workStatus: 'idle',
  });

  // 3 Ayrı Liste
  const [assignedTasks, setAssignedTasks] = useState<ProductionTask[]>([]);
  const [activeTasks, setActiveTasks] = useState<ProductionTask[]>([]);
  const [pausedTasks, setPausedTasks] = useState<ProductionTask[]>([]);
  
  const [loading, setLoading] = useState(true);
  
  // Selected task for detail panel
  const [selectedTask, setSelectedTask] = useState<ProductionTask | null>(null);

  // Real-time subscriptions
  useRealtime('production_plans', () => {
    if (operatorId) {
      fetchAllData();
    }
  });
  
  useRealtime('production_logs', () => {
    if (operatorId) {
      fetchStats();
      fetchActiveTasks();
    }
  });

  useEffect(() => {
    if (operatorId) {
      fetchAllData();
    }
  }, [operatorId]);

  async function fetchAllData() {
    await Promise.all([
      fetchStats(),
      fetchAssignedTasks(),
      fetchActiveTasks(),
      fetchPausedTasks()
    ]);
    setLoading(false);
  }

  async function fetchStats() {
    if (!operatorId) return;
    
    try {
      const response = await fetch('/api/operators/stats');
      if (!response.ok) {
        throw new Error('Failed to fetch stats');
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Operator Dashboard Stats fetch error:', error);
    }
  }

  async function fetchAssignedTasks() {
    if (!operatorId) return;
    
    try {
      const response = await fetch('/api/operators/tasks?status=planlandi');
      if (!response.ok) {
        throw new Error('Failed to fetch assigned tasks');
      }
      const data = await response.json();
      setAssignedTasks(data.data || []);
    } catch (error) {
      console.error('Assigned tasks fetch error:', error);
    }
  }

  async function fetchActiveTasks() {
    if (!operatorId) return;
    
    try {
      const response = await fetch('/api/operators/tasks?status=devam_ediyor');
      if (!response.ok) {
        throw new Error('Failed to fetch active tasks');
      }
      const data = await response.json();
      setActiveTasks(data.data || []);
    } catch (error) {
      console.error('Active tasks fetch error:', error);
    }
  }

  async function fetchPausedTasks() {
    if (!operatorId) return;
    
    try {
      const response = await fetch('/api/operators/tasks?status=duraklatildi');
      if (!response.ok) {
        throw new Error('Failed to fetch paused tasks');
      }
      const data = await response.json();
      setPausedTasks(data.data || []);
    } catch (error) {
      console.error('Paused tasks fetch error:', error);
    }
  }

  // Plan status actions
  const handlePlanAction = async (planId: string, action: 'accept' | 'pause' | 'resume' | 'complete') => {
    try {
      const response = await fetch('/api/production/plan-status', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          plan_id: planId,
          action: action
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || `Failed to ${action} plan`);
      }

      const data = await response.json();
      toast.success(data.message);
      
      // Verileri yenile
      fetchAllData();
      
    } catch (error) {
      console.error(`Plan ${action} error:`, error);
      toast.error(error instanceof Error ? error.message : `Plan ${action} edilemedi`);
    }
  };

  const selectTask = (task: ProductionTask) => {
    setSelectedTask(task);
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* SOL PANEL - Görev Listeleri (30%) */}
      <div className="w-[30%] border-r overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white z-10">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">Operatör Paneli</h1>
              <p className="text-sm opacity-90">Hoş geldin, {user?.name || 'Operatör'}!</p>
            </div>
            <Badge variant="secondary" className={`text-sm px-3 py-1 ${
              stats.workStatus === 'active' ? 'bg-green-500' : 
              stats.workStatus === 'break' ? 'bg-yellow-500' : 'bg-gray-500'
            }`}>
              {stats.workStatus === 'active' ? 'Aktif' : 
               stats.workStatus === 'break' ? 'Molada' : 'Boşta'}
            </Badge>
          </div>
          <div className="mt-4 text-sm">
            <p>Mevcut Görev: {stats.currentTask || 'Yok'}</p>
            <p>Sıradaki Görev: {stats.nextTask || 'Yok'}</p>
            <p>Tahmini Bitiş: {stats.estimatedCompletion || 'N/A'}</p>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="p-6 space-y-4">
          <div className="grid gap-3 grid-cols-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Bugün</CardTitle>
                <CheckCircle className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.dailyCompleted}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Verimlilik</CardTitle>
                <TrendingUp className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.personalEfficiency.toFixed(1)}%</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Aktif</CardTitle>
                <Factory className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.activeProductions}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-xs font-medium">Süre</CardTitle>
                <Timer className="h-4 w-4 text-purple-600" />
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{stats.averageWorkTime}h</div>
              </CardContent>
            </Card>
          </div>

          {/* Görev Listeleri */}
          <div className="space-y-4">
        {/* 1. Atanan Siparişler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              Atanan Siparişler
              <Badge variant="secondary">{assignedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
                </div>
              ) : assignedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Atanan görev bulunmuyor
                </div>
              ) : (
                assignedTasks.map(task => (
                  <div 
                    key={task.id} 
                    className={`p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-accent transition-colors ${
                      selectedTask?.id === task.id ? 'border-blue-500 bg-blue-50' : ''
                    }`}
                    onClick={() => selectTask(task)}
                  >
                    <div className="flex items-center justify-between">
                      <Badge variant={task.order?.priority === 'yuksek' ? 'destructive' : 'default'}>
                        {task.order?.priority === 'yuksek' ? 'Acil' : 'Normal'}
                      </Badge>
                      <div className="text-sm text-muted-foreground">
                        {task.order?.delivery_date ? new Date(task.order.delivery_date).toLocaleDateString('tr-TR') : 'N/A'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="font-medium">{task.order?.order_number || 'N/A'}</div>
                      <div className="text-sm text-muted-foreground">
                        {task.product?.name || 'N/A'} - {task.planned_quantity} adet
                      </div>
                    </div>
                    
                    <Button 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePlanAction(task.id, 'accept');
                      }}
                      className="w-full"
                      size="sm"
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Kabul Et
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>

        {/* 2. Aktif Üretimler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="h-5 w-5 text-green-600" />
              Aktif Üretimler
              <Badge variant="secondary">{activeTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-green-600 border-t-transparent" />
                </div>
              ) : activeTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Aktif üretim bulunmuyor
                </div>
              ) : (
                activeTasks.map(task => {
                  const progress = Math.round((task.produced_quantity / task.planned_quantity) * 100);
                  const remaining = task.planned_quantity - task.produced_quantity;
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-accent transition-colors ${
                        selectedTask?.id === task.id ? 'border-green-500 bg-green-50' : ''
                      }`}
                      onClick={() => selectTask(task)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{task.order?.order_number || 'N/A'}</div>
                        <Badge variant="outline" className="text-green-600 border-green-600">
                          {progress}%
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm">{task.product?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {task.produced_quantity} / {task.planned_quantity} adet
                        </div>
                      </div>
                      
                      <Progress value={progress} className="h-2" />
                      
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanAction(task.id, 'pause');
                        }}
                        size="sm"
                        variant="outline"
                        className="w-full"
                      >
                        <Pause className="h-4 w-4 mr-1" />
                        Duraklat
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>

        {/* 3. Duraklatılan Üretimler */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pause className="h-5 w-5 text-orange-600" />
              Duraklatılan Üretimler
              <Badge variant="secondary">{pausedTasks.length}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {loading ? (
                <div className="flex justify-center py-8">
                  <div className="h-8 w-8 animate-spin rounded-full border-4 border-orange-600 border-t-transparent" />
                </div>
              ) : pausedTasks.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Duraklatılan üretim bulunmuyor
                </div>
              ) : (
                pausedTasks.map(task => {
                  const progress = Math.round((task.produced_quantity / task.planned_quantity) * 100);
                  
                  return (
                    <div 
                      key={task.id} 
                      className={`p-4 border rounded-lg space-y-3 cursor-pointer hover:bg-accent transition-colors ${
                        selectedTask?.id === task.id ? 'border-orange-500 bg-orange-50' : ''
                      }`}
                      onClick={() => selectTask(task)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="font-medium">{task.order?.order_number || 'N/A'}</div>
                        <Badge variant="outline" className="text-orange-600 border-orange-600">
                          Duraklatıldı
                        </Badge>
                      </div>
                      
                      <div>
                        <div className="text-sm">{task.product?.name || 'N/A'}</div>
                        <div className="text-xs text-muted-foreground">
                          {task.produced_quantity} / {task.planned_quantity} adet (%{progress})
                        </div>
                      </div>
                      
                      <div className="text-xs text-muted-foreground">
                        Duraklatma: {task.started_at ? new Date(task.started_at).toLocaleTimeString('tr-TR') : 'N/A'}
                      </div>
                      
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          handlePlanAction(task.id, 'resume');
                        }}
                        className="w-full"
                        size="sm"
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Devam Et
                      </Button>
                    </div>
                  );
                })
              )}
            </div>
          </CardContent>
        </Card>
          </div>
        </div>
      </div>

      {/* SAĞ PANEL - Görev Detayı (70%) */}
      <div className="flex-1 overflow-hidden">
        <TaskDetailPanel 
          task={selectedTask} 
          onRefresh={fetchAllData}
        />
      </div>
    </div>
  );
}