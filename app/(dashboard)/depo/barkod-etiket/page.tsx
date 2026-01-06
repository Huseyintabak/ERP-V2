'use client';

import { useState } from 'react';
import {
  Printer,
  Download,
  FileText,
  Tag,
  QrCode,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { ProductSelector } from '@/components/barcode/ProductSelector';
import { LabelPreview } from '@/components/barcode/LabelPreview';
import {
  generateImageLabels,
  downloadLabels,
  printImageLabels,
  type LabelProduct,
  type LabelOptions,
} from '@/lib/utils/barcode-label';

export default function BarcodeEtiketPage() {
  const [selectedProducts, setSelectedProducts] = useState<LabelProduct[]>([]);
  const [copies, setCopies] = useState(1);
  const [isGenerating, setIsGenerating] = useState(false);

  // Fixed options for QR-only labels at 100x70mm
  const options: LabelOptions = {
    format: 'png',
    labelSize: 'custom', // We'll use 100x70mm
    includeQR: true,
    includePrice: false,
    copies: copies,
    barcodeType: 'CODE128', // Not used, but kept for compatibility
    qrOnly: true, // New flag to indicate QR-only mode
  };

  // Generate and download labels
  async function handleGenerateLabels() {
    if (selectedProducts.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    setIsGenerating(true);

    try {
      const timestamp = new Date().toISOString().split('T')[0];
      const blobs = await generateImageLabels(selectedProducts, options);
      downloadLabels(blobs, `qr-etiketler-${timestamp}`, 'png');
      toast.success(`QR etiketler oluşturuldu (${blobs.length} adet)`);
    } catch (error) {
      console.error('Error generating labels:', error);
      toast.error('Etiketler oluşturulurken hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  }

  // Generate and print labels directly
  async function handlePrintLabels() {
    if (selectedProducts.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    setIsGenerating(true);

    try {
      const blobs = await generateImageLabels(selectedProducts, options);
      await printImageLabels(blobs, 'custom');
      toast.success(`${blobs.length} etiket yazdırma için hazırlandı`);
    } catch (error) {
      console.error('Error printing labels:', error);
      toast.error('Yazdırma sırasında hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  }

  // Calculate total labels to be printed
  const totalLabels = selectedProducts.length * copies;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">QR Kod Etiket Yazdırma</h1>
          <p className="text-muted-foreground mt-1">
            Ürünler için QR kod etiketleri oluşturun ve yazdırın (100x70mm kağıt, 90x60mm içerik)
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrintLabels}
            disabled={selectedProducts.length === 0 || isGenerating}
            size="lg"
          >
            <Printer className="w-4 h-4 mr-2" />
            Yazdır
          </Button>
          <Button
            onClick={handleGenerateLabels}
            disabled={selectedProducts.length === 0 || isGenerating}
            variant="secondary"
            size="lg"
          >
            <Download className="w-4 h-4 mr-2" />
            İndir
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Seçili Ürün
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{selectedProducts.length}</div>
              <Tag className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Toplam Etiket
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">{totalLabels}</div>
              <FileText className="w-4 h-4 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Etiket Boyutu
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold">90x60</div>
              <span className="text-xs text-muted-foreground">mm</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Etiket Tipi
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-lg font-bold">QR Kod</div>
              <QrCode className="w-5 h-5 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selection */}
        <div className="lg:col-span-2 space-y-4">
          <ProductSelector
            selectedProducts={selectedProducts}
            onSelectionChange={setSelectedProducts}
          />
        </div>

        {/* Right Column - Settings & Preview */}
        <div className="space-y-4">
          {/* Settings Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <QrCode className="w-5 h-5" />
                Etiket Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Paper Size Info */}
              <div className="space-y-2">
                <Label>Kağıt Boyutu</Label>
                <div className="p-3 bg-muted rounded-lg">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">90 x 60 mm</span>
                    <span className="text-xs text-muted-foreground">100x70mm kağıt</span>
                  </div>
                </div>
              </div>

              {/* Label Content Info */}
              <div className="space-y-2">
                <Label>Etiket İçeriği</Label>
                <div className="p-3 bg-muted rounded-lg space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Ürün Adı</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>Ürün Kodu</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-primary"></div>
                    <span>QR Kod</span>
                  </div>
                </div>
              </div>

              {/* Number of Copies */}
              <div className="space-y-2">
                <Label htmlFor="copies">Kopya Sayısı</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="100"
                  value={copies}
                  onChange={(e) => setCopies(parseInt(e.target.value) || 1)}
                />
                <p className="text-xs text-muted-foreground">
                  Her ürün için kaç etiket basılacak
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Preview Card */}
          {selectedProducts.length > 0 && (
            <LabelPreview
              product={selectedProducts[0]}
              options={options}
            />
          )}
        </div>
      </div>

      {/* Action Buttons (Mobile) */}
      <Card className="lg:hidden">
        <CardContent className="pt-6">
          <div className="flex flex-col gap-2">
            <Button
              onClick={handlePrintLabels}
              disabled={selectedProducts.length === 0 || isGenerating}
              size="lg"
              className="w-full"
            >
              <Printer className="w-4 h-4 mr-2" />
              {isGenerating ? 'Oluşturuluyor...' : 'Yazdır'}
            </Button>
            <Button
              onClick={handleGenerateLabels}
              disabled={selectedProducts.length === 0 || isGenerating}
              variant="secondary"
              size="lg"
              className="w-full"
            >
              <Download className="w-4 h-4 mr-2" />
              {isGenerating ? 'Oluşturuluyor...' : 'İndir'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
