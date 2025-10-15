'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calculator, 
  Package, 
  Factory, 
  ShoppingCart,
  FileSpreadsheet,
  TrendingUp,
  AlertTriangle
} from 'lucide-react';
import { InventoryCountAutomation } from '@/components/stock/inventory-count-automation';
import { InventoryCountDialog } from '@/components/stock/inventory-count-dialog';

export default function EnvanterSayimPage() {
  const [isManualDialogOpen, setIsManualDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Envanter Sayım</h1>
          <p className="text-muted-foreground">
            Stok sayımı ve fark analizi işlemleri
          </p>
        </div>
        <Button onClick={() => setIsManualDialogOpen(true)}>
          <Calculator className="h-4 w-4 mr-2" />
          Manuel Sayım
        </Button>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hammaddeler</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Otomatik Sayım</div>
            <p className="text-xs text-muted-foreground">
              Excel dosyası ile toplu sayım
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Yarı Mamuller</CardTitle>
            <Factory className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Otomatik Sayım</div>
            <p className="text-xs text-muted-foreground">
              Excel dosyası ile toplu sayım
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Nihai Ürünler</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">Otomatik Sayım</div>
            <p className="text-xs text-muted-foreground">
              Excel dosyası ile toplu sayım
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <Tabs defaultValue="raw" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="raw" className="flex items-center gap-2">
            <Package className="h-4 w-4" />
            Hammaddeler
          </TabsTrigger>
          <TabsTrigger value="semi" className="flex items-center gap-2">
            <Factory className="h-4 w-4" />
            Yarı Mamuller
          </TabsTrigger>
          <TabsTrigger value="finished" className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4" />
            Nihai Ürünler
          </TabsTrigger>
        </TabsList>

        <TabsContent value="raw">
          <InventoryCountAutomation 
            materialType="raw" 
            onComplete={(results) => {
              console.log('Raw materials count completed:', results);
            }}
          />
        </TabsContent>

        <TabsContent value="semi">
          <InventoryCountAutomation 
            materialType="semi" 
            onComplete={(results) => {
              console.log('Semi-finished products count completed:', results);
            }}
          />
        </TabsContent>

        <TabsContent value="finished">
          <InventoryCountAutomation 
            materialType="finished" 
            onComplete={(results) => {
              console.log('Finished products count completed:', results);
            }}
          />
        </TabsContent>
      </Tabs>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileSpreadsheet className="h-5 w-5" />
            Excel Dosyası Formatı
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Gerekli Sütunlar:</h4>
              <ul className="text-sm space-y-1">
                <li>• <strong>code</strong> veya <strong>kod</strong> - Malzeme kodu</li>
                <li>• <strong>name</strong> veya <strong>ad</strong> - Malzeme adı</li>
                <li>• <strong>counted_quantity</strong> veya <strong>sayılan_miktar</strong> - Sayılan miktar</li>
                <li>• <strong>unit</strong> veya <strong>birim</strong> - Birim (opsiyonel)</li>
                <li>• <strong>notes</strong> veya <strong>notlar</strong> - Notlar (opsiyonel)</li>
              </ul>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Otomatik İşlemler:
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Excel dosyasındaki veriler mevcut envanter ile eşleştirilir</li>
                <li>• Farklar otomatik hesaplanır (fazla/eksik)</li>
                <li>• Değer farkları birim fiyatlara göre hesaplanır</li>
                <li>• Onaylandığında stok otomatik güncellenir</li>
                <li>• Tüm işlemler audit log'a kaydedilir</li>
              </ul>
            </div>

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Önemli Notlar:
              </h4>
              <ul className="text-sm space-y-1">
                <li>• Excel dosyası .xlsx veya .xls formatında olmalıdır</li>
                <li>• Malzeme eşleştirmesi kod veya ad ile yapılır</li>
                <li>• Eşleşmeyen malzemeler göz ardı edilir</li>
                <li>• Sayım sonuçları Excel olarak export edilebilir</li>
                <li>• İşlem geri alınamaz, dikkatli olun</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Manual Count Dialog */}
      <InventoryCountDialog
        open={isManualDialogOpen}
        onOpenChange={setIsManualDialogOpen}
        onSuccess={() => {
          setIsManualDialogOpen(false);
          // Refresh data if needed
        }}
      />
    </div>
  );
}
