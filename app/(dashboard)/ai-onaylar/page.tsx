'use client';

import { HumanApprovalPanel } from '@/components/ai/human-approval-panel';
import { ApprovalHistory } from '@/components/ai/approval-history';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

export default function AIOnaylarPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">AI Karar Onayları</h1>
        <p className="text-muted-foreground mt-2">
          AI agent'larının kritik kararlarını onaylayın veya reddedin
        </p>
      </div>

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
  );
}

