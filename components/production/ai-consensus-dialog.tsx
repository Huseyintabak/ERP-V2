'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  Package,
  TrendingUp,
  FileText,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

interface ProductionPlan {
  id: string;
  plan_number?: string;
  order_id: string;
  product_id: string;
  target_quantity: number;
  status: string;
  order?: {
    order_number: string;
    customer_name: string;
  };
  product?: {
    name: string;
    code: string;
  };
}

interface BomMaterial {
  material_type: string;
  material_name: string;
  material_code: string;
  required_quantity_total: number;
  current_stock: number;
  available_stock: number;
  is_sufficient: boolean;
  shortage: number;
}

interface ConsensusResult {
  success: boolean;
  plan_id?: string;
  order_id?: string;
  order_number: string;
  product: {
    id: string;
    name: string;
    code: string;
  };
  planned_quantity: number;
  bom_summary: {
    total_materials: number;
    sufficient_materials: number;
    insufficient_materials: number;
    materials: BomMaterial[];
  };
  production_capacity: {
    total_operators: number;
    total_daily_capacity: number;
    active_production_plans: number;
    total_active_quantity: number;
    available_capacity: number;
  };
  consensus_result: {
    finalDecision: 'approved' | 'rejected' | 'needs_review';
    consensus: {
      approve: number;
      reject: number;
      needs_review: number;
    };
    agentResponses: Array<{
      name: string;
      decision: string;
      reasoning: string;
      confidence: number;
    }>;
    managerReasoning: string;
    confidence: number;
  };
}

interface AiConsensusDialogProps {
  isOpen: boolean;
  onClose: () => void;
  plan: ProductionPlan | null;
}

