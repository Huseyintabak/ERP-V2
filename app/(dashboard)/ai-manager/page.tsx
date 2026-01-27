'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  DollarSign,
  Target,
  RefreshCw,
  Shield,
  Activity,
} from 'lucide-react';

interface RiskAnalysis {
  totalRiskScore: number;
  financialRisk: number;
  operationalRisk: number;
  strategicRisk: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
}

interface BudgetImpact {
  impact: 'positive' | 'neutral' | 'negative';
  amount: number;
  percentage: number;
  projectedSavings?: number;
  projectedCosts?: number;
}

interface StrategicAlignment {
  aligned: boolean;
  score: number;
  factors: {
    longTermGoals: boolean;
    customerSatisfaction: boolean;
    businessContinuity: boolean;
    competitiveAdvantage: boolean;
  };
}

interface ManagerStats {
  riskAnalyses: RiskAnalysis[];
  budgetImpacts: BudgetImpact[];
  strategicAlignments: StrategicAlignment[];
  recentDecisions: Array<{
    id: string;
    operation: string;
    decision: 'approve' | 'reject' | 'conditional';
    riskScore: number;
    budgetImpact: string;
    strategicAlignment: boolean;
    timestamp: string;
  }>;
  summary: {
    totalDecisions: number;
    approved: number;
    rejected: number;
    conditional: number;
    averageRiskScore: number;
    totalBudgetImpact: number;
    strategicAlignmentRate: number;
  };
}

const COLORS = {
  low: '#10b981', // green
  medium: '#f59e0b', // yellow
  high: '#f97316', // orange
  critical: '#ef4444', // red
};

