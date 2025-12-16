'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { SemiFinishedTable } from '@/components/stock/semi-finished-table';
import { SemiFinishedForm } from '@/components/stock/semi-finished-form';
import { toast } from 'sonner';
import type { SemiFinishedProduct, SemiFinishedProductFormData } from '@/types';
import { useSemiFinishedProducts, useStockActions } from '@/stores/stock-store';
import { useStockStore } from '@/stores/stock-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';

export default function YariMamullerPage() {
  const { user } = useAuthStore();
  const materials = useSemiFinishedProducts();
  const loading = useStockStore((state) => state.loading.semiFinishedProducts);
  const pagination = useStockStore((state) => state.pagination.semiFinishedProducts);
  const actions = useStockActions();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<SemiFinishedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Real-time updates for semi-finished products
  useRoleBasedRealtime('depo');
  
  useEffect(() => {
    // İlk yüklemede tüm yarı mamulleri getir (limit yok, tümü)
    actions.fetchSemiFinishedProducts({ page: 1, limit: 10000 });
  }, [actions]);

  const handlePageChange = (page: number) => {
    actions.fetchSemiFinishedProducts({ page, limit: 10000 });
  };

  const handleSearch = (search: string) => {
    actions.fetchSemiFinishedProducts({ search, page: 1, limit: 10000 });
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setIsFormOpen(true);
  };

  const handleEdit = (material: SemiFinishedProduct) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu yarı mamulli silmek istediğinize emin misiniz?')) return;

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(`/api/stock/semi/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Yarı mamul silindi');
      actions.fetchSemiFinishedProducts();
    } catch (error: any) {
      toast.error(error.message || 'Silme hatası');
    }
  };

  const handleFormSubmit = async (data: SemiFinishedProductFormData) => {
    setIsSaving(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const url = editingMaterial
        ? `/api/stock/semi/${editingMaterial.id}`
        : '/api/stock/semi';

      const method = editingMaterial ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(editingMaterial ? 'Yarı mamul güncellendi' : 'Yarı mamul oluşturuldu');
      setIsFormOpen(false);
      actions.fetchSemiFinishedProducts();
    } catch (error: any) {
      toast.error(error.message || 'Kayıt hatası');
    } finally {
      setIsSaving(false);
    }
  };

  // Duplicate handleSearch function removed

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Yarı Mamul Yönetimi</h1>
        <p className="text-gray-500">Yarı mamul stok takibi ve yönetimi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Yarı Mamul Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <SemiFinishedTable
              materials={materials}
              totalPages={Math.ceil(pagination.total / pagination.limit)}
              currentPage={pagination.page}
              onPageChange={handlePageChange}
              onSearch={handleSearch}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          )}
        </CardContent>
      </Card>

      <SemiFinishedForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingMaterial || undefined}
        isLoading={isSaving}
      />
    </div>
  );
}

