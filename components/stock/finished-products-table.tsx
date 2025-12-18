'use client';

import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Pencil, Trash2, Search, Plus, Calculator } from 'lucide-react';
import type { FinishedProduct } from '@/types';
import { ExcelImportDialog } from './excel-import-dialog';
import { ExcelExportDialog } from './excel-export-dialog';
import { CostCalculationDialog } from '@/components/pricing/cost-calculation-dialog';

interface Props {
  products: FinishedProduct[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  onEdit: (product: FinishedProduct) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function FinishedProductsTable({
  products,
  totalPages,
  currentPage,
  onPageChange,
  onSearch,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  return (
    <div className="space-y-4">
      {/* Header Actions */}
      <div className="flex items-center justify-between gap-4">
        <form onSubmit={handleSearch} className="flex flex-1 gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <Input
              placeholder="Kod, isim veya barkod ile ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button type="submit" variant="secondary">
            Ara
          </Button>
        </form>

        <div className="flex gap-2">
          <ExcelImportDialog onImportComplete={() => window.location.reload()} />
          <ExcelExportDialog onExportComplete={() => {}} />
          <Button onClick={onAdd}>
            <Plus className="mr-2 h-4 w-4" />
            Yeni Nihai Ürün
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kod</TableHead>
              <TableHead>İsim</TableHead>
              <TableHead>Barkod</TableHead>
              <TableHead className="text-right">Miktar</TableHead>
              <TableHead className="text-right">Rezerve</TableHead>
              <TableHead className="text-right">Kritik Seviye</TableHead>
              <TableHead>Birim</TableHead>
              <TableHead className="text-right">Birim Maliyet</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {products.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500">
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              products.map((product) => {
                const availableQty = product.quantity - (product.reserved_quantity || 0);
                const criticalLevel = product.critical_level || 0;
                const isCritical = criticalLevel > 0 && availableQty <= criticalLevel;
                const isOutOfStock = product.quantity === 0 && criticalLevel === 0;

                return (
                  <TableRow key={product.id}>
                    <TableCell className="font-medium">{product.code}</TableCell>
                    <TableCell>{product.name}</TableCell>
                    <TableCell className="text-gray-500">{product.barcode || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {product.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {(product.reserved_quantity || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(product.critical_level || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{product.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₺{product.sale_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {isCritical ? (
                        <Badge variant="destructive">Kritik Seviye</Badge>
                      ) : isOutOfStock ? (
                        <Badge variant="outline" className="bg-blue-600 text-white border-blue-600">
                          Stok Yok
                        </Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <CostCalculationDialog
                          productId={product.id}
                          productCode={product.code}
                          productName={product.name}
                          currentSalePrice={product.sale_price}
                          currentCostPrice={(product as any).cost_price}
                          trigger={
                            <Button variant="ghost" size="icon" title="Maliyet Hesapla">
                              <Calculator className="h-4 w-4 text-blue-600" />
                            </Button>
                          }
                        />
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(product)}
                          title="Düzenle"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(product.id)}
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            Sayfa {currentPage} / {totalPages}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Önceki
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Sonraki
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

