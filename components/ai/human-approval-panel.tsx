'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';

interface HumanApproval {
  id: string;
  decision_id: string;
  agent: string;
  action: string;
  data: any;
  reasoning: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  created_at: string;
  expiry_at: string;
  rejection_reason?: string;
}

export function HumanApprovalPanel() {
  const [approvals, setApprovals] = useState<HumanApproval[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovals();
    // Real-time updates için polling (5 saniyede bir)
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovals = async () => {
    try {
      const res = await fetch('/api/ai/approvals?status=pending');
      if (res.ok) {
        const data = await res.json();
        setApprovals(data.approvals || []);
      }
    } catch (error) {
      console.error('Error fetching approvals:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    if (processing) return;
    
    setProcessing(id);
    try {
      const res = await fetch(`/api/ai/approvals/${id}/approve`, {
        method: 'POST'
      });
      
      if (res.ok) {
        await fetchApprovals();
        // Toast notification gösterilebilir
      } else {
        const error = await res.json();
        alert(`Onaylama hatası: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Error approving:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  const handleReject = async (id: string) => {
    if (processing) return;
    
    const reason = prompt('Red nedeni:');
    if (!reason) return;
    
    setProcessing(id);
    try {
      const res = await fetch(`/api/ai/approvals/${id}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason })
      });
      
      if (res.ok) {
        await fetchApprovals();
      } else {
        const error = await res.json();
        alert(`Reddetme hatası: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Error rejecting:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setProcessing(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  const pendingApprovals = approvals.filter(a => a.status === 'pending');

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getTimeRemaining = (expiryAt: string) => {
    const expiry = new Date(expiryAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Süresi doldu';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}dk`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Karar Onayları</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bekleyen onaylar: {pendingApprovals.length}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {pendingApprovals.length} Bekleyen
        </Badge>
      </div>
      
      {pendingApprovals.length === 0 ? (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Bekleyen onay bulunmuyor. Tüm kararlar işlendi.</AlertDescription>
        </Alert>
      ) : (
        <div className="grid gap-4">
          {pendingApprovals.map(approval => (
            <Card key={approval.id} className="border-l-4 border-l-blue-500">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <CardTitle className="text-lg">{approval.agent}</CardTitle>
                      <Badge className={getSeverityColor(approval.severity)}>
                        {approval.severity}
                      </Badge>
                    </div>
                    <p className="text-sm font-medium text-muted-foreground">
                      İşlem: {approval.action}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Clock className="h-4 w-4" />
                    <span>{getTimeRemaining(approval.expiry_at)} kaldı</span>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="font-semibold mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      Gerekçe:
                    </h4>
                    <p className="text-sm text-muted-foreground bg-muted p-3 rounded-md">
                      {approval.reasoning || 'Gerekçe belirtilmemiş'}
                    </p>
                  </div>
                  
                  {approval.data && Object.keys(approval.data).length > 0 && (
                    <div>
                      <h4 className="font-semibold mb-2">Detaylar:</h4>
                      <pre className="text-xs bg-muted p-3 rounded-md overflow-auto max-h-48 border">
                        {JSON.stringify(approval.data, null, 2)}
                      </pre>
                    </div>
                  )}
                  
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => handleApprove(approval.id)}
                      disabled={processing === approval.id}
                      className="flex-1"
                    >
                      {processing === approval.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Onaylanıyor...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Onayla
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={() => handleReject(approval.id)}
                      disabled={processing === approval.id}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing === approval.id ? (
                        <>
                          <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                          Reddediliyor...
                        </>
                      ) : (
                        <>
                          <XCircle className="h-4 w-4 mr-2" />
                          Reddet
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

