'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Code, 
  AlertTriangle, 
  TrendingUp, 
  Shield, 
  FileCode,
  Loader2,
  RefreshCw,
  CheckCircle,
  XCircle,
  Clock
} from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface Finding {
  category: 'performance' | 'security' | 'feature' | 'code_quality' | 'technical_debt';
  severity: 'critical' | 'high' | 'medium' | 'low';
  issue: string;
  location?: string;
  impact: string;
  recommendation: string;
  estimatedEffort?: string;
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
}

interface Report {
  id: string;
  finalDecision: string;
  findings: Finding[];
  summary: {
    totalIssues?: number;
    critical?: number;
    high?: number;
    medium?: number;
    low?: number;
    estimatedTotalEffort?: string;
  };
  recommendations: string[];
  reasoning: string;
  confidence: number;
  generatedAt: string;
}

export default function AIGelistirmePage() {
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [focusArea, setFocusArea] = useState<'all' | 'performance' | 'security' | 'feature' | 'code_quality' | 'technical_debt'>('all');

  const generateReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/ai/developer/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_improvement_report',
          focusArea
        })
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        console.log('✅ Developer Agent report loaded:', {
          findings: data.report?.findings?.length || 0,
          recommendations: data.report?.recommendations?.length || 0,
          summary: data.report?.summary
        });
        setReport(data.report);
      } else {
        const errorMsg = data.error || 'Unknown error';
        console.error('❌ Developer Agent report error:', errorMsg);
        alert(`Hata: ${errorMsg}`);
      }
    } catch (error: any) {
      alert(`Hata: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'performance':
        return <TrendingUp className="h-4 w-4" />;
      case 'security':
        return <Shield className="h-4 w-4" />;
      case 'feature':
        return <FileCode className="h-4 w-4" />;
      case 'code_quality':
        return <Code className="h-4 w-4" />;
      case 'technical_debt':
        return <AlertTriangle className="h-4 w-4" />;
      default:
        return <Code className="h-4 w-4" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'destructive';
      case 'high':
        return 'default';
      case 'medium':
        return 'secondary';
      case 'low':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'P0':
        return 'destructive';
      case 'P1':
        return 'default';
      case 'P2':
        return 'secondary';
      case 'P3':
        return 'outline';
      default:
        return 'outline';
    }
  };

  const findingsByCategory = report?.findings.reduce((acc, finding) => {
    if (!acc[finding.category]) {
      acc[finding.category] = [];
    }
    acc[finding.category].push(finding);
    return acc;
  }, {} as Record<string, Finding[]>) || {};

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Developer Agent - Sistem Analizi</h1>
          <p className="text-muted-foreground mt-1">
            AI destekli sistem analizi ve iyileştirme önerileri
          </p>
        </div>
      </div>

      {/* Report Generator */}
      <Card>
        <CardHeader>
          <CardTitle>Rapor Oluştur</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-4">
            <label className="text-sm font-medium">Analiz Alanı:</label>
            <select
              value={focusArea}
              onChange={(e) => setFocusArea(e.target.value as any)}
              className="px-3 py-2 border rounded-md"
            >
              <option value="all">Tümü</option>
              <option value="performance">Performans</option>
              <option value="security">Güvenlik</option>
              <option value="feature">Özellik</option>
              <option value="code_quality">Kod Kalitesi</option>
              <option value="technical_debt">Teknik Borç</option>
            </select>
            <Button 
              onClick={generateReport} 
              disabled={loading}
              className="ml-auto"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Analiz Yapılıyor...
                </>
              ) : (
                <>
                  <Code className="h-4 w-4 mr-2" />
                  Rapor Oluştur
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Report Display */}
      {report && (
        <div className="space-y-6">
          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Rapor Özeti</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{report.summary.totalIssues || 0}</div>
                  <div className="text-sm text-muted-foreground">Toplam Sorun</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{report.summary.critical || 0}</div>
                  <div className="text-sm text-muted-foreground">Kritik</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">{report.summary.high || 0}</div>
                  <div className="text-sm text-muted-foreground">Yüksek</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">{report.summary.medium || 0}</div>
                  <div className="text-sm text-muted-foreground">Orta</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{report.summary.low || 0}</div>
                  <div className="text-sm text-muted-foreground">Düşük</div>
                </div>
              </div>
              {report.summary.estimatedTotalEffort && (
                <div className="mt-4 p-3 bg-muted rounded-md">
                  <span className="font-medium">Tahmini Toplam Süre:</span>{' '}
                  <span className="text-lg font-bold">{report.summary.estimatedTotalEffort}</span>
                </div>
              )}
              <div className="mt-4 flex items-center gap-2">
                <Badge variant={report.confidence > 0.8 ? 'default' : 'secondary'}>
                  Confidence: {(report.confidence * 100).toFixed(0)}%
                </Badge>
                <Badge variant={report.finalDecision === 'approved' ? 'default' : 'outline'}>
                  {report.finalDecision}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {new Date(report.generatedAt).toLocaleString('tr-TR')}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Findings by Category */}
          <Tabs defaultValue="all" className="space-y-4">
            <TabsList>
              <TabsTrigger value="all">Tümü ({report.findings.length})</TabsTrigger>
              {Object.keys(findingsByCategory).map((category) => (
                <TabsTrigger key={category} value={category}>
                  {category} ({findingsByCategory[category].length})
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="all" className="space-y-4">
              {report.findings.map((finding, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getCategoryIcon(finding.category)}
                        <CardTitle className="text-lg">{finding.issue}</CardTitle>
                      </div>
                      <div className="flex gap-2">
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity}
                        </Badge>
                        {finding.priority && (
                          <Badge variant={getPriorityColor(finding.priority)}>
                            {finding.priority}
                          </Badge>
                        )}
                      </div>
                    </div>
                    {finding.location && (
                      <p className="text-sm text-muted-foreground mt-2">
                        📍 {finding.location}
                      </p>
                    )}
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Etki:</h4>
                      <p className="text-sm">{finding.impact}</p>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-1">Öneri:</h4>
                      <p className="text-sm">{finding.recommendation}</p>
                    </div>
                    {finding.estimatedEffort && (
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm text-muted-foreground">
                          Tahmini Süre: {finding.estimatedEffort}
                        </span>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </TabsContent>

            {Object.entries(findingsByCategory).map(([category, findings]) => (
              <TabsContent key={category} value={category} className="space-y-4">
                {findings.map((finding, index) => (
                  <Card key={index}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {getCategoryIcon(finding.category)}
                          <CardTitle className="text-lg">{finding.issue}</CardTitle>
                        </div>
                        <Badge variant={getSeverityColor(finding.severity)}>
                          {finding.severity}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{finding.recommendation}</p>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>
            ))}
          </Tabs>

          {/* Recommendations */}
          {report.recommendations && report.recommendations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Genel Öneriler</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="list-disc list-inside space-y-2">
                  {report.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm">{rec}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Reasoning */}
          {report.reasoning && (
            <Card>
              <CardHeader>
                <CardTitle>Analiz Gerekçesi</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm whitespace-pre-wrap">{report.reasoning}</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {!report && !loading && (
        <Alert>
          <AlertDescription>
            Rapor oluşturmak için yukarıdaki formu kullanın.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

