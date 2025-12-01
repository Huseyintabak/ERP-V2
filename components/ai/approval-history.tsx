'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { RefreshCw, Filter } from 'lucide-react';

interface ApprovalHistoryItem {
  id: string;
  agent: string;
  action: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  severity: 'low' | 'medium' | 'high' | 'critical';
  created_at: string;
  approved_at?: string;
  rejected_at?: string;
  approved_by_user?: { name: string; email: string };
  rejected_by_user?: { name: string; email: string };
  rejection_reason?: string;
}

export function ApprovalHistory() {
  const [history, setHistory] = useState<ApprovalHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [agentFilter, setAgentFilter] = useState<string>('all');
  
  useEffect(() => {
    fetchHistory();
  }, [statusFilter, agentFilter]);

  const fetchHistory = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (agentFilter !== 'all') params.append('agent', agentFilter);
      
      const res = await fetch(`/api/ai/approvals/history?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setHistory(data.approvals || []);
      }
    } catch (error) {
      console.error('Error fetching approval history:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-300">Onaylandı</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Reddedildi</Badge>;
      case 'expired':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">Süresi Doldu</Badge>;
      case 'cancelled':
        return <Badge className="bg-gray-100 text-gray-800 border-gray-300">İptal Edildi</Badge>;
      default:
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Bekliyor</Badge>;
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <Badge className="bg-red-100 text-red-800 border-red-300">Kritik</Badge>;
      case 'high':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-300">Yüksek</Badge>;
      case 'medium':
        return <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">Orta</Badge>;
      default:
        return <Badge className="bg-blue-100 text-blue-800 border-blue-300">Düşük</Badge>;
    }
  };

  const uniqueAgents = Array.from(new Set(history.map(h => h.agent)));

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center p-8">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Onay Geçmişi</CardTitle>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="approved">Onaylandı</option>
              <option value="rejected">Reddedildi</option>
              <option value="expired">Süresi Doldu</option>
              <option value="pending">Bekliyor</option>
            </select>
            <select
              value={agentFilter}
              onChange={(e) => setAgentFilter(e.target.value)}
              className="px-3 py-1.5 text-sm border rounded-md"
            >
              <option value="all">Tüm Agent'lar</option>
              {uniqueAgents.map(agent => (
                <option key={agent} value={agent}>{agent}</option>
              ))}
            </select>
            <Button
              onClick={fetchHistory}
              variant="outline"
              size="sm"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {history.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            Onay geçmişi bulunmuyor.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Agent</TableHead>
                  <TableHead>İşlem</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Önem</TableHead>
                  <TableHead>Onaylayan/Reddeden</TableHead>
                  <TableHead>Tarih</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {history.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.agent}</TableCell>
                    <TableCell className="text-sm">{item.action}</TableCell>
                    <TableCell>{getStatusBadge(item.status)}</TableCell>
                    <TableCell>{getSeverityBadge(item.severity)}</TableCell>
                    <TableCell>
                      {item.approved_by_user?.name || item.rejected_by_user?.name || '-'}
                      {item.rejection_reason && (
                        <div className="text-xs text-muted-foreground mt-1">
                          Sebep: {item.rejection_reason}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {new Date(item.created_at).toLocaleString('tr-TR')}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

