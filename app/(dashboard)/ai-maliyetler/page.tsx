'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown,
  AlertTriangle,
  RefreshCw,
  BarChart3,
  PieChart
} from 'lucide-react';

interface CostStats {
  period: string;
  summary: {
    totalCost: number;
    totalTokens: number;
    totalRequests: number;
    dailyLimit: number;
    weeklyLimit: number;
    dailyUsage: number;
    weeklyUsage: number;
  };
  byAgent: Record<string, { cost: number; tokens: number; requests: number }>;
  byModel: Record<string, { cost: number; tokens: number; requests: number }>;
  dailySummary: Array<{
    date: string;
    agent: string;
    daily_cost: number;
    request_count: number;
  }>;
  recentCosts: Array<{
    id: string;
    agent: string;
    model: string;
    tokens_used: number;
    cost_usd: number;
    created_at: string;
  }>;
}

export default function AIMaliyetlerPage() {
  const [stats, setStats] = useState<CostStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [period, setPeriod] = useState<'day' | 'week' | 'month'>('month'); // Default month - daha fazla veri göster

  useEffect(() => {
    fetchCosts();
  }, [period]);

  const fetchCosts = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/ai/costs?period=${period}`);
      const data = await res.json();
      
      console.log('🔍 API Response:', {
        ok: res.ok,
        status: res.status,
        success: data.success,
        hasSummary: !!data.summary,
        hasByAgent: !!data.byAgent,
        hasByModel: !!data.byModel,
        byAgentKeys: Object.keys(data.byAgent || {}).length,
        byModelKeys: Object.keys(data.byModel || {}).length,
        recentCostsLength: data.recentCosts?.length || 0
      });
      
      if (res.ok && data.success !== false) {
        console.log('✅ Costs data loaded:', {
          totalCost: data.summary?.totalCost || 0,
          totalRequests: data.summary?.totalRequests || 0,
          recentCosts: data.recentCosts?.length || 0,
          byAgentKeys: Object.keys(data.byAgent || {}).length,
          byModelKeys: Object.keys(data.byModel || {}).length,
          byAgent: data.byAgent,
          byModel: data.byModel
        });
        setStats(data);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('❌ Costs API error:', errorMsg);
        setError(errorMsg);
        // Hata olsa bile boş data göster (fallback)
        setStats({
          period,
          summary: {
            totalCost: 0,
            totalTokens: 0,
            totalRequests: 0,
            dailyLimit: 50,
            weeklyLimit: 300,
            dailyUsage: 0,
            weeklyUsage: 0
          },
          byAgent: {},
          byModel: {},
          dailySummary: [],
          recentCosts: []
        });
      }
    } catch (error: any) {
      console.error('❌ Error fetching costs:', error);
      setError(error.message || 'Network error');
      // Hata olsa bile boş data göster (fallback)
      setStats({
        period,
        summary: {
          totalCost: 0,
          totalTokens: 0,
          totalRequests: 0,
          dailyLimit: 50,
          weeklyLimit: 300,
          dailyUsage: 0,
          weeklyUsage: 0
        },
        byAgent: {},
        byModel: {},
        dailySummary: [],
        recentCosts: []
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
        <p className="text-muted-foreground">Maliyet verileri yüklenemedi.</p>
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
        <Button onClick={fetchCosts} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const { summary, byAgent, byModel, recentCosts } = stats;
  const dailyLimitPercentage = (summary.dailyUsage / summary.dailyLimit) * 100;
  const weeklyLimitPercentage = (summary.weeklyUsage / summary.weeklyLimit) * 100;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Maliyet Yönetimi</h1>
          <p className="text-muted-foreground mt-1">
            OpenAI API kullanım maliyetleri ve limitler
          </p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as 'day' | 'week' | 'month')}
            className="px-3 py-2 border rounded-md"
          >
            <option value="day">Son 24 Saat</option>
            <option value="week">Son 7 Gün</option>
            <option value="month">Son 30 Gün</option>
          </select>
          <Button onClick={fetchCosts} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
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

      {/* Info Message - No Data Yet */}
      {stats.summary.totalRequests === 0 && !error && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
          <div className="flex items-center gap-2 text-blue-800">
            <AlertTriangle className="h-5 w-5" />
            <p className="text-sm">
              <strong>Bilgi:</strong> Henüz maliyet kaydı bulunmuyor. İlk AI işlemini yapın (ör: Order approval, Developer Agent raporu) ve maliyetler burada görünecektir.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Maliyet</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.totalCost.toFixed(4)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.totalRequests} istek, {summary.totalTokens.toLocaleString()} token
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Günlük Kullanım</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.dailyUsage.toFixed(4)}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    dailyLimitPercentage >= 90 ? 'bg-red-500' :
                    dailyLimitPercentage >= 70 ? 'bg-orange-500' : 'bg-blue-500'
                  }`}
                  style={{ width: `${Math.min(dailyLimitPercentage, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                ${summary.dailyLimit.toFixed(2)} limit
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Haftalık Kullanım</CardTitle>
            <PieChart className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${summary.weeklyUsage.toFixed(4)}</div>
            <div className="flex items-center gap-2 mt-1">
              <div className="flex-1 bg-gray-200 rounded-full h-2">
                <div 
                  className={`h-2 rounded-full ${
                    weeklyLimitPercentage >= 90 ? 'bg-red-500' :
                    weeklyLimitPercentage >= 70 ? 'bg-orange-500' : 'bg-purple-500'
                  }`}
                  style={{ width: `${Math.min(weeklyLimitPercentage, 100)}%` }}
                />
              </div>
              <span className="text-xs text-muted-foreground">
                ${summary.weeklyLimit.toFixed(2)} limit
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Durum</CardTitle>
            {dailyLimitPercentage >= 90 || weeklyLimitPercentage >= 90 ? (
              <AlertTriangle className="h-4 w-4 text-red-600" />
            ) : (
              <TrendingUp className="h-4 w-4 text-green-600" />
            )}
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyLimitPercentage >= 90 || weeklyLimitPercentage >= 90 ? (
                <Badge variant="destructive">Yüksek</Badge>
              ) : dailyLimitPercentage >= 70 || weeklyLimitPercentage >= 70 ? (
                <Badge className="bg-orange-100 text-orange-800">Orta</Badge>
              ) : (
                <Badge className="bg-green-100 text-green-800">Normal</Badge>
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Limit kullanımı
            </p>
          </CardContent>
        </Card>
      </div>

      {/* By Agent */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Agent Bazında Maliyet
            {Object.keys(byAgent).length > 0 && (
              <Badge variant="outline">{Object.keys(byAgent).length} Agent</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byAgent).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Henüz agent bazında maliyet verisi bulunmuyor.</p>
              <p className="text-xs mt-2">AI agent'lar kullanıldığında maliyetler burada görünecektir.</p>
            </div>
          ) : (
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
                {Object.entries(byAgent).map(([agent, data]) => (
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
          )}
        </CardContent>
      </Card>

      {/* By Model */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Model Bazında Maliyet
            {Object.keys(byModel).length > 0 && (
              <Badge variant="outline">{Object.keys(byModel).length} Model</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {Object.keys(byModel).length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <p>Henüz model bazında maliyet verisi bulunmuyor.</p>
              <p className="text-xs mt-2">AI agent'lar kullanıldığında maliyetler burada görünecektir.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Model</TableHead>
                  <TableHead>Maliyet</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>İstek</TableHead>
                  <TableHead>Ortalama/İstek</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(byModel).map(([model, data]) => (
                  <TableRow key={model}>
                    <TableCell className="font-medium">{model}</TableCell>
                    <TableCell>${data.cost.toFixed(4)}</TableCell>
                    <TableCell>{data.tokens.toLocaleString()}</TableCell>
                    <TableCell>{data.requests}</TableCell>
                    <TableCell>${data.requests > 0 ? (data.cost / data.requests).toFixed(4) : '0.0000'}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Recent Costs */}
      <Card>
        <CardHeader>
          <CardTitle>Son Maliyetler</CardTitle>
        </CardHeader>
        <CardContent>
          {recentCosts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz maliyet kaydı bulunmuyor.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tarih</TableHead>
                  <TableHead>Agent</TableHead>
                  <TableHead>Model</TableHead>
                  <TableHead>Token</TableHead>
                  <TableHead>Maliyet</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCosts.map((cost) => (
                  <TableRow key={cost.id}>
                    <TableCell className="text-sm">
                      {new Date(cost.created_at).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>{cost.agent}</TableCell>
                    <TableCell>
                      <Badge variant="outline">{cost.model}</Badge>
                    </TableCell>
                    <TableCell>{cost.tokens_used.toLocaleString()}</TableCell>
                    <TableCell className="font-medium">
                      ${parseFloat(cost.cost_usd.toString()).toFixed(4)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

