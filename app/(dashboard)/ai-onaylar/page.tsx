'use client';

import { useState, useEffect } from 'react';
import { HumanApprovalPanel } from '@/components/ai/human-approval-panel';
import { ApprovalHistory } from '@/components/ai/approval-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle } from 'lucide-react';

interface HumanApproval {
  id: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired' | 'cancelled';
  expiry_at: string;
}

export default function AIOnaylarPage() {
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPendingCount();
    // Real-time updates için polling (5 saniyede bir)
    const interval = setInterval(fetchPendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/ai/approvals?status=all');
      if (res.ok) {
        const data = await res.json();
        const allApprovals = data.approvals || [];
        const pendingAndExpired = allApprovals.filter((a: HumanApproval) => {
          const isPending = a.status === 'pending';
          const isExpired = a.status === 'expired';
          const isExpiredByDate = new Date(a.expiry_at) < new Date();
          return isPending || isExpired || isExpiredByDate;
        });
        setPendingCount(pendingAndExpired.length);
      }
    } catch (error) {
      console.error('Error fetching pending count:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Karar Onayları</h1>
        <p className="text-muted-foreground mt-2">
          AI agent'larının kritik kararlarını onaylayın veya reddedin
        </p>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI Karar Onayları</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Bekleyen onaylar: {pendingCount}
          </p>
        </div>
        <Badge variant="outline" className="text-lg px-4 py-2">
          {pendingCount} Bekleyen
        </Badge>
      </div>

      {pendingCount === 0 && !loading && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>Bekleyen onay bulunmuyor. Tüm kararlar işlendi.</AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending">Bekleyen Onaylar</TabsTrigger>
            <TabsTrigger value="history">Onay Geçmişi</TabsTrigger>
          </TabsList>
          
          <TabsContent value="pending" className="space-y-4">
            <HumanApprovalPanel />
          </TabsContent>
          
          <TabsContent value="history" className="space-y-4">
            <ApprovalHistory />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

