'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, Package, Loader2 } from 'lucide-react';
import { logger } from '@/lib/utils/logger';

interface BomMaterial {
  material_type: 'raw' | 'semi';
  material_code: string;
  material_name: string;
  quantity_needed: number;
  current_stock: number;
  consumption_per_unit: number;
}

interface BomMaterialsCardProps {
  planId: string;
  producedQuantity: number;
  plannedQuantity: number;
}

export function BomMaterialsCard({ planId, producedQuantity, plannedQuantity }: BomMaterialsCardProps) {
  const [materials, setMaterials] = useState<BomMaterial[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (planId) {
      fetchBomMaterials();
    }
  }, [planId]);

  const fetchBomMaterials = async () => {
    setLoading(true);
    try {
      const response = await fetch(`/api/bom/snapshot/${planId}`);
      if (response.ok) {
        const data = await response.json();
        setMaterials(data.materials || []);
      }
    } catch (error) {
      logger.error('Error fetching BOM materials:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Gerekli Malzemeler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (materials.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <Package className="h-4 w-4" />
            Gerekli Malzemeler
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            BOM bilgileri bulunamadı
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <Package className="h-4 w-4" />
          Gerekli Malzemeler
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {materials.map((material, index) => {
          const totalNeeded = material.quantity_needed;
          const consumed = material.consumption_per_unit * producedQuantity;
          const remaining = totalNeeded - consumed;
          const isLowStock = material.current_stock < totalNeeded;
          const isCritical = material.current_stock < remaining;
          const progress = Math.round((consumed / totalNeeded) * 100);
          
          return (
            <div key={index} className="p-3 border rounded-lg space-y-2">
              {/* Malzeme Başlığı */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="font-medium text-sm">{material.material_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {material.material_code} • {material.material_type === 'raw' ? 'Hammadde' : 'Yarı Mamul'}
                  </div>
                </div>
                {isCritical && (
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                )}
                {isLowStock && !isCritical && (
                  <AlertCircle className="h-4 w-4 text-orange-500 flex-shrink-0" />
                )}
              </div>

              {/* İlerleme Çubuğu */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span>Tüketim İlerlemesi</span>
                  <span>%{progress}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(progress, 100)}%` }}
                  />
                </div>
              </div>

              {/* Detay Bilgileri */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Gerekli:</span>
                    <span className="font-medium">{totalNeeded.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Tüketilen:</span>
                    <span className="font-medium text-blue-600">{consumed.toFixed(2)}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Kalan:</span>
                    <span className={`font-medium ${remaining <= 0 ? 'text-green-600' : ''}`}>
                      {remaining.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Stok:</span>
                    <span className={`font-medium ${
                      isCritical ? 'text-red-600' : 
                      isLowStock ? 'text-orange-600' : 
                      'text-green-600'
                    }`}>
                      {material.current_stock.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Durum Badge */}
              <div className="flex justify-center">
                {isCritical ? (
                  <Badge variant="destructive" className="text-xs">
                    Kritik Stok!
                  </Badge>
                ) : isLowStock ? (
                  <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                    Düşük Stok
                  </Badge>
                ) : remaining <= 0 ? (
                  <Badge variant="outline" className="text-xs border-green-500 text-green-600">
                    Tamamlandı
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">
                    Normal
                  </Badge>
                )}
              </div>

              {/* Uyarı Mesajları */}
              {isCritical && (
                <div className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                  ⚠️ Mevcut stok yetersiz! Üretim durdurulabilir.
                </div>
              )}
              {isLowStock && !isCritical && (
                <div className="text-xs text-orange-600 bg-orange-50 p-2 rounded border border-orange-200">
                  ⚠️ Stok seviyesi düşük, dikkatli kullanın.
                </div>
              )}
              {remaining <= 0 && (
                <div className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-200">
                  ✅ Bu malzeme için ihtiyaç tamamlandı.
                </div>
              )}
            </div>
          );
        })}

        {/* Özet Bilgi */}
        <div className="pt-3 border-t">
          <div className="text-xs text-muted-foreground text-center">
            {materials.filter(m => m.current_stock < (m.quantity_needed - (m.consumption_per_unit * producedQuantity))).length > 0 && (
              <div className="text-orange-600 mb-1">
                ⚠️ {materials.filter(m => m.current_stock < (m.quantity_needed - (m.consumption_per_unit * producedQuantity))).length} malzemede stok sorunu var
              </div>
            )}
            Toplam {materials.length} malzeme • {materials.filter(m => m.material_type === 'raw').length} hammadde, {materials.filter(m => m.material_type === 'semi').length} yarı mamul
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
