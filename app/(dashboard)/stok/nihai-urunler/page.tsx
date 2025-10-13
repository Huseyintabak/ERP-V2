'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FinishedProductsTable } from '@/components/stock/finished-products-table';
import { FinishedProductForm } from '@/components/stock/finished-product-form';
import { toast } from 'sonner';
import type { FinishedProduct, FinishedProductFormData } from '@/types';
import { useFinishedProducts, useStockActions } from '@/stores/stock-store';
import { useStockStore } from '@/stores/stock-store';
import { useRoleBasedRealtime } from '@/lib/hooks/use-realtime-store';
import { useAuthStore } from '@/stores/auth-store';

export default function NihaiUrunlerPage() {
  const { user } = useAuthStore();
  const products = useFinishedProducts();
  const loading = useStockStore((state) => state.loading.finishedProducts);
  const actions = useStockActions();
  // const filters = useStockFilters(); // Removed
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<FinishedProduct | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Real-time updates for finished products
  useRoleBasedRealtime('depo');
  
  useEffect(() => {
    actions.fetchFinishedProducts();
  }, [actions]);

  // fetchProducts function removed - using store actions instead

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Store will handle the data fetching
  };

  const handleSearch = (search: string) => {
    // Store will handle the search
    actions.fetchFinishedProducts();
  };

  const handleAdd = () => {
    setEditingProduct(null);
    setIsFormOpen(true);
  };

  const handleEdit = (product: FinishedProduct) => {
    setEditingProduct(product);
    setIsFormOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bu nihai ürünü silmek istediğinize emin misiniz?')) return;

    try {
      const response = await fetch(`/api/stock/finished/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const result = await response.json();
        throw new Error(result.error);
      }

      toast.success('Nihai ürün silindi');
      fetchProducts();
    } catch (error: any) {
      toast.error(error.message || 'Silme hatası');
    }
  };

  const handleFormSubmit = async (data: FinishedProductFormData) => {
    setIsSaving(true);
    try {
      const url = editingProduct
        ? `/api/stock/finished/${editingProduct.id}`
        : '/api/stock/finished';

      const method = editingProduct ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) throw new Error(result.error);

      toast.success(editingProduct ? 'Nihai ürün güncellendi' : 'Nihai ürün oluşturuldu');
      setIsFormOpen(false);
      fetchProducts();
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
        <h1 className="text-3xl font-bold text-gray-900">Nihai Ürün Yönetimi</h1>
        <p className="text-gray-500">Nihai ürün stok takibi ve yönetimi</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Nihai Ürün Listesi</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
            </div>
          ) : (
            <FinishedProductsTable
              products={products}
              totalPages={totalPages}
              currentPage={currentPage}
              onPageChange={setCurrentPage}
              onSearch={handleSearch}
              onEdit={handleEdit}
              onDelete={handleDelete}
              onAdd={handleAdd}
            />
          )}
        </CardContent>
      </Card>

      <FinishedProductForm
        open={isFormOpen}
        onClose={() => setIsFormOpen(false)}
        onSubmit={handleFormSubmit}
        initialData={editingProduct || undefined}
        isLoading={isSaving}
      />
    </div>
  );
}

