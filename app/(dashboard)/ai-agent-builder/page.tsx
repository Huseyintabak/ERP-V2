'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { ExternalLink, Play, Users, Loader2, CheckCircle2, XCircle, AlertCircle } from 'lucide-react';

export default function AIAgentBuilderPage() {
  const [loading, setLoading] = useState(false);
  const [multiAgentMode, setMultiAgentMode] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState('planning');
  const [selectedAgents, setSelectedAgents] = useState<string[]>(['planning', 'warehouse']);
  const [prompt, setPrompt] = useState('');
  const [requestType, setRequestType] = useState<'request' | 'query' | 'analysis' | 'validation'>('query');
  const [result, setResult] = useState<any>(null);
  const [agentInfo, setAgentInfo] = useState<any>(null);

  const agents = [
    { value: 'planning', label: 'Planning Agent', emoji: '📋' },
    { value: 'production', label: 'Production Agent', emoji: '🏭' },
    { value: 'warehouse', label: 'Warehouse Agent', emoji: '📦' },
    { value: 'purchase', label: 'Purchase Agent', emoji: '🛒' },
    { value: 'manager', label: 'Manager Agent', emoji: '👔' },
    { value: 'developer', label: 'Developer Agent', emoji: '👨‍💻' },
  ];

  const requestTypes = [
    { value: 'request', label: 'Request', description: 'Yeni istek' },
    { value: 'query', label: 'Query', description: 'Sorgulama' },
    { value: 'analysis', label: 'Analysis', description: 'Analiz' },
    { value: 'validation', label: 'Validation', description: 'Doğrulama' },
  ];

  const examplePrompts = {
    planning: "100 adet Ürün A için üretim planı oluştur. Termin: 7 gün. Mevcut stok kontrolü yap.",
    production: "Operatör Ali, 50 adet Ürün B üretti. Standart süre 30 dakika, gerçek süre 28 dakika. Kalite kontrolden geçti.",
    warehouse: "Depo A'dan Depo B'ye 200 adet Hammadde X transferi. Depo kapasitesi kontrol et.",
    purchase: "Tedarikçi ABC'den 1000 adet Malzeme Y satın al. Birim fiyat: $5.50. Teslimat: 3 gün.",
    manager: "Kritik sipariş: 500 adet Ürün C, termin: 48 saat. Tüm kaynakları değerlendir.",
    developer: "Sistemde son 24 saatte 15 hata oluştu. API response time ortalaması 450ms. Analiz et."
  };

  const loadAgentInfo = async () => {
    try {
      const response = await fetch('/api/ai/agent-builder-test');
      const data = await response.json();
      setAgentInfo(data);
    } catch (error: any) {
      toast.error('Agent bilgileri yüklenemedi: ' + error.message);
    }
  };

  const runSingleAgent = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir prompt girin');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/agent-builder-test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRole: selectedAgent,
          prompt,
          type: requestType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error);
      }

      setResult(data);
      toast.success('Agent çalıştırıldı! 🎉');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const runMultiAgent = async () => {
    if (!prompt.trim()) {
      toast.error('Lütfen bir prompt girin');
      return;
    }

    if (selectedAgents.length === 0) {
      toast.error('En az bir agent seçin');
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/agent-builder-test', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentRoles: selectedAgents,
          prompt,
          type: requestType
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || data.error);
      }

      setResult(data);
      toast.success('Multi-agent konuşma tamamlandı! 🎉');
    } catch (error: any) {
      toast.error('Hata: ' + error.message);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const toggleAgent = (agentValue: string) => {
    setSelectedAgents(prev => 
      prev.includes(agentValue)
        ? prev.filter(a => a !== agentValue)
        : [...prev, agentValue]
    );
  };

  const getDecisionBadge = (decision: string) => {
    if (decision === 'approved') {
      return <Badge className="bg-green-500"><CheckCircle2 className="w-3 h-3 mr-1" /> Approved</Badge>;
    } else if (decision === 'rejected') {
      return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejected</Badge>;
    } else {
      return <Badge variant="secondary"><AlertCircle className="w-3 h-3 mr-1" /> Needs Review</Badge>;
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">🤖 OpenAI Agent Builder</h1>
        <p className="text-muted-foreground mt-2">
          Thunder ERP AI Agent'larını test edin ve OpenAI <strong>Traces Dashboard</strong>'da izleyin
        </p>
        <div className="mt-3 p-3 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-900 dark:text-blue-100">
            <strong>ℹ️ Not:</strong> Agent çalışmalarını <strong>Traces Dashboard</strong>'da göreceksiniz, 
            <a 
              href="https://platform.openai.com/agent-builder" 
              target="_blank" 
              className="underline mx-1"
            >
              Agent Builder
            </a>
            sayfasında değil. 
            <a 
              href="https://platform.openai.com/traces" 
              target="_blank" 
              className="underline ml-1 font-semibold"
            >
              🔗 Traces'e Git
            </a>
          </p>
        </div>
      </div>

      {/* Agent Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Agent Status</span>
            <Button variant="outline" size="sm" onClick={loadAgentInfo}>
              Yenile
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {agentInfo ? (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Badge variant={agentInfo.openaiApiKeyConfigured ? "default" : "destructive"}>
                  {agentInfo.openaiApiKeyConfigured ? "✅ API Key Configured" : "❌ API Key Missing"}
                </Badge>
                <Badge variant="outline">{agentInfo.agents.length} Agents Active</Badge>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(agentInfo.dashboardLinks.traces, '_blank')}
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Traces Dashboard'ı Aç
              </Button>
            </div>
          ) : (
            <Button variant="outline" onClick={loadAgentInfo}>
              Agent Bilgilerini Yükle
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Mode Selection */}
      <div className="flex gap-2">
        <Button
          variant={!multiAgentMode ? "default" : "outline"}
          onClick={() => setMultiAgentMode(false)}
        >
          <Play className="w-4 h-4 mr-2" />
          Single Agent
        </Button>
        <Button
          variant={multiAgentMode ? "default" : "outline"}
          onClick={() => setMultiAgentMode(true)}
        >
          <Users className="w-4 h-4 mr-2" />
          Multi-Agent
        </Button>
      </div>

      {/* Input Card */}
      <Card>
        <CardHeader>
          <CardTitle>{multiAgentMode ? 'Multi-Agent' : 'Single Agent'} Test</CardTitle>
          <CardDescription>
            {multiAgentMode 
              ? 'Birden fazla agent ile konsensüs oluşturun'
              : 'Tek bir agent ile konuşma başlatın'
            }
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Agent Selection */}
          {!multiAgentMode ? (
            <div className="space-y-2">
              <Label>Agent Seçin</Label>
              <Select value={selectedAgent} onValueChange={setSelectedAgent}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {agents.map(agent => (
                    <SelectItem key={agent.value} value={agent.value}>
                      {agent.emoji} {agent.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : (
            <div className="space-y-2">
              <Label>Agent'ları Seçin (Çoklu)</Label>
              <div className="flex flex-wrap gap-2">
                {agents.map(agent => (
                  <Badge
                    key={agent.value}
                    variant={selectedAgents.includes(agent.value) ? "default" : "outline"}
                    className="cursor-pointer"
                    onClick={() => toggleAgent(agent.value)}
                  >
                    {agent.emoji} {agent.label}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Request Type */}
          <div className="space-y-2">
            <Label>Request Type</Label>
            <Select value={requestType} onValueChange={(value: any) => setRequestType(value)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {requestTypes.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label} - {type.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prompt */}
          <div className="space-y-2">
            <Label>Prompt</Label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Agent'a göndermek istediğiniz mesajı yazın..."
              rows={4}
            />
            {!multiAgentMode && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setPrompt(examplePrompts[selectedAgent as keyof typeof examplePrompts])}
              >
                Örnek Prompt Yükle
              </Button>
            )}
          </div>

          {/* Run Button */}
          <Button
            onClick={multiAgentMode ? runMultiAgent : runSingleAgent}
            disabled={loading}
            className="w-full"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Agent Çalışıyor...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 mr-2" />
                {multiAgentMode ? 'Multi-Agent Çalıştır' : 'Agent Çalıştır'}
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Result Card */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Sonuç</span>
              {result.dashboardLinks && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => window.open(result.dashboardLinks.traces, '_blank')}
                >
                  <ExternalLink className="w-4 h-4 mr-2" />
                  Traces'de Görüntüle
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Final Decision */}
            <div>
              <Label>Final Decision</Label>
              <div className="mt-2">
                {getDecisionBadge(result.finalDecision)}
              </div>
            </div>

            {/* Single Agent Response */}
            {result.agentResponse && (
              <div className="space-y-2">
                <Label>Agent: {result.agentResponse.agentName}</Label>
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm whitespace-pre-wrap">{result.agentResponse.reasoning}</p>
                </div>
                <div className="flex gap-2">
                  <Badge variant="outline">
                    Confidence: {(result.agentResponse.confidence * 100).toFixed(0)}%
                  </Badge>
                  <Badge variant="outline">
                    Conversation: {result.conversationId}
                  </Badge>
                </div>
              </div>
            )}

            {/* Multi-Agent Responses */}
            {result.agentResponses && (
              <div className="space-y-4">
                <Label>Agent Responses ({result.agentResponses.length})</Label>
                {result.agentResponses.map((response: any, index: number) => (
                  <div key={index} className="bg-muted p-4 rounded-lg space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold">{response.agentName}</span>
                      {getDecisionBadge(response.decision)}
                    </div>
                    <p className="text-sm whitespace-pre-wrap">{response.reasoning}</p>
                    <Badge variant="outline" className="text-xs">
                      Confidence: {(response.confidence * 100).toFixed(0)}%
                    </Badge>
                  </div>
                ))}

                {/* Consensus */}
                {result.consensus && (
                  <div className="bg-blue-50 dark:bg-blue-950 p-4 rounded-lg">
                    <Label>Consensus</Label>
                    <div className="flex gap-4 mt-2">
                      <Badge className="bg-green-500">
                        ✓ {result.consensus.approve} Approve
                      </Badge>
                      <Badge variant="destructive">
                        ✗ {result.consensus.reject} Reject
                      </Badge>
                      <Badge variant="secondary">
                        ? {result.consensus.needs_review} Review
                      </Badge>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Workflow IDs */}
            {result.workflowIds && result.workflowIds.length > 0 && (
              <div className="space-y-2">
                <Label>Workflow IDs (OpenAI Trace)</Label>
                <div className="flex flex-wrap gap-2">
                  {result.workflowIds.map((id: string, index: number) => (
                    <Badge key={index} variant="outline" className="font-mono text-xs">
                      {id}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

