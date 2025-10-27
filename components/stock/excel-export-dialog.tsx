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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Download, FileSpreadsheet, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';

const exportSchema = z.object({
  type: z.enum(['raw', 'semi', 'finished', 'all'], {
    required_error: 'Tür seçiniz',
  }),
  format: z.enum(['xlsx', 'csv'], {
    required_error: 'Format seçiniz',
  }),
});

type ExportFormData = z.infer<typeof exportSchema>;

interface ExcelExportDialogProps {
  onExportComplete?: () => void;
}

export function ExcelExportDialog({ onExportComplete }: ExcelExportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const form = useForm<ExportFormData>({
    resolver: zodResolver(exportSchema),
    defaultValues: {
      type: 'all',
      format: 'xlsx',
    },
  });

  const onSubmit = async (data: ExportFormData) => {
    setIsExporting(true);

    try {
      const params = new URLSearchParams({
        type: data.type,
        format: data.format,
      });

      const response = await fetch(`/api/stock/export?${params}`, {
        method: 'GET',
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Export failed');
      }

      // Download file
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const timestamp = new Date().toISOString().split('T')[0];
      const typeLabel = {
        raw: 'hammaddeler',
        semi: 'yari_mamuller',
        finished: 'nihai_urunler',
        all: 'tum_stok'
      }[data.type];
      
      a.download = `stok_${typeLabel}_${timestamp}.${data.format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      toast.success('Dosya başarıyla indirildi');
      
      // Reset form
      form.reset();
      
      // Call callback
      if (onExportComplete) {
        onExportComplete();
      }

      setIsOpen(false);
    } catch (error: any) {
      logger.error('Export error:', error);
      toast.error(error.message || 'Dışa aktarma hatası');
    } finally {
      setIsExporting(false);
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'raw': return 'Hammadde';
      case 'semi': return 'Yarı Mamul';
      case 'finished': return 'Nihai Ürün';
      case 'all': return 'Tüm Stok';
      default: return type;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Excel Dışa Aktar
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Excel Dışa Aktarma</DialogTitle>
          <DialogDescription>
            Stok verilerini Excel formatında dışa aktarın.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Veri Türü</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Tür seçin" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="all">Tüm Stok</SelectItem>
                      <SelectItem value="raw">Hammadde</SelectItem>
                      <SelectItem value="semi">Yarı Mamul</SelectItem>
                      <SelectItem value="finished">Nihai Ürün</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Hangi stok türünü dışa aktarmak istiyorsunuz?
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="format"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Dosya Formatı</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex flex-col space-y-2"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="xlsx" id="xlsx" />
                        <Label htmlFor="xlsx" className="flex items-center gap-2">
                          <FileSpreadsheet className="h-4 w-4" />
                          Excel (.xlsx)
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="csv" id="csv" />
                        <Label htmlFor="csv" className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          CSV (.csv)
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormDescription>
                    Excel formatı önerilir (daha zengin özellikler)
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-medium text-sm mb-2">Dışa Aktarılacak Veriler:</h4>
              <ul className="text-sm text-gray-600 space-y-1">
                <li>• Kod, İsim, Barkod</li>
                <li>• Miktar, Birim, Açıklama</li>
                <li>• Fiyat/Maliyet bilgileri</li>
                <li>• Oluşturulma tarihi</li>
                {form.watch('type') === 'all' && (
                  <li>• Stok türü (Hammadde/Yarı Mamul/Nihai Ürün)</li>
                )}
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsOpen(false)}
                disabled={isExporting}
              >
                İptal
              </Button>
              <Button type="submit" disabled={isExporting}>
                {isExporting ? 'Dışa Aktarılıyor...' : 'Dışa Aktar'}
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

