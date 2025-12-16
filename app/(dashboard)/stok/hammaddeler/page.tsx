'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RawMaterialsTable } from '@/components/stock/raw-materials-table';
import { RawMaterialForm } from '@/components/stock/raw-material-form';
import { toast } from 'sonner';
import type { RawMaterial, RawMaterialFormData } from '@/types';
import { useRawMaterials, useStockActions } from '@/stores/stock-store';
import { useStockStore } from '@/stores/stock-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';

export default function HammaddelerPage() {
  const { user } = useAuthStore();
  const materials = useRawMaterials();
  const loading = useStockStore((state) => state.loading.rawMaterials);
  const pagination = useStockStore((state) => state.pagination.rawMaterials);
  const actions = useStockActions();
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingMaterial, setEditingMaterial] = useState<RawMaterial | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  
  // Real-time updates for raw materials
  useRoleBasedRealtime('depo');
  
  useEffect(() => {
    // İlk yüklemede tüm hammaddeleri getir (limit yok, tümü)
    actions.fetchRawMaterials({ page: 1, limit: 10000 });
  }, [actions]);

  const handlePageChange = (page: number) => {
    actions.fetchRawMaterials({ page, limit: 10000 });
  };

  const handleSearch = (search: string) => {
    actions.fetchRawMaterials({ search, page: 1, limit: 10000 });
  };

  const handleAdd = () => {
    setEditingMaterial(null);
    setIsFormOpen(true);
  };

  const handleEdit = (material: RawMaterial) => {
    setEditingMaterial(material);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu hammaddeyi silmek istediğinize emin misiniz?')) return;

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(`/api/stock/raw/${id}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Hammadde silindi');
      actions.fetchRawMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Silme hatası');
    }
  };

  const handleFormSubmit = async (data: RawMaterialFormData) => {
    setIsSaving(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const url = editingMaterial
        ? `/api/stock/raw/${editingMaterial.id}`
        : '/api/stock/raw';

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

      toast.success(editingMaterial ? 'Hammadde güncellendi' : 'Hammadde oluşturuldu');
      setIsFormOpen(false);
      actions.fetchRawMaterials();
    } catch (error: any) {
      toast.error(error.message || 'Kayıt hatası');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Hammadde Yönetimi</h1>
        <p className="text-gray-500">Hammadde stok takibi ve yönetimi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Hammadde Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading.rawMaterials ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <RawMaterialsTable
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

      <RawMaterialForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingMaterial || undefined}
        isLoading={isSaving}
      />
    </div>
  );
}

