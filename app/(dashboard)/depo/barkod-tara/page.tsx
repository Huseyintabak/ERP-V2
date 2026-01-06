'use client';


import { useState, useEffect } from 'react';
import { Switch } from '@/components/ui/switch';
import { BarcodeScanner } from '@/components/barcode/barcode-scanner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  Clock,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Camera,
  Zap,
  Search,
  BarChart3,
  Activity,
} from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { scanSuccess, scanError, transferSuccess, setFeedbackEnabled, isFeedbackEnabled } from '@/lib/utils/feedback';

interface ProductInfo {
  id: string;
  code: string;
  name: string;
  barcode: string;
  quantity: number;
  unit?: string;
  critical_level: number;
  material_type: 'raw' | 'semi' | 'finished';
  material_type_label: string;
}

interface Movement {
  movement_type: string;
  quantity: number;
  created_at: string;
  description: string;
}

interface ZoneInventory {
  quantity: number;
  zone: {
    id: string;
    name: string;
    zone_type: string;
  };
}

interface Zone {
  id: string;
  name: string;
  zone_type: string;
}

interface ScanResult {
  found: boolean;
  product?: ProductInfo;
  recentMovements?: Movement[];
  zoneInventory?: ZoneInventory[];
  barcode: string;
  message?: string;
}

