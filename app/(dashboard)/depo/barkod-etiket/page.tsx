'use client';

import { useState } from 'react';
import {
  Printer,
  Download,
  FileText,
  Settings,
  Sparkles,
  Tag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { ProductSelector } from '@/components/barcode/ProductSelector';
import { LabelPreview } from '@/components/barcode/LabelPreview';
import {
  generatePDFLabels,
  generateZPLLabels,
  generateImageLabels,
  downloadLabels,
  printPDFLabels,
  printImageLabels,
  type LabelProduct,
  type LabelOptions,
} from '@/lib/utils/barcode-label';

export default function BarcodeEtiketPage() {
  const [selectedProducts, setSelectedProducts] = useState<LabelProduct[]>([]);
  const [options, setOptions] = useState<LabelOptions>({
    format: 'png',
    labelSize: 'medium',
    includeQR: false,
    includePrice: false,
    copies: 1,
    barcodeType: 'CODE128',
  });
  const [isGenerating, setIsGenerating] = useState(false);

  // Update option helper
  function updateOption<K extends keyof LabelOptions>(
    key: K,
    value: LabelOptions[K]
  ) {
    setOptions((prev) => ({ ...prev, [key]: value }));
  }

  // Generate and download labels
  async function handleGenerateLabels() {
    if (selectedProducts.length === 0) {
      toast.error('Lütfen en az bir ürün seçin');
      return;
    }

    setIsGenerating(true);

    try {
      const timestamp = new Date().toISOString().split('T')[0];

      if (options.format === 'png') {
        const blobs = await generateImageLabels(selectedProducts, options);
        downloadLabels(blobs, `barkod-etiketler-${timestamp}`, 'png');
        toast.success(`PNG etiketler oluşturuldu (${blobs.length} adet)`);
      } else {
        const zpl = generateZPLLabels(selectedProducts, options);
        downloadLabels(zpl, `barkod-etiketler-${timestamp}`, 'zpl');
        toast.success('ZPL etiketler oluşturuldu');
      }
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

    if (options.format !== 'png') {
      toast.error('Doğrudan yazdırma sadece PNG formatı için kullanılabilir');
      return;
    }

    setIsGenerating(true);

    try {
      const blobs = await generateImageLabels(selectedProducts, options);
      await printImageLabels(blobs, options.labelSize);
      toast.success(`${blobs.length} etiket yazdırma için hazırlandı`);
    } catch (error) {
      console.error('Error printing labels:', error);
      toast.error('Yazdırma sırasında hata oluştu');
    } finally {
      setIsGenerating(false);
    }
  }

  // Calculate total labels to be printed
  const totalLabels = selectedProducts.length * (options.copies || 1);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Barkod Etiket Yazdırma</h1>
          <p className="text-muted-foreground mt-1">
            Ürünler için barkod etiketleri oluşturun ve yazdırın
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handlePrintLabels}
            disabled={selectedProducts.length === 0 || isGenerating || options.format === 'zpl'}
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
              <div className="text-2xl font-bold">
                {options.labelSize === 'small' ? '40x30' : options.labelSize === 'medium' ? '50x40' : '100x50'}
              </div>
              <span className="text-xs text-muted-foreground">mm</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Format
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <Badge variant="secondary" className="text-sm font-bold uppercase">
                {options.format}
              </Badge>
              <Sparkles className="w-4 h-4 text-muted-foreground" />
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
                <Settings className="w-5 h-5" />
                Etiket Ayarları
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Format Selection */}
              <div className="space-y-2">
                <Label htmlFor="format">Format</Label>
                <Select
                  value={options.format}
                  onValueChange={(value: 'png' | 'zpl') =>
                    updateOption('format', value)
                  }
                >
                  <SelectTrigger id="format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="png">PNG (Resim - Önerilen)</SelectItem>
                    <SelectItem value="zpl">ZPL (Zebra Yazıcı)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  {options.format === 'pdf'
                    ? 'Tüm yazıcılarla uyumlu PDF formatı'
                    : 'Zebra termal yazıcılar için ZPL formatı'}
                </p>
              </div>

              <Separator />

              {/* Label Size */}
              <div className="space-y-2">
                <Label htmlFor="labelSize">Etiket Boyutu</Label>
                <Select
                  value={options.labelSize}
                  onValueChange={(value: 'small' | 'medium' | 'large') =>
                    updateOption('labelSize', value)
                  }
                >
                  <SelectTrigger id="labelSize">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Küçük (40x30mm)</SelectItem>
                    <SelectItem value="medium">Orta (50x40mm)</SelectItem>
                    <SelectItem value="large">Büyük (100x50mm)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Barcode Type */}
              <div className="space-y-2">
                <Label htmlFor="barcodeType">Barkod Tipi</Label>
                <Select
                  value={options.barcodeType}
                  onValueChange={(value) =>
                    updateOption('barcodeType', value as any)
                  }
                >
                  <SelectTrigger id="barcodeType">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CODE128">CODE128 (Önerilen)</SelectItem>
                    <SelectItem value="EAN13">EAN13</SelectItem>
                    <SelectItem value="CODE39">CODE39</SelectItem>
                    <SelectItem value="ITF14">ITF14</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  CODE128 çoğu ürün için en uygun formattır
                </p>
              </div>

              <Separator />

              {/* Number of Copies */}
              <div className="space-y-2">
                <Label htmlFor="copies">Kopya Sayısı</Label>
                <Input
                  id="copies"
                  type="number"
                  min="1"
                  max="100"
                  value={options.copies}
                  onChange={(e) =>
                    updateOption('copies', parseInt(e.target.value) || 1)
                  }
                />
                <p className="text-xs text-muted-foreground">
                  Her ürün için kaç etiket basılacak
                </p>
              </div>

              <Separator />

              {/* Additional Options */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="includeQR" className="cursor-pointer">
                    QR Kod Ekle
                  </Label>
                  <Switch
                    id="includeQR"
                    checked={options.includeQR}
                    onCheckedChange={(checked) =>
                      updateOption('includeQR', checked)
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="includePrice" className="cursor-pointer">
                    Fiyat Bilgisi
                  </Label>
                  <Switch
                    id="includePrice"
                    checked={options.includePrice}
                    onCheckedChange={(checked) =>
                      updateOption('includePrice', checked)
                    }
                  />
                </div>
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
              disabled={selectedProducts.length === 0 || isGenerating || options.format !== 'pdf'}
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
