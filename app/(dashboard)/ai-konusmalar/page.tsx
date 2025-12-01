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
    layers: any;
    errors: string[];
    warnings: string[];
  };
}

export default function AIKonusmalarPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
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
      
      if (res.ok && data.success) {
        console.log('✅ Conversations data loaded:', {
          count: data.conversations?.length || 0,
          conversations: data.conversations
        });
        setConversations(data.conversations || []);
      } else {
        console.error('❌ Conversations API error:', data.error || 'Unknown error');
        setConversations([]);
      }
    } catch (error: any) {
      console.error('❌ Error fetching conversations:', error);
      setConversations([]);
    } finally {
      setLoading(false);
    }
  };

  const viewConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/ai/conversations/${id}`);
      if (res.ok) {
        const data = await res.json();
        setSelectedConversation(data.conversation);
        setDialogOpen(true);
      }
    } catch (error) {
      console.error('Error fetching conversation details:', error);
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
          {conversations.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Henüz konuşma kaydı bulunmuyor.
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
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Konuşma Detayları</DialogTitle>
            <DialogDescription>
              Agent'lar arası konuşma detayları ve protokol sonuçları
            </DialogDescription>
          </DialogHeader>

          {selectedConversation && (
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
                  <CardContent className="space-y-3">
                    <div>
                      <span className="font-medium">Final Karar:</span>{' '}
                      <Badge variant={
                        selectedConversation.protocolResult.finalDecision === 'approved' ? 'default' :
                        selectedConversation.protocolResult.finalDecision === 'rejected' ? 'destructive' : 'secondary'
                      }>
                        {selectedConversation.protocolResult.finalDecision}
                      </Badge>
                    </div>
                    {selectedConversation.protocolResult.errors.length > 0 && (
                      <div>
                        <span className="font-medium text-red-600">Hatalar:</span>
                        <ul className="list-disc list-inside mt-1">
                          {selectedConversation.protocolResult.errors.map((error, i) => (
                            <li key={i} className="text-sm text-red-600">{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {selectedConversation.protocolResult.warnings.length > 0 && (
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
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

