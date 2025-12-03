'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  MessageSquare, 
  Bot, 
  Clock, 
  CheckCircle, 
  XCircle, 
  AlertCircle,
  RefreshCw,
  Eye,
  ChevronRight
} from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface Conversation {
  id: string;
  prompt: string;
  type: string;
  urgency?: string;
  severity?: string;
  status: string;
  startedAt: string;
  completedAt?: string;
  responses: Array<{
    agent: string;
    decision: string;
    reasoning: string;
    confidence: number;
    timestamp: string;
  }>;
  protocolResult?: {
    finalDecision: string;
    layers?: any;
    errors?: string[];
    warnings?: string[];
  };
}

export default function AIKonusmalarPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    fetchConversations();
    const interval = setInterval(fetchConversations, 10000); // 10 saniyede bir güncelle
    return () => clearInterval(interval);
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await fetch('/api/ai/conversations');
      const data = await res.json();
      
      console.log('🔍 Conversations API Response:', data); // Debug log
      
      if (res.ok && (data.success !== false)) {
        console.log('✅ Conversations data loaded:', {
          count: data.conversations?.length || 0,
          conversations: data.conversations
        });
        setConversations(data.conversations || []);
      } else {
        console.error('❌ Conversations API error:', data.error || 'Unknown error');
        setError(data.error || 'Konuşmalar yüklenemedi');
        setConversations([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      setError(error.message || 'Bağlantı hatası');
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const viewConversation = async (id: string) => {
    try {
      console.log('🔍 Fetching conversation details for:', id);
      const res = await fetch(`/api/ai/conversations/${id}`);
      const data = await res.json();
      
      console.log('🔍 Conversation detail API response:', data);
      
      if (res.ok && data.success) {
        console.log('✅ Conversation details loaded:', data.conversation);
        setSelectedConversation(data.conversation);
        setDialogOpen(true);
      } else {
        console.error('❌ Conversation detail API error:', data.error || 'Unknown error');
        alert(`Konuşma detayları yüklenemedi: ${data.error || 'Bilinmeyen hata'}`);
      }
    } catch (error: any) {
      console.error('❌ Error fetching conversation details:', error);
      alert(`Konuşma detayları yüklenemedi: ${error.message || 'Bağlantı hatası'}`);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed':
        return <XCircle className="h-4 w-4 text-red-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'pending':
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'default';
      case 'failed':
        return 'destructive';
      case 'in_progress':
        return 'secondary';
      case 'pending':
        return 'outline';
      default:
        return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">AI Agent Konuşmaları</h1>
          <p className="text-muted-foreground mt-1">
            Agent'lar arası konuşmaları görüntüle ve detaylarını incele
          </p>
        </div>
        <Button onClick={fetchConversations} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Yenile
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Toplam</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{conversations.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Tamamlandı</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {conversations.filter(c => c.status === 'completed').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Devam Ediyor</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {conversations.filter(c => c.status === 'in_progress').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Başarısız</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {conversations.filter(c => c.status === 'failed').length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Conversations Table */}
      <Card>
        <CardHeader>
          <CardTitle>Konuşma Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-md text-red-800">
              <strong>Hata:</strong> {error}
            </div>
          )}
          {conversations.length === 0 && !loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz konuşma kaydı bulunmuyor.
              {error && (
                <div className="mt-2 text-sm text-red-600">
                  Veritabanından konuşma kayıtları yüklenemedi.
                </div>
              )}
            </div>
          ) : conversations.length === 0 && loading ? (
            <div className="text-center py-8 text-muted-foreground">
              Konuşmalar yükleniyor...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Prompt</TableHead>
                  <TableHead>Tip</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Agent Sayısı</TableHead>
                  <TableHead>Başlangıç</TableHead>
                  <TableHead>İşlem</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {conversations.map((conv) => (
                  <TableRow key={conv.id}>
                    <TableCell className="font-mono text-xs">
                      {conv.id.substring(0, 20)}...
                    </TableCell>
                    <TableCell className="max-w-md truncate">
                      {conv.prompt}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{conv.type}</Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {getStatusIcon(conv.status)}
                        <Badge variant={getStatusColor(conv.status)}>
                          {conv.status}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell>
                      {conv.responses?.length || 0}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(conv.startedAt).toLocaleString('tr-TR')}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => viewConversation(conv.id)}
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        Detay
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Conversation Detail Dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => {
        setDialogOpen(open);
        if (!open) {
          setSelectedConversation(null); // Dialog kapandığında selection'ı temizle
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Konuşma Detayları</DialogTitle>
            <DialogDescription>
              Agent'lar arası konuşma detayları ve protokol sonuçları
            </DialogDescription>
          </DialogHeader>

          {selectedConversation ? (
            <div className="space-y-4">
              {/* Conversation Info */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Konuşma Bilgileri</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div>
                    <span className="font-medium">ID:</span>{' '}
                    <span className="font-mono text-xs">{selectedConversation.id}</span>
                  </div>
                  <div>
                    <span className="font-medium">Prompt:</span>{' '}
                    <span>{selectedConversation.prompt}</span>
                  </div>
                  <div>
                    <span className="font-medium">Tip:</span>{' '}
                    <Badge variant="outline">{selectedConversation.type}</Badge>
                  </div>
                  <div>
                    <span className="font-medium">Durum:</span>{' '}
                    <Badge variant={getStatusColor(selectedConversation.status)}>
                      {selectedConversation.status}
                    </Badge>
                  </div>
                  <div>
                    <span className="font-medium">Başlangıç:</span>{' '}
                    {new Date(selectedConversation.startedAt).toLocaleString('tr-TR')}
                  </div>
                  {selectedConversation.completedAt && (
                    <div>
                      <span className="font-medium">Bitiş:</span>{' '}
                      {new Date(selectedConversation.completedAt).toLocaleString('tr-TR')}
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Agent Responses */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Agent Yanıtları</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {selectedConversation.responses?.map((response, index) => (
                    <div key={index} className="border rounded-lg p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Bot className="h-4 w-4" />
                          <span className="font-semibold">{response.agent}</span>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant={
                            response.decision === 'approve' ? 'default' :
                            response.decision === 'reject' ? 'destructive' : 'secondary'
                          }>
                            {response.decision}
                          </Badge>
                          <Badge variant="outline">
                            {(response.confidence * 100).toFixed(0)}%
                          </Badge>
                        </div>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        <span className="font-medium">Gerekçe:</span>{' '}
                        {response.reasoning}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(response.timestamp).toLocaleString('tr-TR')}
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Protocol Result */}
              {selectedConversation.protocolResult && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Zero Error Protocol Sonucu</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div>
                      <span className="font-medium">Final Karar:</span>{' '}
                      <Badge variant={
                        selectedConversation.protocolResult.finalDecision === 'approved' ? 'default' :
                        selectedConversation.protocolResult.finalDecision === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {selectedConversation.protocolResult.finalDecision}
                      </Badge>
                    </div>

                    {/* Layer Results */}
                    {selectedConversation.protocolResult.layers && (
                      <div className="space-y-2">
                        <span className="font-medium">Katman Sonuçları:</span>
                        <div className="grid gap-2">
                          {/* Layer 1 */}
                          {selectedConversation.protocolResult.layers.layer1 && (
                            <div className="p-2 border rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Layer 1 (Primary Agent):</span>
                                <Badge variant={selectedConversation.protocolResult.layers.layer1.isValid ? 'default' : 'destructive'}>
                                  {selectedConversation.protocolResult.layers.layer1.isValid ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </div>
                              {selectedConversation.protocolResult.layers.layer1.errors?.length > 0 && (
                                <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                                  {selectedConversation.protocolResult.layers.layer1.errors.map((e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {/* Layer 2 */}
                          {selectedConversation.protocolResult.layers.layer2 && (
                            <div className="p-2 border rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Layer 2 (Cross-Validation):</span>
                                <Badge variant={selectedConversation.protocolResult.layers.layer2.isValid ? 'default' : 'destructive'}>
                                  {selectedConversation.protocolResult.layers.layer2.isValid ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </div>
                              {selectedConversation.protocolResult.layers.layer2.errors?.length > 0 && (
                                <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                                  {selectedConversation.protocolResult.layers.layer2.errors.map((e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {/* Layer 3 - Consensus Details */}
                          {selectedConversation.protocolResult.layers.layer3 && (
                            <div className="p-2 border rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Layer 3 (Consensus):</span>
                                <Badge variant={selectedConversation.protocolResult.layers.layer3.isValid ? 'default' : 'destructive'}>
                                  {selectedConversation.protocolResult.layers.layer3.isValid ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </div>
                              {!selectedConversation.protocolResult.layers.layer3.isValid && (
                                <div className="mt-2 space-y-1">
                                  <div className="text-xs text-muted-foreground">
                                    Approval Rate: {selectedConversation.protocolResult.layers.layer3.approvalRate ? 
                                      `${(selectedConversation.protocolResult.layers.layer3.approvalRate * 100).toFixed(1)}%` : 'N/A'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">
                                    Votes: {selectedConversation.protocolResult.layers.layer3.approveVotes || 0} approve, 
                                    {' '}{selectedConversation.protocolResult.layers.layer3.rejectVotes || 0} reject,
                                    {' '}{selectedConversation.protocolResult.layers.layer3.conditionalVotes || 0} conditional
                                  </div>
                                  {selectedConversation.protocolResult.layers.layer3.errors?.length > 0 && (
                                    <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                                      {selectedConversation.protocolResult.layers.layer3.errors.map((e: string, i: number) => (
                                        <li key={i}>{e}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {selectedConversation.protocolResult.layers.layer3.warnings?.length > 0 && (
                                    <ul className="list-disc list-inside mt-1 text-xs text-yellow-600">
                                      {selectedConversation.protocolResult.layers.layer3.warnings.map((w: string, i: number) => (
                                        <li key={i}>{w}</li>
                                      ))}
                                    </ul>
                                  )}
                                  {/* Agent Opinions */}
                                  {selectedConversation.protocolResult.layers.layer3.agentOpinions && 
                                   selectedConversation.protocolResult.layers.layer3.agentOpinions.length > 0 && (
                                    <div className="mt-2">
                                      <span className="text-xs font-medium">Agent Oyları:</span>
                                      <div className="mt-1 space-y-1">
                                        {selectedConversation.protocolResult.layers.layer3.agentOpinions.map((opinion: any, i: number) => (
                                          <div key={i} className="text-xs p-1 bg-gray-50 rounded">
                                            <span className="font-medium">{opinion.agent}:</span>{' '}
                                            <Badge variant={
                                              opinion.vote === 'approve' ? 'default' :
                                              opinion.vote === 'reject' ? 'destructive' : 'secondary'
                                            } className="ml-1">
                                              {opinion.vote}
                                            </Badge>
                                            {' '}(Confidence: {(opinion.confidence * 100).toFixed(0)}%)
                                            {opinion.reasoning && (
                                              <div className="text-xs text-muted-foreground mt-1 ml-4">
                                                {opinion.reasoning.substring(0, 200)}...
                                              </div>
                                            )}
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Layer 4 */}
                          {selectedConversation.protocolResult.layers.layer4 && (
                            <div className="p-2 border rounded-md">
                              <div className="flex items-center justify-between">
                                <span className="text-sm font-medium">Layer 4 (Database Validation):</span>
                                <Badge variant={selectedConversation.protocolResult.layers.layer4.isValid ? 'default' : 'destructive'}>
                                  {selectedConversation.protocolResult.layers.layer4.isValid ? 'PASSED' : 'FAILED'}
                                </Badge>
                              </div>
                              {selectedConversation.protocolResult.layers.layer4.errors?.length > 0 && (
                                <ul className="list-disc list-inside mt-1 text-xs text-red-600">
                                  {selectedConversation.protocolResult.layers.layer4.errors.map((e: string, i: number) => (
                                    <li key={i}>{e}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {selectedConversation.protocolResult.errors && 
                     Array.isArray(selectedConversation.protocolResult.errors) &&
                     selectedConversation.protocolResult.errors.length > 0 && (
                      <div>
                        <span className="font-medium text-red-600">Hatalar:</span>
                        <ul className="list-disc list-inside mt-1">
                          {selectedConversation.protocolResult.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedConversation.protocolResult.warnings && 
                     Array.isArray(selectedConversation.protocolResult.warnings) &&
                     selectedConversation.protocolResult.warnings.length > 0 && (
                      <div>
                        <span className="font-medium text-yellow-600">Uyarılar:</span>
                        <ul className="list-disc list-inside mt-1">
                          {selectedConversation.protocolResult.warnings.map((warning, i) => (
                            <li key={i} className="text-sm text-yellow-600">{warning}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              Konuşma detayları yükleniyor...
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

