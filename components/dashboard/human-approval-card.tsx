'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface ApprovalRequest {
    id: string;
    agent: string;
    action: string;
    reasoning: string;
    data: any;
    created_at: string;
}

export function HumanApprovalCard() {
    const [approvals, setApprovals] = useState<ApprovalRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [processingId, setProcessingId] = useState<string | null>(null);

    const fetchApprovals = async () => {
        try {
            const res = await fetch('/api/human-approval');
            if (res.ok) {
                const data = await res.json();
                setApprovals(data);
            }
        } catch (error) {
            console.error('Failed to fetch approvals', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchApprovals();
        // Poll every 30 seconds
        const interval = setInterval(fetchApprovals, 30000);
        return () => clearInterval(interval);
    }, []);

    const handleDecision = async (id: string, status: 'approved' | 'rejected') => {
        setProcessingId(id);
        try {
            const res = await fetch('/api/human-approval', {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, status })
            });

            if (res.ok) {
                toast.success(`Request ${status} successfully`);
                // Remove from list
                setApprovals(prev => prev.filter(a => a.id !== id));
            } else {
                toast.error('Failed to process request');
            }
        } catch (error) {
            toast.error('An error occurred');
        } finally {
            setProcessingId(null);
        }
    };

    if (loading && approvals.length === 0) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Loading Pending Approvals...
                    </CardTitle>
                </CardHeader>
            </Card>
        );
    }

    if (approvals.length === 0) {
        return null; // Don't show anything if no pending approvals
    }

    return (
        <div className="space-y-4">
            <h3 className="text-lg font-semibold flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-500" />
                Pending Human Approvals ({approvals.length})
            </h3>

            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {approvals.map((approval) => (
                    <Card key={approval.id} className="border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900">
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                                <CardTitle className="text-base font-medium capitalize">
                                    {approval.agent.replace('_', ' ')}
                                </CardTitle>
                                <Badge variant="outline" className="text-xs bg-background">
                                    {new Date(approval.created_at).toLocaleDateString()}
                                </Badge>
                            </div>
                            <CardDescription className="font-mono text-xs mt-1">
                                {approval.action}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="pb-3">
                            <p className="text-sm text-muted-foreground line-clamp-3">
                                {approval.reasoning || 'No reasoning provided.'}
                            </p>
                            {approval.data?.priority && (
                                <div className="mt-2 text-xs font-semibold text-red-600">
                                    Priority: {approval.data.priority}
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="flex justify-end gap-2 pt-0">
                            <Button
                                size="sm"
                                variant="outline"
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                onClick={() => handleDecision(approval.id, 'rejected')}
                                disabled={processingId === approval.id}
                            >
                                {processingId === approval.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                Reject
                            </Button>
                            <Button
                                size="sm"
                                disabled={processingId === approval.id}
                                onClick={() => handleDecision(approval.id, 'approved')}
                                className="bg-green-600 hover:bg-green-700 text-white"
                            >
                                {processingId === approval.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                Approve
                            </Button>
                        </CardFooter>
                    </Card>
                ))}
            </div>
        </div>
    );
}
