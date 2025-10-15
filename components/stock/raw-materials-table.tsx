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
import { Pencil, Trash2, Search, Plus, DollarSign } from 'lucide-react';
import type { RawMaterial } from '@/types';
import { ExcelImportDialog } from './excel-import-dialog';
import { ExcelExportDialog } from './excel-export-dialog';
import { PriceHistoryDialog } from '@/components/price-history/price-history-dialog';

interface Props {
  materials: RawMaterial[];
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  onSearch: (term: string) => void;
  onEdit: (material: RawMaterial) => void;
  onDelete: (id: string) => void;
  onAdd: () => void;
}

export function RawMaterialsTable({
  materials,
  totalPages,
  currentPage,
  onPageChange,
  onSearch,
  onEdit,
  onDelete,
  onAdd,
}: Props) {
  const [searchTerm, setSearchTerm] = useState('');
  const [priceHistoryOpen, setPriceHistoryOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState<RawMaterial | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onSearch(searchTerm);
  };

  const handlePriceHistory = (material: RawMaterial) => {
    setSelectedMaterial(material);
    setPriceHistoryOpen(true);
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
            Yeni Hammadde
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
              <TableHead className="text-right">Birim Fiyat</TableHead>
              <TableHead>Durum</TableHead>
              <TableHead className="text-right">İşlemler</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials.length === 0 ? (
              <TableRow>
                <TableCell colSpan={10} className="text-center text-gray-500">
                  Kayıt bulunamadı
                </TableCell>
              </TableRow>
            ) : (
              materials.map((material) => {
                const availableQty = material.quantity - (material.reserved_quantity || 0);
                const isCritical = availableQty <= (material.critical_level || 0);

                return (
                  <TableRow key={material.id}>
                    <TableCell className="font-medium">{material.code}</TableCell>
                    <TableCell>{material.name}</TableCell>
                    <TableCell className="text-gray-500">{material.barcode || '-'}</TableCell>
                    <TableCell className="text-right font-mono">
                      {material.quantity.toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-orange-600">
                      {(material.reserved_quantity || 0).toFixed(2)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {(material.critical_level || 0).toFixed(2)}
                    </TableCell>
                    <TableCell>{material.unit}</TableCell>
                    <TableCell className="text-right font-mono">
                      ₺{material.unit_price.toFixed(2)}
                    </TableCell>
                    <TableCell>
                      {isCritical ? (
                        <Badge variant="destructive">Kritik Seviye</Badge>
                      ) : (
                        <Badge variant="default" className="bg-green-600">Normal</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handlePriceHistory(material)}
                          title="Fiyat Geçmişi"
                        >
                          <DollarSign className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onEdit(material)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => onDelete(material.id)}
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

      {/* Price History Dialog */}
      {selectedMaterial && (
        <PriceHistoryDialog
          isOpen={priceHistoryOpen}
          onClose={() => {
            setPriceHistoryOpen(false);
            setSelectedMaterial(null);
          }}
          materialType="raw"
          materialId={selectedMaterial.id}
          materialName={selectedMaterial.name}
        />
      )}
    </div>
  );
}