export default function BarkodTaraPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [showScanner, setShowScanner] = useState(true);

  // Transfer states
  const [showTransfer, setShowTransfer] = useState(false);
  const [zones, setZones] = useState<Zone[]>([]);
  const [selectedSourceZone, setSelectedSourceZone] = useState<string>('');
  const [selectedTargetZone, setSelectedTargetZone] = useState<string>('');
  const [transferQuantity, setTransferQuantity] = useState<string>('');
  const [isTransferring, setIsTransferring] = useState(false);
  const [feedbackEnabled, setFeedbackEnabledState] = useState(true);

  // KPI data
  const [kpiData, setKpiData] = useState({
    totalScans: 0,
    successfulScans: 0,
    failedScans: 0,
    transfersToday: 0,
  });

  // Fetch zones on mount
  useEffect(() => {
    fetchZones();
    setFeedbackEnabledState(isFeedbackEnabled());
  }, []);

  // Update feedback setting
  const handleFeedbackToggle = (enabled: boolean) => {
    setFeedbackEnabledState(enabled);
    setFeedbackEnabled(enabled);
  };

  const fetchZones = async () => {
    try {
      const response = await fetch('/api/warehouse/zones');
      if (response.ok) {
        const data = await response.json();
        setZones(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching zones:', error);
    }
  };

  const handleScan = async (barcode: string) => {
    setIsLoading(true);
    setScanResult(null);
    setShowTransfer(false);
    setSelectedSourceZone('');
    setSelectedTargetZone('');
    setTransferQuantity('');

    try {
      const response = await fetch(`/api/barcode/lookup?barcode=${encodeURIComponent(barcode)}`);

      if (!response.ok) {
        if (response.status === 404) {
          const data = await response.json();
          scanError(); // Sound + Vibration + Red Flash
          toast.error(data.message || 'Barkod bulunamadı');
          setScanResult({
            found: false,
            barcode,
            message: data.message || 'Barkod bulunamadı',
          });
          setKpiData((prev) => ({ ...prev, totalScans: prev.totalScans + 1, failedScans: prev.failedScans + 1 }));
          return;
        }
        throw new Error('Barkod sorgulanamadı');
      }

      const data: ScanResult = await response.json();
      setScanResult(data);

      if (data.found) {
        scanSuccess(); // Sound + Vibration + Green Flash
        toast.success(`Ürün bulundu: ${data.product?.name}`);
        setShowScanner(false);
        setKpiData((prev) => ({ ...prev, totalScans: prev.totalScans + 1, successfulScans: prev.successfulScans + 1 }));

        // Auto-select first zone with inventory as source
        if (data.zoneInventory && data.zoneInventory.length > 0) {
          const firstZone = data.zoneInventory.find((z: ZoneInventory) => z.quantity > 0);
          if (firstZone) {
            setSelectedSourceZone(firstZone.zone.id);
          }
        }
      }
    } catch (error) {
      console.error('Barcode scan error:', error);
      scanError(); // Sound + Vibration + Red Flash
      toast.error('Barkod tarama hatası');
      setKpiData((prev) => ({ ...prev, totalScans: prev.totalScans + 1, failedScans: prev.failedScans + 1 }));
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewScan = () => {
    setScanResult(null);
    setShowScanner(true);
    setShowTransfer(false);
    setSelectedSourceZone('');
    setSelectedTargetZone('');
    setTransferQuantity('');
  };

  const handleTransfer = async () => {
    if (!scanResult?.product || !selectedSourceZone || !selectedTargetZone || !transferQuantity) {
      toast.error('Lütfen tüm alanları doldurun');
      return;
    }

    const quantity = parseInt(transferQuantity);
    if (isNaN(quantity) || quantity <= 0) {
      toast.error('Geçerli bir miktar girin');
      return;
    }

    // Check available quantity in source zone
    const sourceZoneInventory = scanResult.zoneInventory?.find(
      (zi) => zi.zone.id === selectedSourceZone
    );
    if (!sourceZoneInventory || sourceZoneInventory.quantity < quantity) {
      toast.error(
        `Yetersiz stok. Mevcut: ${sourceZoneInventory?.quantity || 0}`
      );
      return;
    }

    setIsTransferring(true);

    try {
      const response = await fetch('/api/warehouse/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromZoneId: selectedSourceZone,
          toZoneId: selectedTargetZone,
          productId: scanResult.product.id,
          quantity: quantity,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Transfer başarısız');
      }

      transferSuccess(); // Special sound + Vibration + Bright Green Flash
      toast.success('Transfer başarıyla tamamlandı! 🎉');
      setKpiData((prev) => ({ ...prev, transfersToday: prev.transfersToday + 1 }));

      // Refresh product data
      await handleScan(scanResult.product.barcode);

      // Reset transfer form
      setTransferQuantity('');
      setShowTransfer(false);
    } catch (error: any) {
      console.error('Transfer error:', error);
      scanError(); // Sound + Vibration + Red Flash
      toast.error(error.message || 'Transfer hatası');
    } finally {
      setIsTransferring(false);
    }
  };

  const getMovementIcon = (type: string) => {
    return type === 'giris' ? (
      <TrendingUp className="h-4 w-4 text-green-600" />
    ) : (
      <TrendingDown className="h-4 w-4 text-red-600" />
    );
  };

  const getStockStatus = (quantity: number, criticalLevel: number) => {
    if (quantity === 0) {
      return (
        <Badge variant="destructive" className="gap-1">
          <AlertCircle className="h-3 w-3" />
          Stokta Yok
        </Badge>
      );
    } else if (quantity <= criticalLevel) {
      return (
        <Badge variant="outline" className="gap-1 border-orange-500 text-orange-700">
          <AlertCircle className="h-3 w-3" />
          Kritik Seviye
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="gap-1 border-green-500 text-green-700">
          <CheckCircle2 className="h-3 w-3" />
          Stokta Var
        </Badge>
      );
    }
  };

  const getAvailableQuantity = () => {
    if (!selectedSourceZone || !scanResult?.zoneInventory) return 0;
    const sourceZone = scanResult.zoneInventory.find((zi) => zi.zone.id === selectedSourceZone);
    return sourceZone?.quantity || 0;
  };

  const getZoneName = (zoneId: string) => {
    const zone = zones.find((z) => z.id === zoneId);
    return zone?.name || zoneId;
  };

  // Filter zones for source (only zones with inventory)
  const sourceZones = scanResult?.zoneInventory?.filter((zi) => zi.quantity > 0) || [];

  // Filter zones for target (all zones except selected source)
  const targetZones = zones.filter((z) => z.id !== selectedSourceZone);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Barkod Tarama & Transfer</h1>
          <p className="text-muted-foreground">Barkod okutarak ürün bilgilerine erişin ve zone transferi yapın</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Switch
              id="feedback-toggle"
              checked={feedbackEnabled}
              onCheckedChange={handleFeedbackToggle}
            />
            <Label htmlFor="feedback-toggle" className="text-sm cursor-pointer">
              🔊 Ses & Titreşim
            </Label>
          </div>
          {scanResult?.found && (
            <Button onClick={handleNewScan} size="lg">
              <Search className="h-4 w-4 mr-2" />
              Yeni Tarama
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Tarama</CardTitle>
            <Camera className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.totalScans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Başarılı</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.successfulScans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Başarısız</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.failedScans}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Bugün Transfer</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{kpiData.transfersToday}</div>
          </CardContent>
        </Card>
      </div>

      {/* Scanner Card */}
      {showScanner && (
        <Card>
          <CardHeader>
            <CardTitle>Barkod Okuyucu</CardTitle>
          </CardHeader>
          <CardContent>
            <BarcodeScanner
              onScan={handleScan}
              title=""
              showManualInput={true}
            />
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {isLoading && (
        <Card>
          <CardContent className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            <span className="ml-3 text-gray-600 font-medium">Barkod sorgulanıyor...</span>
          </CardContent>
        </Card>
      )}

      {/* Product Not Found */}
      {scanResult && !scanResult.found && (
        <Card>
          <CardContent className="py-12 text-center">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">
              Barkod Bulunamadı
            </h3>
            <p className="text-gray-600 mb-4">
              <strong className="font-mono">{scanResult.barcode}</strong> barkodu sistemde kayıtlı değil
            </p>
            <Button onClick={handleNewScan} variant="outline" size="lg">
              <Search className="h-4 w-4 mr-2" />
              Yeni Barkod Tara
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Product Info */}
      {scanResult?.found && scanResult.product && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Ürün Bilgileri
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Product Header */}
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-2xl font-bold text-gray-900 mb-2">
                    {scanResult.product.name}
                  </h3>
                  <div className="flex flex-wrap gap-3 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Kod:</span>
                      <span className="font-mono">{scanResult.product.code}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="font-medium">Barkod:</span>
                      <span className="font-mono">{scanResult.product.barcode}</span>
                    </div>
                  </div>
                </div>
                <Badge variant="secondary" className="text-sm px-3 py-1">
                  {scanResult.product.material_type_label}
                </Badge>
              </div>

              {/* Stock Info Grid */}
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Mevcut Stok
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{scanResult.product.quantity}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scanResult.product.unit || 'adet'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Kritik Seviye
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{scanResult.product.critical_level}</div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {scanResult.product.unit || 'adet'}
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Durum
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {getStockStatus(
                      scanResult.product.quantity,
                      scanResult.product.critical_level
                    )}
                  </CardContent>
                </Card>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => {
                    const typeMap = {
                      raw: 'hammaddeler',
                      semi: 'yari-mamuller',
                      finished: 'nihai-urunler',
                    };
                    router.push(
                      `/stok/${typeMap[scanResult.product!.material_type]}`
                    );
                  }}
                >
                  <BarChart3 className="h-4 w-4 mr-2" />
                  Stok Detayı
                </Button>
                <Button
                  variant="outline"
                  className="flex-1"
                  onClick={() => router.push('/stok/hareketler')}
                >
                  <Activity className="h-4 w-4 mr-2" />
                  Hareketler
                </Button>
                {scanResult.product.material_type === 'finished' && (
                  <Button
                    onClick={() => setShowTransfer(!showTransfer)}
                    className="flex-1"
                  >
                    <Zap className="h-4 w-4 mr-2" />
                    {showTransfer ? 'Transfer İptal' : 'Zone Transfer'}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Transfer Form */}
          {showTransfer && scanResult.product.material_type === 'finished' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ArrowRight className="h-5 w-5" />
                  Zone Transfer İşlemi
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  {/* Source Zone */}
                  <div className="space-y-2">
                    <Label htmlFor="source-zone">Kaynak Zone</Label>
                    <Select
                      value={selectedSourceZone}
                      onValueChange={setSelectedSourceZone}
                      disabled={sourceZones.length === 0}
                    >
                      <SelectTrigger id="source-zone">
                        <SelectValue placeholder="Kaynak zone seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {sourceZones.map((zi) => (
                          <SelectItem key={zi.zone.id} value={zi.zone.id}>
                            {zi.zone.name} ({zi.quantity} adet)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sourceZones.length === 0 && (
                      <p className="text-sm text-red-600">
                        Hiçbir zone'da stok yok
                      </p>
                    )}
                  </div>

                  {/* Target Zone */}
                  <div className="space-y-2">
                    <Label htmlFor="target-zone">Hedef Zone</Label>
                    <Select
                      value={selectedTargetZone}
                      onValueChange={setSelectedTargetZone}
                      disabled={!selectedSourceZone}
                    >
                      <SelectTrigger id="target-zone">
                        <SelectValue placeholder="Hedef zone seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {targetZones.map((zone) => (
                          <SelectItem key={zone.id} value={zone.id}>
                            {zone.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">
                      Miktar
                      {selectedSourceZone && (
                        <span className="ml-2 text-sm text-muted-foreground">
                          (Mevcut: {getAvailableQuantity()})
                        </span>
                      )}
                    </Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={getAvailableQuantity()}
                      placeholder="Miktar girin"
                      value={transferQuantity}
                      onChange={(e) => setTransferQuantity(e.target.value)}
                      disabled={!selectedSourceZone}
                    />
                  </div>
                </div>

                {/* Transfer Summary */}
                {selectedSourceZone && selectedTargetZone && transferQuantity && (
                  <div className="p-4 bg-muted rounded-lg">
                    <p className="text-sm font-semibold mb-2">Transfer Özeti:</p>
                    <div className="space-y-1 text-sm">
                      <p>📦 {scanResult.product.name} ({scanResult.product.code})</p>
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3 w-3" />
                        {getZoneName(selectedSourceZone)}
                        <ArrowRight className="h-3 w-3" />
                        {getZoneName(selectedTargetZone)}
                      </p>
                      <p className="font-semibold">Miktar: {transferQuantity} adet</p>
                    </div>
                  </div>
                )}

                {/* Transfer Button */}
                <Button
                  onClick={handleTransfer}
                  disabled={
                    !selectedSourceZone ||
                    !selectedTargetZone ||
                    !transferQuantity ||
                    isTransferring
                  }
                  className="w-full"
                  size="lg"
                >
                  {isTransferring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transfer Yapılıyor...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Transfer Yap
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Zone Inventory & Recent Movements */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Zone Inventory */}
            {scanResult.zoneInventory && scanResult.zoneInventory.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-5 w-5" />
                    Zone Dağılımı
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scanResult.zoneInventory.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <div>
                            <p className="font-medium">{item.zone.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {item.zone.zone_type === 'center'
                                ? 'Merkez Zone'
                                : 'Müşteri Zone'}
                            </p>
                          </div>
                        </div>
                        <Badge variant={item.quantity > 0 ? 'default' : 'secondary'}>
                          {item.quantity} adet
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Movements */}
            {scanResult.recentMovements && scanResult.recentMovements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Son Hareketler
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {scanResult.recentMovements.map((movement, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 bg-muted rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          {getMovementIcon(movement.movement_type)}
                          <div>
                            <p className="text-sm font-medium">
                              {movement.movement_type === 'giris' ? 'Giriş' : 'Çıkış'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {movement.description}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold">{movement.quantity}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(movement.created_at).toLocaleDateString('tr-TR')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </>
      )}
    </div>
  );
}
