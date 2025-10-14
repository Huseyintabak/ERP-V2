'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calculator, TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface CostCalculationDialogProps {
  productId: string;
  productCode: string;
  productName: string;
  currentSalePrice: number;
  currentCostPrice?: number;
  trigger?: React.ReactNode;
}

interface BreakdownItem {
  type: 'raw' | 'semi';
  code: string;
  name: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total_cost: number;
}

interface CostCalculationResult {
  product: {
    id: string;
    code: string;
    name: string;
    sale_price: number;
    current_cost_price: number;
    quantity: number;
  };
  calculation: {
    total_cost: number;
    raw_material_cost: number;
    semi_finished_cost: number;
    item_count: number;
    breakdown: BreakdownItem[];
  };
  profitability: {
    profit_amount: number;
    profit_percentage: number;
    target_margin: number;
    recommended_price: number;
    status: 'loss' | 'break_even' | 'profitable';
  };
  calculated_at: string;
}

export function CostCalculationDialog({
  productId,
  productCode,
  productName,
  currentSalePrice,
  currentCostPrice = 0,
  trigger
}: CostCalculationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<CostCalculationResult | null>(null);

  const handleCalculate = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/pricing/calculate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId })
      });

      const data = await response.json();

      if (!response.ok) throw new Error(data.error);

      setResult(data);
      toast.success('Maliyet hesaplaması tamamlandı');

    } catch (error: any) {
      toast.error(error.message || 'Hesaplama hatası');
    } finally {
      setLoading(false);
    }
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen && !result) {
      handleCalculate();
    }
  };

  const getProfitabilityBadge = (status: string) => {
    switch (status) {
      case 'loss':
        return <Badge variant="destructive" className="gap-1"><TrendingDown className="w-3 h-3" /> Zarar</Badge>;
      case 'break_even':
        return <Badge variant="secondary" className="gap-1"><AlertCircle className="w-3 h-3" /> Başabaş</Badge>;
      case 'profitable':
        return <Badge variant="default" className="gap-1 bg-green-600"><TrendingUp className="w-3 h-3" /> Karlı</Badge>;
      default:
        return null;
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Calculator className="w-4 h-4" />
            Maliyet Hesapla
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="w-5 h-5" />
            BOM Maliyet Hesaplama
          </DialogTitle>
          <DialogDescription>
            {productCode} - {productName}
          </DialogDescription>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto mb-4"></div>
              <p className="text-sm text-gray-500">Hesaplanıyor...</p>
            </div>
          </div>
        )}

        {!loading && result && (
          <div className="space-y-6">
            {/* Özet Bilgiler */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Toplam Maliyet</p>
                <p className="text-2xl font-bold text-blue-700">
                  ₺{result.calculation.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {result.calculation.item_count} malzeme
                </p>
              </div>

              <div className="bg-gray-50 rounded-lg p-4">
                <p className="text-sm text-gray-600">Satış Fiyatı</p>
                <p className="text-2xl font-bold">
                  ₺{result.product.sale_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                </p>
                <p className="text-xs text-gray-500 mt-1">Mevcut fiyat</p>
              </div>

              <div className={`rounded-lg p-4 ${
                result.profitability.status === 'profitable' 
                  ? 'bg-green-50' 
                  : result.profitability.status === 'loss' 
                  ? 'bg-red-50' 
                  : 'bg-yellow-50'
              }`}>
                <p className="text-sm text-gray-600">Kar Marjı</p>
                <p className={`text-2xl font-bold ${
                  result.profitability.status === 'profitable' 
                    ? 'text-green-700' 
                    : result.profitability.status === 'loss' 
                    ? 'text-red-700' 
                    : 'text-yellow-700'
                }`}>
                  {result.profitability.profit_percentage.toFixed(2)}%
                </p>
                <div className="mt-1">
                  {getProfitabilityBadge(result.profitability.status)}
                </div>
              </div>
            </div>

            {/* Karlılık Analizi */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Karlılık Analizi
              </h3>
              
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-600">Kar Tutarı</p>
                  <p className={`font-semibold ${
                    result.profitability.profit_amount >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    ₺{result.profitability.profit_amount.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                </div>

                <div>
                  <p className="text-gray-600">Hedef Marj</p>
                  <p className="font-semibold">{result.profitability.target_margin}%</p>
                </div>

                <div>
                  <p className="text-gray-600">Önerilen Fiyat</p>
                  <p className="font-semibold text-blue-600">
                    ₺{result.profitability.recommended_price.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">(%{result.profitability.target_margin} marj ile)</p>
                </div>

                <div>
                  <p className="text-gray-600">Potansiyel Kar</p>
                  <p className="font-semibold">
                    ₺{(result.profitability.profit_amount * result.product.quantity).toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                  </p>
                  <p className="text-xs text-gray-500">Mevcut stok için ({result.product.quantity} adet)</p>
                </div>
              </div>
            </div>

            {/* Maliyet Dağılımı */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Maliyet Dağılımı</h3>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Hammadde Maliyeti</span>
                  <span className="font-semibold">
                    ₺{result.calculation.raw_material_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    <span className="text-gray-500 ml-2">
                      ({((result.calculation.raw_material_cost / result.calculation.total_cost) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>

                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Yarı Mamul Maliyeti</span>
                  <span className="font-semibold">
                    ₺{result.calculation.semi_finished_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                    <span className="text-gray-500 ml-2">
                      ({((result.calculation.semi_finished_cost / result.calculation.total_cost) * 100).toFixed(1)}%)
                    </span>
                  </span>
                </div>

                {/* Progress bar */}
                <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden flex mt-2">
                  <div 
                    className="bg-blue-500 h-full"
                    style={{ 
                      width: `${(result.calculation.raw_material_cost / result.calculation.total_cost) * 100}%` 
                    }}
                  />
                  <div 
                    className="bg-green-500 h-full"
                    style={{ 
                      width: `${(result.calculation.semi_finished_cost / result.calculation.total_cost) * 100}%` 
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Detaylı Breakdown */}
            <div className="border rounded-lg p-4 space-y-3">
              <h3 className="font-semibold">Detaylı Malzeme Listesi</h3>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="text-left p-2">Tip</th>
                      <th className="text-left p-2">Kod</th>
                      <th className="text-left p-2">Malzeme</th>
                      <th className="text-right p-2">Miktar</th>
                      <th className="text-right p-2">Birim Fiyat</th>
                      <th className="text-right p-2">Toplam</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.calculation.breakdown.map((item, index) => (
                      <tr key={index} className="border-t hover:bg-gray-50">
                        <td className="p-2">
                          <Badge variant={item.type === 'raw' ? 'secondary' : 'default'} className="text-xs">
                            {item.type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-xs">{item.code}</td>
                        <td className="p-2">{item.name}</td>
                        <td className="p-2 text-right">
                          {item.quantity} {item.unit}
                        </td>
                        <td className="p-2 text-right">
                          ₺{item.unit_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="p-2 text-right font-semibold">
                          ₺{item.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-gray-50 font-bold">
                    <tr>
                      <td colSpan={5} className="p-2 text-right">Toplam Maliyet:</td>
                      <td className="p-2 text-right text-blue-700">
                        ₺{result.calculation.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Uyarılar */}
            {result.profitability.status === 'loss' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-red-800">Zarar Uyarısı</p>
                  <p className="text-sm text-red-700">
                    Bu ürün mevcut fiyatla zarar ediyor. Satış fiyatını en az ₺
                    {result.calculation.total_cost.toLocaleString('tr-TR', { minimumFractionDigits: 2 })} 
                    {' '}yapmanız önerilir.
                  </p>
                </div>
              </div>
            )}

            {result.profitability.status === 'profitable' && result.profitability.profit_percentage < 10 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex gap-3">
                <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                <div>
                  <p className="font-semibold text-yellow-800">Düşük Kar Marjı</p>
                  <p className="text-sm text-yellow-700">
                    Kar marjınız %10'un altında. Fiyat artırımı değerlendirmeniz önerilir.
                  </p>
                </div>
              </div>
            )}

            <div className="flex justify-between items-center pt-4">
              <p className="text-xs text-gray-500">
                Hesaplama zamanı: {new Date(result.calculated_at).toLocaleString('tr-TR')}
              </p>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={handleCalculate}
                  disabled={loading}
                >
                  Yenile
                </Button>
                <Button onClick={() => setOpen(false)}>
                  Kapat
                </Button>
              </div>
            </div>
          </div>
        )}

        {!loading && !result && (
          <div className="text-center py-8 text-gray-500">
            Maliyet hesaplaması yapılamadı
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

