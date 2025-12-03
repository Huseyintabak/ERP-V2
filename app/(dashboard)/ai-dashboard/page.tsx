'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  Bot,
  MessageSquare,
  CheckCircle,
  XCircle,
  Clock,
  Activity,
  RefreshCw,
  TrendingUp,
  AlertCircle
} from 'lucide-react';

interface AgentInfo {
  name: string;
  role: string;
  responsibilities: string[];
  defaultModel: string;
  rateLimit: {
    total: number;
    byAgent: number;
  };
}

interface DashboardStats {
  agents: AgentInfo[];
  stats: {
    conversations: {
      total: number;
      pending: number;
      inProgress: number;
      completed: number;
      failed: number;
    };
    approvals: {
      pending: number;
      approved: number;
      rejected: number;
      expired: number;
    };
    costs: {
      dailyTotal: number;
      totalTokens: number;
      totalRequests: number;
      byAgent: Record<string, { cost: number; tokens: number; requests: number }>;
    };
    cache: {
      size: number;
      keys: number;
    };
    rateLimiting: {
      total: number;
      byAgent: Record<string, number>;
    };
  };
  recentLogs: Array<{
    agent?: string;
    action: string;
    timestamp: string;
    [key: string]: any;
  }>;
  timestamp: string;
}

export default function AIDashboardPage() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 10000); // 10 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const fetchDashboard = async () => {
    try {
      const res = await fetch('/api/ai/dashboard');
      const data = await res.json();
      
      if (res.ok && data.success !== false) {
        console.log('✅ Dashboard data loaded:', {
          agents: data.agents?.length || 0,
          conversations: data.stats?.conversations?.total || 0,
          logs: data.recentLogs?.length || 0,
          dailyCost: data.stats?.costs?.dailyTotal || 0,
          byAgentKeys: Object.keys(data.stats?.costs?.byAgent || {}).length,
          byAgent: data.stats?.costs?.byAgent
        });
        setStats(data);
        setError(null);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('❌ Dashboard API error:', errorMsg);
        setError(errorMsg);
        // Hata olsa bile boş data göster (fallback)
        setStats({
          agents: [],
          stats: {
            conversations: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
            approvals: { pending: 0, approved: 0, rejected: 0, expired: 0 },
            costs: { dailyTotal: 0, totalTokens: 0, totalRequests: 0, byAgent: {} },
            cache: { size: 0, keys: 0 },
            rateLimiting: { total: 0, byAgent: {} }
          },
          recentLogs: [],
          timestamp: new Date().toISOString()
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching dashboard:', error);
      setError(error.message || 'Network error');
      // Hata olsa bile boş data göster (fallback)
      setStats({
        agents: [],
        stats: {
          conversations: { total: 0, pending: 0, inProgress: 0, completed: 0, failed: 0 },
          approvals: { pending: 0, approved: 0, rejected: 0, expired: 0 },
          costs: { dailyTotal: 0, totalTokens: 0, totalRequests: 0, byAgent: {} },
          cache: { size: 0, keys: 0 },
          rateLimiting: { total: 0, byAgent: {} }
        },
        recentLogs: [],
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-8 space-y-4">
        <p className="text-muted-foreground">Dashboard verileri yüklenemedi.</p>
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
            <p className="text-sm text-red-800">
              <strong>Hata:</strong> {error}
            </p>
            <p className="text-xs text-red-600 mt-2">
              Lütfen browser console'u kontrol edin (F12) veya sayfayı yenileyin.
            </p>
          </div>
        )}
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const { agents, stats: dashboardStats, recentLogs } = stats;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Agent performans metrikleri ve sistem durumu
          </p>
        </div>
        <Button onClick={fetchDashboard} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-md">
          <p className="text-sm text-yellow-800">
            <strong>Uyarı:</strong> {error}
          </p>
          <p className="text-xs text-yellow-600 mt-1">
            Bazı veriler yüklenememiş olabilir. Lütfen browser console'u kontrol edin (F12).
          </p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Agent'lar</CardTitle>
            <Bot className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agents.length}</div>
            <p className="text-xs text-muted-foreground">Toplam agent sayısı</p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Konuşmalar</CardTitle>
            <MessageSquare className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.conversations.total}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-green-100 text-green-800">
                {dashboardStats.conversations.completed} tamamlandı
              </Badge>
              <Badge className="bg-yellow-100 text-yellow-800">
                {dashboardStats.conversations.pending} bekliyor
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Onaylar</CardTitle>
            <CheckCircle className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{dashboardStats.approvals.pending}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.approvals.approved} onaylandı, {dashboardStats.approvals.rejected} reddedildi
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Maliyet</CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${dashboardStats.costs.dailyTotal.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {dashboardStats.costs.totalRequests} istek
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Agents List */}
      <Card>
        <CardHeader>
          <CardTitle>Agent'lar</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {agents.map((agent) => (
              <Card key={agent.name} className="border">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{agent.name}</CardTitle>
                    <Badge variant="outline">{agent.role}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Model:</span>{' '}
                    <Badge variant="outline" className="ml-1">{agent.defaultModel}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Rate Limit:</span>{' '}
                    <span className="text-muted-foreground">
                      {agent.rateLimit.byAgent} / {agent.rateLimit.total}
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {agent.responsibilities.length} sorumluluk
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Conversation Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Konuşma İstatistikleri</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Toplam</span>
                <Badge>{dashboardStats.conversations.total}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  Tamamlandı
                </span>
                <Badge className="bg-green-100 text-green-800">
                  {dashboardStats.conversations.completed}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Clock className="h-4 w-4 text-yellow-600" />
                  Bekliyor
                </span>
                <Badge className="bg-yellow-100 text-yellow-800">
                  {dashboardStats.conversations.pending}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <Activity className="h-4 w-4 text-blue-600" />
                  Devam Ediyor
                </span>
                <Badge className="bg-blue-100 text-blue-800">
                  {dashboardStats.conversations.inProgress}
                </Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm flex items-center gap-2">
                  <XCircle className="h-4 w-4 text-red-600" />
                  Başarısız
                </span>
                <Badge variant="destructive">
                  {dashboardStats.conversations.failed}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sistem Durumu</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Cache Boyutu</span>
                <Badge>{dashboardStats.cache.size} items</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Rate Limit (Toplam)</span>
                <Badge>{dashboardStats.rateLimiting.total} / dakika</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Günlük İstek</span>
                <Badge>{dashboardStats.costs.totalRequests}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Toplam Token</span>
                <Badge>{dashboardStats.costs.totalTokens.toLocaleString()}</Badge>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Info Message - No Data Yet */}
      {agents.length === 0 && (
        <Card className="border-yellow-200 bg-yellow-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-yellow-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                <strong>Bilgi:</strong> Agent'lar henüz yüklenmemiş. Lütfen sayfayı yenileyin veya bir AI işlemi yapın (ör: Order approval).
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {agents.length > 0 && dashboardStats.conversations.total === 0 && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-blue-800">
              <AlertCircle className="h-5 w-5" />
              <p className="text-sm">
                <strong>Bilgi:</strong> Henüz AI konuşması yapılmamış. İlk konuşmayı başlatmak için bir Order approval yapın veya Developer Agent raporu oluşturun.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Agent Bazında Maliyet */}
      {Object.keys(dashboardStats.costs.byAgent).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Agent Bazında Maliyet (Bugün)
              <Badge variant="outline">{Object.keys(dashboardStats.costs.byAgent).length} Agent</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>Maliyet</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>İstek</TableHead>
                  <TableHead>Ortalama/İstek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(dashboardStats.costs.byAgent).map(([agent, data]) => (
                  <TableRow key={agent}>
                    <TableCell className="font-medium">{agent}</TableCell>
                    <TableCell>${data.cost.toFixed(4)}</TableCell>
                    <TableCell>{data.tokens.toLocaleString()}</TableCell>
                    <TableCell>{data.requests}</TableCell>
                    <TableCell>${data.requests > 0 ? (data.cost / data.requests).toFixed(4) : '0.0000'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Recent Logs */}
      <Card>
        <CardHeader>
          <CardTitle>Son Aktiviteler</CardTitle>
        </CardHeader>
        <CardContent>
          {recentLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground space-y-2">
              <p>Henüz aktivite kaydı bulunmuyor.</p>
              <p className="text-xs">
                AI işlemleri yapıldığında burada görünecektir.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {recentLogs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{log.agent || 'System'}</Badge>
                    <span className="text-sm">{log.action}</span>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {new Date(log.timestamp).toLocaleString('tr-TR')}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