export function AiConsensusDialog({
  isOpen,
  onClose,
  plan,
}: AiConsensusDialogProps) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ConsensusResult | null>(null);

  const handleRunConsensus = async () => {
    if (!plan) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch('/api/ai/n8n-consensus-with-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_id: plan.id,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'AI konsensüs analizi başarısız');
      }

      const data = await response.json();
      setResult(data);
      toast.success('AI konsensüs analizi tamamlandı!');
    } catch (error: any) {
      logger.error('AI consensus error:', error);
      toast.error(error.message || 'AI konsensüs analizi başarısız');
    } finally {
      setLoading(false);
    }
  };

  const getDecisionBadge = (decision: string) => {
    switch (decision) {
      case 'approved':
        return (
          <Badge className="bg-green-500 hover:bg-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Onaylandı
          </Badge>
        );
      case 'rejected':
        return (
          <Badge variant="destructive">
            <XCircle className="h-3 w-3 mr-1" />
            Reddedildi
          </Badge>
        );
      case 'needs_review':
        return (
          <Badge className="bg-yellow-500 hover:bg-yellow-600">
            <AlertCircle className="h-3 w-3 mr-1" />
            İnceleme Gerekli
          </Badge>
        );
      default:
        return <Badge>{decision}</Badge>;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            AI Multi-Agent Konsensüs Analizi
          </DialogTitle>
          <DialogDescription>
            {plan
              ? `${plan.order?.order_number || plan.id.slice(0, 8)} - ${plan.product?.name || 'Ürün'} için AI agent'ları konsensüs kararı verecek`
              : 'Plan seçilmedi'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {!result && !loading && (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">
                AI agent'ları (Planning, Production, Warehouse, Manager) birlikte
                değerlendirip konsensüs kararı verecek.
              </p>
              <Button onClick={handleRunConsensus} size="lg">
                <TrendingUp className="h-4 w-4 mr-2" />
                Konsensüs Analizini Başlat
              </Button>
            </div>
          )}

          {loading && (
            <div className="text-center py-8">
              <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
              <p className="text-gray-600">AI agent'ları analiz ediyor...</p>
              <p className="text-sm text-gray-500 mt-2">
                Bu işlem birkaç saniye sürebilir
              </p>
            </div>
          )}

          {result && (
            <ScrollArea className="max-h-[60vh]">
              <div className="space-y-4">
                {/* Final Decision */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span>Nihai Karar</span>
                      {getDecisionBadge(result.consensus_result.finalDecision)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div>
                        <p className="text-sm text-gray-600 mb-2">
                          <strong>Güven Seviyesi:</strong>{' '}
                          {(result.consensus_result.confidence * 100).toFixed(1)}%
                        </p>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">
                          {result.consensus_result.managerReasoning}
                        </p>
                      </div>
                      <Separator />
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <div className="text-2xl font-bold text-green-600">
                            {result.consensus_result.consensus.approve}
                          </div>
                          <div className="text-xs text-gray-500">Onay</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-red-600">
                            {result.consensus_result.consensus.reject}
                          </div>
                          <div className="text-xs text-gray-500">Red</div>
                        </div>
                        <div>
                          <div className="text-2xl font-bold text-yellow-600">
                            {result.consensus_result.consensus.needs_review}
                          </div>
                          <div className="text-xs text-gray-500">İnceleme</div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Agent Responses */}
                <Card>
                  <CardHeader>
                    <CardTitle>Agent Görüşleri</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.consensus_result.agentResponses.map((agent, idx) => (
                        <div key={idx} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold">{agent.name} Agent</h4>
                            <div className="flex items-center gap-2">
                              {getDecisionBadge(agent.decision)}
                              <span className="text-xs text-gray-500">
                                Güven: {(agent.confidence * 100).toFixed(0)}%
                              </span>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">
                            {agent.reasoning}
                          </p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* BOM Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Package className="h-5 w-5" />
                      BOM ve Stok Durumu
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="grid grid-cols-3 gap-4 text-center mb-4">
                        <div>
                          <div className="text-xl font-bold">
                            {result.bom_summary.total_materials}
                          </div>
                          <div className="text-xs text-gray-500">Toplam Malzeme</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-green-600">
                            {result.bom_summary.sufficient_materials}
                          </div>
                          <div className="text-xs text-gray-500">Yeterli</div>
                        </div>
                        <div>
                          <div className="text-xl font-bold text-red-600">
                            {result.bom_summary.insufficient_materials}
                          </div>
                          <div className="text-xs text-gray-500">Eksik</div>
                        </div>
                      </div>
                      <ScrollArea className="h-48">
                        <div className="space-y-2">
                          {result.bom_summary.materials.map((material, idx) => (
                            <div
                              key={idx}
                              className={`p-2 rounded text-sm ${
                                material.is_sufficient
                                  ? 'bg-green-50'
                                  : 'bg-red-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">
                                  {material.material_name} ({material.material_code})
                                </span>
                                {material.is_sufficient ? (
                                  <CheckCircle className="h-4 w-4 text-green-600" />
                                ) : (
                                  <XCircle className="h-4 w-4 text-red-600" />
                                )}
                              </div>
                              <div className="text-xs text-gray-600 mt-1">
                                Gerekli: {material.required_quantity_total} | Mevcut:{' '}
                                {material.available_stock}
                                {!material.is_sufficient && (
                                  <span className="text-red-600">
                                    {' '}
                                    (Eksik: {material.shortage})
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    </div>
                  </CardContent>
                </Card>

                {/* Production Capacity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingUp className="h-5 w-5" />
                      Üretim Kapasitesi
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                      <div>
                        <div className="text-lg font-bold">
                          {result.production_capacity.total_operators}
                        </div>
                        <div className="text-xs text-gray-500">Operatör</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {result.production_capacity.total_daily_capacity}
                        </div>
                        <div className="text-xs text-gray-500">Günlük Kapasite</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {result.production_capacity.active_production_plans}
                        </div>
                        <div className="text-xs text-gray-500">Aktif Plan</div>
                      </div>
                      <div>
                        <div className="text-lg font-bold">
                          {result.production_capacity.total_active_quantity}
                        </div>
                        <div className="text-xs text-gray-500">Aktif Miktar</div>
                      </div>
                      <div>
                        <div
                          className={`text-lg font-bold ${
                            result.production_capacity.available_capacity > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {result.production_capacity.available_capacity}
                        </div>
                        <div className="text-xs text-gray-500">Kullanılabilir</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
          )}

          {result && (
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Kapat
              </Button>
              <Button onClick={handleRunConsensus} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Analiz Ediliyor...
                  </>
                ) : (
                  <>
                    <TrendingUp className="h-4 w-4 mr-2" />
                    Yeniden Analiz Et
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

