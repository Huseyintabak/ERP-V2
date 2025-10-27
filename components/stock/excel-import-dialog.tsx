'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Upload, Download, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

const importSchema = z.object({
  type: z.enum(['raw', 'semi', 'finished'], {
    required_error: 'Tür seçiniz',
  }),
  file: z.any().refine((file) => file instanceof File, {
    message: 'Dosya seçiniz',
  }),
});

type ImportFormData = z.infer<typeof importSchema>;

interface ImportResult {
  success: number;
  errors: number;
  errorDetails: Array<{
    row: number;
    code: string;
    error: string;
  }>;
  totalRows: number;
}

interface ExcelImportDialogProps {
  onImportComplete?: () => void;
}

export function ExcelImportDialog({ onImportComplete }: ExcelImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [progress, setProgress] = useState(0);

  const form = useForm<ImportFormData>({
    resolver: zodResolver(importSchema),
    defaultValues: {
      type: 'raw',
    },
  });

  const onSubmit = async (data: ImportFormData) => {
    setIsImporting(true);
    setProgress(0);
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append('file', data.file);
      formData.append('type', data.type);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 10, 90));
      }, 200);

      const response = await fetch('/api/stock/import', {
        method: 'POST',
        body: formData,
      });

      clearInterval(progressInterval);
      setProgress(100);

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Import failed');
      }

      setImportResult(result);
      
      if (result.results.success > 0) {
        toast.success(`${result.results.success} kayıt başarıyla içe aktarıldı`);
      }
      
      if (result.results.errors > 0) {
        toast.warning(`${result.results.errors} kayıt hata ile işlendi`);
      }

      // Don't reset form immediately, let user see the results
      // form.reset();
      
      // Call callback
      if (onImportComplete) {
        onImportComplete();
      }

    } catch (error: unknown) {
      logger.error('Import error:', error);
      const errorMessage = error instanceof Error ? error.message : 'İçe aktarma hatası';
      toast.error(errorMessage);
    } finally {
      setIsImporting(false);
    }
  };

  const downloadTemplate = async (type: string) => {
    try {
      const response = await fetch(`/api/stock/export?type=${type}&format=xlsx`);
      
      if (!response.ok) {
        throw new Error('Template download failed');
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${type}_template.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('Template indirildi');
    } catch (error: unknown) {
      logger.error('Template download error:', error);
      toast.error('Template indirme hatası');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Upload className="mr-2 h-4 w-4" />
          Excel İçe Aktar
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Excel İçe Aktarma</DialogTitle>
          <DialogDescription>
            Stok verilerini Excel dosyasından içe aktarın. Önce template indirip doldurun.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tür</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Tür seçin" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="raw">Hammadde</SelectItem>
                        <SelectItem value="semi">Yarı Mamul</SelectItem>
                        <SelectItem value="finished">Nihai Ürün</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex items-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => downloadTemplate(form.watch('type'))}
                  className="w-full"
                >
                  <Download className="mr-2 h-4 w-4" />
                  Template İndir
                </Button>
              </div>
            </div>

            <FormField
              control={form.control}
              name="file"
              render={({ field: { onChange, ...field } }) => (
                <FormItem>
                  <FormLabel>Excel Dosyası</FormLabel>
                  <FormControl>
                    <Input
                      type="file"
                      accept=".xlsx,.xls"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        onChange(file);
                      }}
                      disabled={isImporting}
                    />
                  </FormControl>
                  <FormDescription>
                    .xlsx veya .xls formatında dosya seçin
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {isImporting && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>İçe aktarılıyor...</span>
                  <span>{progress}%</span>
                </div>
                <Progress value={progress} className="w-full" />
              </div>
            )}

            {importResult && (
              <div className="space-y-4">
                <Alert>
                  <CheckCircle className="h-4 w-4" />
                  <AlertDescription>
                    İçe aktarma tamamlandı! {importResult.results.success} başarılı, {importResult.results.errors} hatalı kayıt.
                  </AlertDescription>
                </Alert>

                {importResult.results.errorDetails.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="font-medium text-sm">Hata Detayları:</h4>
                    <div className="max-h-40 overflow-y-auto space-y-1">
                      {importResult.results.errorDetails.slice(0, 10).map((error, index) => (
                        <div key={index} className="flex items-center gap-2 text-xs">
                          <XCircle className="h-3 w-3 text-red-500" />
                          <span className="text-gray-600">Satır {error.row}:</span>
                          <span className="font-medium">{error.code}</span>
                          <span className="text-red-600">{error.error}</span>
                        </div>
                      ))}
                      {importResult.results.errorDetails.length > 10 && (
                        <div className="text-xs text-gray-500">
                          ... ve {importResult.results.errorDetails.length - 10} hata daha
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isImporting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isImporting}>
                {isImporting ? 'İçe Aktarılıyor...' : 'İçe Aktar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
