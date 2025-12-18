'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');

  useEffect(() => {
    fetchApprovals();
    // Real-time updates için polling (5 saniyede bir)
    const interval = setInterval(fetchApprovals, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchApprovals = async () => {
    try {
      // Fetch all approvals (pending and expired) - use 'all' to get everything
      console.log('🔍 Fetching approvals with status=all...');
      const res = await fetch('/api/ai/approvals?status=all');
      
      console.log('📡 API response status:', res.status);
      
      if (res.ok) {
        const data = await res.json();
        console.log('📦 API response data:', data);
        
        const allApprovals = data.approvals || [];
        console.log('📋 Total approvals from API:', allApprovals.length);
        console.log('📋 All approvals:', allApprovals);
        
        // Filter to show pending and expired (even if expired, show them)
        const pendingAndExpired = allApprovals.filter((a: HumanApproval) => {
          const isPending = a.status === 'pending';
          const isExpired = a.status === 'expired';
          const isExpiredByDate = new Date(a.expiry_at) < new Date();
          const shouldShow = isPending || isExpired || isExpiredByDate;
          
          console.log(`🔍 Approval ${a.id}: status=${a.status}, expiry=${a.expiry_at}, isExpiredByDate=${isExpiredByDate}, shouldShow=${shouldShow}`);
          
          return shouldShow;
        });
        
        console.log('✅ Filtered pending/expired approvals:', pendingAndExpired.length);
        
        // Sort by created_at (newest first)
        const sorted = pendingAndExpired.sort((a: HumanApproval, b: HumanApproval) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        console.log('✅ Final sorted approvals:', sorted.length, sorted);
        setApprovals(sorted);
      } else {
        const errorText = await res.text();
        console.error('❌ Failed to fetch approvals:', res.status, errorText);
      }
    } catch (error) {
      console.error('❌ Error fetching approvals:', error);
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

  const handleRejectClick = (id: string) => {
    if (processing) return;
    setRejectingId(id);
    setRejectionReason('');
    setRejectDialogOpen(true);
  };

  const handleReject = async () => {
    if (!rejectingId || !rejectionReason.trim()) return;
    
    setProcessing(rejectingId);
    setRejectDialogOpen(false);
    
    try {
      const res = await fetch(`/api/ai/approvals/${rejectingId}/reject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: rejectionReason.trim() })
      });
      
      if (res.ok) {
        await fetchApprovals();
        setRejectingId(null);
        setRejectionReason('');
      } else {
        const error = await res.json();
        alert(`Reddetme hatası: ${error.error}`);
      }
    } catch (error: any) {
      console.error('Error rejecting:', error);
      alert(`Hata: ${error.message}`);
    } finally {
      setProcessing(null);
      setRejectingId(null);
      setRejectionReason('');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  // Include pending approvals, even if expired (show them with warning)
  const pendingApprovals = approvals.filter(a => a.status === 'pending' || a.status === 'expired');

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

  const getTimeRemaining = (expiryAt: string, status: string) => {
    if (status === 'expired') return 'Süresi doldu';
    
    const expiry = new Date(expiryAt);
    const now = new Date();
    const diff = expiry.getTime() - now.getTime();
    
    if (diff <= 0) return 'Süresi doldu';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}s ${minutes}dk`;
  };

  return (
    <>
      {pendingApprovals.length === 0 ? null : (
        <div className="grid gap-4">
          {pendingApprovals.map(approval => {
            const isExpired = approval.status === 'expired' || new Date(approval.expiry_at) < new Date();
            return (
            <Card key={approval.id} className={`border-l-4 ${isExpired ? 'border-l-red-500' : 'border-l-blue-500'}`}>
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
                    <span>{getTimeRemaining(approval.expiry_at, approval.status)} {isExpired ? '' : 'kaldı'}</span>
                    {isExpired && (
                      <Badge variant="destructive" className="ml-2">Süresi Doldu</Badge>
                    )}
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
                      onClick={() => handleRejectClick(approval.id)}
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
            );
          })}
        </div>
      )}

      {/* Rejection Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onayı Reddet</DialogTitle>
            <DialogDescription>
              Lütfen red nedeni belirtin. Bu bilgi kayıt altına alınacaktır.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Red Nedeni *</Label>
              <Input
                id="rejection-reason"
                placeholder="Örn: Yetersiz bilgi, Riskli işlem, vb."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && rejectionReason.trim()) {
                    handleReject();
                  }
                }}
                autoFocus
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectingId(null);
                setRejectionReason('');
              }}
            >
              İptal
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={!rejectionReason.trim() || processing === rejectingId}
            >
              {processing === rejectingId ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2" />
                  Reddediliyor...
                </>
              ) : (
                'Reddet'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

