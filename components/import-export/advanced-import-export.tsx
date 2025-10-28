'use client';

import { useState, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Upload,
  Download,
  FileText,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Info,
  Eye,
  RefreshCw,
  Settings,
  FileSpreadsheet,
} from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

interface ImportResult {
  success: number;
  errors: number;
  warnings: number;
  skipped: number;
  totalRows: number;
  errorDetails: Array<{
    row: number;
    code: string;
    field?: string;
    error: string;
    severity: 'error' | 'warning';
    suggestion?: string;
  }>;
  summary: {
    processedAt: string;
    fileName: string;
    fileSize: number;
    processingTime: number;
    validationRules: string[];
  };
}

interface ExportConfig {
  type: 'raw' | 'semi' | 'finished' | 'bom' | 'stock' | 'production' | 'audit';
  format: 'xlsx' | 'csv';
  includeHeaders: boolean;
  includeMetadata: boolean;
  template: boolean;
  dateRange?: {
    start: string;
    end: string;
  };
  filters?: Record<string, any>;
}

export default function AdvancedImportExport() {
  const [activeTab, setActiveTab] = useState<'import' | 'export'>('import');
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [showResultDialog, setShowResultDialog] = useState(false);
  const [showErrorDetails, setShowErrorDetails] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importConfig, setImportConfig] = useState({
    type: 'raw' as const,
    mode: 'validate-only' as 'validate-only' | 'import',
    skipErrors: false,
  });
  const [exportConfig, setExportConfig] = useState<ExportConfig>({
    type: 'raw',
    format: 'xlsx',
    includeHeaders: true,
    includeMetadata: true,
    template: false,
  });
  const [progress, setProgress] = useState(0);
  const { user } = useAuthStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setImportResult(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile) {
      toast.error('Lütfen bir dosya seçin');
      return;
    }

    if (!user?.id) {
      toast.error('Kullanıcı kimlik doğrulaması gerekli');
      return;
    }

    setIsLoading(true);
    setProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('type', importConfig.type);
      formData.append('mode', importConfig.mode);
      formData.append('skip_errors', importConfig.skipErrors.toString());

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/import-export/advanced-import', {
        method: 'POST',
        headers: {
          'x-user-id': user.id
        },
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const data = await response.json();

      if (response.ok) {
        setImportResult(data.result);
        setShowResultDialog(true);
        
        if (importConfig.mode === 'validate-only') {
          toast.success(`Validasyon tamamlandı: ${data.result.success} geçerli, ${data.result.errors} hata`);
        } else {
          toast.success(`Import tamamlandı: ${data.result.success} kayıt eklendi`);
        }
      } else {
        toast.error(data.error || 'Import başarısız');
      }
    } catch (error) {
      toast.error('Import sırasında hata oluştu');
      logger.error('Import error:', error);
    } finally {
      setIsLoading(false);
      setProgress(0);
    }
  };

  const handleExport = async () => {
    if (!user?.id) {
      toast.error('Kullanıcı kimlik doğrulaması gerekli');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch('/api/import-export/advanced-export', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(exportConfig),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportConfig.type}_${exportConfig.template ? 'template' : 'export'}.${exportConfig.format}`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        toast.success('Export başarıyla tamamlandı');
      } else {
        const error = await response.json();
        toast.error(error.error || 'Export başarısız');
      }
    } catch (error) {
      toast.error('Export sırasında hata oluştu');
      logger.error('Export error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getSeverityIcon = (severity: 'error' | 'warning') => {
    return severity === 'error' ? (
      <XCircle className="h-4 w-4 text-red-500" />
    ) : (
      <AlertTriangle className="h-4 w-4 text-yellow-500" />
    );
  };

  const getSeverityBadge = (severity: 'error' | 'warning') => {
    return severity === 'error' ? (
      <Badge variant="destructive">Hata</Badge>
    ) : (
      <Badge variant="secondary">Uyarı</Badge>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Gelişmiş Import/Export</h1>
          <p className="text-muted-foreground">
            Excel dosyalarını import/export edin ve hata yönetimi yapın
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(value) => setActiveTab(value as 'import' | 'export')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="import" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Import
          </TabsTrigger>
          <TabsTrigger value="export" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export
          </TabsTrigger>
        </TabsList>

        {/* Import Tab */}
        <TabsContent value="import" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Dosya Import
              </CardTitle>
              <CardDescription>
                Excel dosyasını yükleyin ve gelişmiş validasyon ile import edin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* File Selection */}
              <div className="space-y-4">
                <Label htmlFor="file">Excel Dosyası</Label>
                <div className="flex items-center gap-4">
                  <Input
                    ref={fileInputRef}
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileSelect}
                    className="hidden"
                  />
                  <Button
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    {selectedFile ? selectedFile.name : 'Dosya Seç'}
                  </Button>
                  {selectedFile && (
                    <div className="text-sm text-muted-foreground">
                      {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>

              {/* Import Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="import-type">Veri Tipi</Label>
                  <Select
                    value={importConfig.type}
                    onValueChange={(value: any) => setImportConfig(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Hammaddeler</SelectItem>
                      <SelectItem value="semi">Yarı Mamuller</SelectItem>
                      <SelectItem value="finished">Nihai Ürünler</SelectItem>
                      <SelectItem value="bom">Ürün Ağacı (BOM)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="import-mode">Mod</Label>
                  <Select
                    value={importConfig.mode}
                    onValueChange={(value: any) => setImportConfig(prev => ({ ...prev, mode: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="validate-only">Sadece Validasyon</SelectItem>
                      <SelectItem value="import">Import Et</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="skip-errors">Hata Yönetimi</Label>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="skip-errors"
                      checked={importConfig.skipErrors}
                      onCheckedChange={(checked) => setImportConfig(prev => ({ ...prev, skipErrors: checked }))}
                    />
                    <Label htmlFor="skip-errors">Hataları atla</Label>
                  </div>
                </div>
              </div>

              {/* Progress Bar */}
              {isLoading && (
                <div className="space-y-2">
                  <Label>İşlem Durumu</Label>
                  <Progress value={progress} className="w-full" />
                  <div className="text-sm text-muted-foreground">
                    {importConfig.mode === 'validate-only' ? 'Validasyon yapılıyor...' : 'Import ediliyor...'}
                  </div>
                </div>
              )}

              {/* Import Button */}
              <Button
                onClick={handleImport}
                disabled={!selectedFile || isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    İşleniyor...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    {importConfig.mode === 'validate-only' ? 'Validasyon Yap' : 'Import Et'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Import Result Dialog */}
          <Dialog open={showResultDialog} onOpenChange={setShowResultDialog}>
            <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Sonucu</DialogTitle>
                <DialogDescription>
                  {importResult?.summary.fileName} - {importResult?.summary.processedAt}
                </DialogDescription>
              </DialogHeader>

              {importResult && (
                <div className="space-y-6">
                  {/* Summary Cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <div>
                            <div className="text-2xl font-bold text-green-600">{importResult.success}</div>
                            <div className="text-xs text-muted-foreground">Başarılı</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <XCircle className="h-4 w-4 text-red-500" />
                          <div>
                            <div className="text-2xl font-bold text-red-600">{importResult.errors}</div>
                            <div className="text-xs text-muted-foreground">Hata</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-500" />
                          <div>
                            <div className="text-2xl font-bold text-yellow-600">{importResult.warnings}</div>
                            <div className="text-xs text-muted-foreground">Uyarı</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                          <Info className="h-4 w-4 text-blue-500" />
                          <div>
                            <div className="text-2xl font-bold text-blue-600">{importResult.totalRows}</div>
                            <div className="text-xs text-muted-foreground">Toplam</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Error Details */}
                  {importResult.errorDetails.length > 0 && (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold">Hata Detayları</h3>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setShowErrorDetails(!showErrorDetails)}
                        >
                          <Eye className="mr-2 h-4 w-4" />
                          {showErrorDetails ? 'Gizle' : 'Göster'}
                        </Button>
                      </div>

                      {showErrorDetails && (
                        <div className="max-h-64 overflow-y-auto border rounded-lg">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Satır</TableHead>
                                <TableHead>Kod</TableHead>
                                <TableHead>Tip</TableHead>
                                <TableHead>Hata</TableHead>
                                <TableHead>Öneri</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {importResult.errorDetails.map((error, index) => (
                                <TableRow key={index}>
                                  <TableCell>{error.row}</TableCell>
                                  <TableCell>{error.code}</TableCell>
                                  <TableCell>{getSeverityBadge(error.severity)}</TableCell>
                                  <TableCell>{error.error}</TableCell>
                                  <TableCell>{error.suggestion || '-'}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </TabsContent>

        {/* Export Tab */}
        <TabsContent value="export" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                Veri Export
              </CardTitle>
              <CardDescription>
                Verilerinizi Excel formatında export edin veya template indirin
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Export Configuration */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="export-type">Veri Tipi</Label>
                  <Select
                    value={exportConfig.type}
                    onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, type: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="raw">Hammaddeler</SelectItem>
                      <SelectItem value="semi">Yarı Mamuller</SelectItem>
                      <SelectItem value="finished">Nihai Ürünler</SelectItem>
                      <SelectItem value="bom">Ürün Ağacı (BOM)</SelectItem>
                      <SelectItem value="stock">Stok Raporu</SelectItem>
                      <SelectItem value="production">Üretim Raporu</SelectItem>
                      <SelectItem value="audit">İşlem Geçmişi</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="export-format">Format</Label>
                  <Select
                    value={exportConfig.format}
                    onValueChange={(value: any) => setExportConfig(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                      <SelectItem value="csv">CSV (.csv)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Export Options */}
              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch
                    id="template-mode"
                    checked={exportConfig.template}
                    onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, template: checked }))}
                  />
                  <Label htmlFor="template-mode">Template olarak export et</Label>
                </div>

                {!exportConfig.template && (
                  <>
                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-headers"
                        checked={exportConfig.includeHeaders}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeHeaders: checked }))}
                      />
                      <Label htmlFor="include-headers">Başlık satırlarını dahil et</Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="include-metadata"
                        checked={exportConfig.includeMetadata}
                        onCheckedChange={(checked) => setExportConfig(prev => ({ ...prev, includeMetadata: checked }))}
                      />
                      <Label htmlFor="include-metadata">Metadata bilgilerini dahil et</Label>
                    </div>
                  </>
                )}
              </div>

              {/* Export Button */}
              <Button
                onClick={handleExport}
                disabled={isLoading}
                className="w-full"
              >
                {isLoading ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Export Ediliyor...
                  </>
                ) : (
                  <>
                    <Download className="mr-2 h-4 w-4" />
                    {exportConfig.template ? 'Template İndir' : 'Export Et'}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
