'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { TrendingUp, TrendingDown, DollarSign, Calendar, User } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

interface PriceHistoryEntry {
  id: string;
  material_type: 'raw' | 'semi' | 'finished';
  material_id: string;
  old_price: number;
  new_price: number;
  effective_date: string;
  change_reason: string;
  user?: {
    name: string;
    email: string;
  };
}

interface PriceTrendData {
  month_year: string;
  average_price: number;
  price_change: number;
  change_percentage: number;
}

interface PriceHistoryDialogProps {
  isOpen: boolean;
  onClose: () => void;
  materialType: 'raw' | 'semi' | 'finished';
  materialId: string;
  materialName: string;
}

export function PriceHistoryDialog({
  isOpen,
  onClose,
  materialType,
  materialId,
  materialName
}: PriceHistoryDialogProps) {
  const [history, setHistory] = useState<PriceHistoryEntry[]>([]);
  const [trendData, setTrendData] = useState<PriceTrendData[]>([]);
  const [yearlyAverage, setYearlyAverage] = useState<number>(0);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [selectedMonths, setSelectedMonths] = useState<number>(12);
  const [loading, setLoading] = useState(false);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - i);

  useEffect(() => {
    if (isOpen && materialId) {
      fetchPriceHistory();
      fetchYearlyAverage();
      fetchTrendData();
    }
  }, [isOpen, materialId, selectedYear, selectedMonths]);

  const fetchPriceHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch(
        `/api/price-history?material_type=${materialType}&material_id=${materialId}`
      );
      
      if (!response.ok) {
        logger.warn('Failed to fetch price history, using fallback');
        setHistory([]);
        return;
      }
      
      const data = await response.json();
      setHistory(data.data || []);
    } catch (error) {
      logger.error('Error fetching price history:', error);
      setHistory([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchYearlyAverage = async () => {
    try {
      const response = await fetch(
        `/api/price-history?material_type=${materialType}&material_id=${materialId}&year=${selectedYear}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch yearly average');
      }
      
      const data = await response.json();
      setYearlyAverage(data.yearly_average || 0);
    } catch (error) {
      logger.error('Error fetching yearly average:', error);
    }
  };

  const fetchTrendData = async () => {
    try {
      const response = await fetch(
        `/api/price-history?material_type=${materialType}&material_id=${materialId}&months=${selectedMonths}`
      );
      
      if (!response.ok) {
        logger.warn('Failed to fetch trend data, using fallback');
        setTrendData([]);
        return;
      }
      
      const data = await response.json();
      setTrendData(data.trend_data || []);
    } catch (error) {
      logger.error('Error fetching trend data:', error);
      setTrendData([]);
    }
  };

  const getPriceChangeIcon = (change: number) => {
    if (change > 0) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (change < 0) return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <DollarSign className="h-4 w-4 text-gray-600" />;
  };

  const getPriceChangeColor = (change: number) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Fiyat Geçmişi - {materialName}
            <Badge variant="outline">
              {materialType === 'raw' ? 'Hammadde' : 
               materialType === 'semi' ? 'Yarı Mamul' : 'Nihai Ürün'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Yıllık Ortalama ve Trend Seçenekleri */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Yıllık Ortalama</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {formatPrice(yearlyAverage)}
                </div>
                <p className="text-xs text-muted-foreground">{selectedYear} yılı</p>
              </CardContent>
            </Card>

            <div className="space-y-2">
              <label className="text-sm font-medium">Yıl Seçin</label>
              <Select value={selectedYear.toString()} onValueChange={(value) => setSelectedYear(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {years.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Trend Analizi (Ay)</label>
              <Select value={selectedMonths.toString()} onValueChange={(value) => setSelectedMonths(parseInt(value))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 Ay</SelectItem>
                  <SelectItem value="6">6 Ay</SelectItem>
                  <SelectItem value="12">12 Ay</SelectItem>
                  <SelectItem value="24">24 Ay</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Trend Grafiği */}
          {trendData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Fiyat Trend Analizi</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {trendData.map((trend, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm font-medium">{trend.month_year}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="font-medium">{formatPrice(trend.average_price)}</span>
                        <div className="flex items-center gap-1">
                          {getPriceChangeIcon(trend.price_change)}
                          <span className={`text-sm ${getPriceChangeColor(trend.price_change)}`}>
                            {trend.change_percentage > 0 ? '+' : ''}{trend.change_percentage.toFixed(2)}%
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Fiyat Geçmişi Listesi */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm font-medium">Fiyat Değişiklik Geçmişi</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Yükleniyor...</div>
                </div>
              ) : history.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <div className="text-sm text-muted-foreground">Fiyat geçmişi bulunamadı</div>
                </div>
              ) : (
                <div className="space-y-2">
                  {history.map((entry) => (
                    <div key={entry.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          {getPriceChangeIcon(entry.new_price - entry.old_price)}
                          <span className="font-medium">{formatPrice(entry.old_price)}</span>
                          <span className="text-gray-400">→</span>
                          <span className="font-medium">{formatPrice(entry.new_price)}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {formatDate(entry.effective_date)}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        {entry.user && (
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{entry.user.name}</span>
                          </div>
                        )}
                        <span>{entry.change_reason}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