export default function AIManagerPage() {
  const [stats, setStats] = useState<ManagerStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // 30 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/ai/manager/stats');
      const data = await res.json();

      if (res.ok && data.success !== false) {
        setStats(data);
        setError(null);
      } else {
        setError(data.error || 'Unknown error');
        // Fallback data
        setStats({
          riskAnalyses: [],
          budgetImpacts: [],
          strategicAlignments: [],
          recentDecisions: [],
          summary: {
            totalDecisions: 0,
            approved: 0,
            rejected: 0,
            conditional: 0,
            averageRiskScore: 0,
            totalBudgetImpact: 0,
            strategicAlignmentRate: 0,
          },
        });
      }
    } catch (error: any) {
      console.error('Error fetching manager stats:', error);
      setError(error.message || 'Network error');
      setStats({
        riskAnalyses: [],
        budgetImpacts: [],
        strategicAlignments: [],
        recentDecisions: [],
        summary: {
          totalDecisions: 0,
          approved: 0,
          rejected: 0,
          conditional: 0,
          averageRiskScore: 0,
          totalBudgetImpact: 0,
          strategicAlignmentRate: 0,
        },
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
        <p className="text-muted-foreground">Manager Agent verileri yüklenemedi.</p>
        {error && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-md max-w-md mx-auto">
            <p className="text-sm text-red-800">
              <strong>Hata:</strong> {error}
            </p>
          </div>
        )}
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Tekrar Dene
        </Button>
      </div>
    );
  }

  const { summary, riskAnalyses, budgetImpacts, strategicAlignments, recentDecisions } = stats;

  // Risk seviyesi dağılımı
  const riskDistribution = riskAnalyses.reduce(
    (acc, analysis) => {
      acc[analysis.riskLevel] = (acc[analysis.riskLevel] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  const riskChartData = [
    { name: 'Düşük', value: riskDistribution.low || 0, color: COLORS.low },
    { name: 'Orta', value: riskDistribution.medium || 0, color: COLORS.medium },
    { name: 'Yüksek', value: riskDistribution.high || 0, color: COLORS.high },
    { name: 'Kritik', value: riskDistribution.critical || 0, color: COLORS.critical },
  ].filter((item) => item.value > 0);

  // Bütçe etki dağılımı
  const budgetChartData = budgetImpacts.map((impact, index) => ({
    name: `İşlem ${index + 1}`,
    impact: impact.amount,
    type: impact.impact,
  }));

  // Stratejik uyumluluk trendi
  const alignmentTrend = strategicAlignments.map((alignment, index) => ({
    name: `Karar ${index + 1}`,
    score: alignment.score,
    aligned: alignment.aligned ? 1 : 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Manager Agent Dashboard</h1>
          <p className="text-muted-foreground mt-1">
            Stratejik kararlar, risk analizi ve bütçe kontrolü
          </p>
        </div>
        <Button onClick={fetchStats} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Karar</CardTitle>
            <Activity className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.totalDecisions}</div>
            <div className="flex items-center gap-2 mt-1">
              <Badge className="bg-green-100 text-green-800">
                {summary.approved} onay
              </Badge>
              <Badge className="bg-red-100 text-red-800">
                {summary.rejected} red
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Risk Skoru</CardTitle>
            <Shield className="h-4 w-4 text-orange-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{summary.averageRiskScore.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">
              {summary.averageRiskScore < 40 ? 'Düşük Risk' :
               summary.averageRiskScore < 70 ? 'Orta Risk' :
               summary.averageRiskScore < 90 ? 'Yüksek Risk' : 'Kritik Risk'}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bütçe Etkisi</CardTitle>
            <DollarSign className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${summary.totalBudgetImpact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {summary.totalBudgetImpact >= 0 ? '+' : ''}${summary.totalBudgetImpact.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Toplam bütçe etkisi
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Stratejik Uyum</CardTitle>
            <Target className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{(summary.strategicAlignmentRate * 100).toFixed(1)}%</div>
            <p className="text-xs text-muted-foreground">
              Uyumlu karar oranı
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="risk" className="space-y-4">
        <TabsList>
          <TabsTrigger value="risk">Risk Analizi</TabsTrigger>
          <TabsTrigger value="budget">Bütçe Etkisi</TabsTrigger>
          <TabsTrigger value="strategic">Stratejik Uyumluluk</TabsTrigger>
          <TabsTrigger value="decisions">Son Kararlar</TabsTrigger>
        </TabsList>

        <TabsContent value="risk" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Risk Seviyesi Dağılımı</CardTitle>
              </CardHeader>
              <CardContent>
                {riskChartData.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={riskChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, value }) => `${name}: ${value}`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {riskChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz risk analizi verisi bulunmuyor.
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Risk Bileşenleri</CardTitle>
              </CardHeader>
              <CardContent>
                {riskAnalyses.length > 0 ? (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={riskAnalyses.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="riskLevel" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="financialRisk" fill="#3b82f6" name="Mali Risk" />
                        <Bar dataKey="operationalRisk" fill="#f59e0b" name="Operasyonel Risk" />
                        <Bar dataKey="strategicRisk" fill="#8b5cf6" name="Stratejik Risk" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    Henüz risk analizi verisi bulunmuyor.
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="budget" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Bütçe Etki Analizi</CardTitle>
            </CardHeader>
            <CardContent>
              {budgetChartData.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={budgetChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="impact" fill="#10b981" name="Bütçe Etkisi ($)" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz bütçe etki verisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="strategic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Stratejik Uyumluluk Trendi</CardTitle>
            </CardHeader>
            <CardContent>
              {alignmentTrend.length > 0 ? (
                <div className="h-[400px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={alignmentTrend}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis domain={[0, 100]} />
                      <Tooltip />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="score"
                        stroke="#8b5cf6"
                        name="Uyumluluk Skoru"
                        strokeWidth={2}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz stratejik uyumluluk verisi bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="decisions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Son Kararlar</CardTitle>
            </CardHeader>
            <CardContent>
              {recentDecisions.length > 0 ? (
                <div className="space-y-2">
                  {recentDecisions.map((decision) => (
                    <div
                      key={decision.id}
                      className="flex items-center justify-between p-3 border rounded-md"
                    >
                      <div className="flex items-center gap-3">
                        {decision.decision === 'approve' ? (
                          <CheckCircle className="h-5 w-5 text-green-600" />
                        ) : decision.decision === 'reject' ? (
                          <XCircle className="h-5 w-5 text-red-600" />
                        ) : (
                          <AlertTriangle className="h-5 w-5 text-yellow-600" />
                        )}
                        <div>
                          <p className="font-medium">{decision.operation}</p>
                          <p className="text-sm text-muted-foreground">
                            Risk: {decision.riskScore} | Bütçe: {decision.budgetImpact} |{' '}
                            {decision.strategicAlignment ? '✅ Uyumlu' : '❌ Uyumsuz'}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          decision.decision === 'approve'
                            ? 'default'
                            : decision.decision === 'reject'
                            ? 'destructive'
                            : 'secondary'
                        }
                      >
                        {decision.decision}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(decision.timestamp).toLocaleString('tr-TR')}
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  Henüz karar kaydı bulunmuyor.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

