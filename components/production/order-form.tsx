'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { SimpleSearchableSelect, type SearchableSelectOption } from '@/components/ui/simple-searchable-select';
import { orderSchema, orderItemSchema, type OrderFormData, type OrderItemFormData } from '@/types';
import { CustomerSelect } from '@/components/customers/customer-select';
import { CustomerDialog } from '@/components/customers/customer-dialog';
import { toast } from 'sonner';
import { useState, useEffect } from 'react';
import { Plus, Trash2, Users } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

export function OrderForm({ onSuccess }: Props) {
  const [finishedProducts, setFinishedProducts] = useState<any[]>([]);
  const [operators, setOperators] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // SearchableSelect için finished products'ı hazırla
  const productOptions: SearchableSelectOption[] = finishedProducts.map((product) => ({
    value: product.id,
    label: product.name,
    description: product.code,
    badge: product.quantity ? `${product.quantity} adet` : undefined,
  }));
  // toast from sonner is already imported

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
    control,
  } = useForm<OrderFormData>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_id: undefined,
      customer_name: '', // ZORUNLU: Zod schema tarafından bekleniyor
      items: [{ product_id: '', quantity: 1 }],
      delivery_date: '',
      priority: 'orta',
      assigned_operator_id: undefined,
    },
  });

  const selectedCustomerId = watch('customer_id');

  const watchedItems = watch('items');

  useEffect(() => {
    // Finished products'ları yükle (tüm ürünler)
    fetch('/api/stock/finished?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.data) {
          setFinishedProducts(data.data);
        }
      });

    // Operators'ları yükle
    fetch('/api/operators')
      .then(res => res.json())
      .then(data => {
        console.log('Operators API response:', data);
        if (Array.isArray(data)) {
          setOperators(data);
        } else if (data.data && Array.isArray(data.data)) {
          setOperators(data.data);
        } else {
          console.error('Unexpected operators data format:', data);
          toast.error('Operatörler yüklenemedi');
        }
      })
      .catch(err => {
        console.error('Failed to load operators:', err);
        toast.error('Operatörler yüklenemedi');
      });

    // Customers'ları yükle
    fetch('/api/customers?limit=1000')
      .then(res => res.json())
      .then(data => {
        if (data.data && Array.isArray(data.data)) {
          setCustomers(data.data);
        }
      })
      .catch(err => {
        console.error('Failed to load customers:', err);
        toast.error('Müşteriler yüklenemedi');
      });
  }, []);

  const onSubmit = async (data: OrderFormData) => {
    console.log('🚀 Form submit başladı, data:', data);
    setLoading(true);
    try {
      console.log('📦 API\'ye gönderilecek data:', data);

      const response = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      console.log('📡 API Response status:', response.status);
      const result = await response.json();
      console.log('📡 API Response data:', result);

      if (response.ok) {
        toast.success(result.message || 'Siparişler oluşturuldu');
        onSuccess();
      } else {
        console.error('❌ API error:', result);
        throw new Error(result.error || 'Bir hata oluştu');
      }
    } catch (error: any) {
      console.error('❌ Submit error:', error);
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleCustomerCreated = () => {
    // Müşteri eklendikten sonra formu yenile
    window.location.reload();
  };

  const addItem = () => {
    const currentItems = watchedItems || [];
    setValue('items', [...currentItems, { product_id: '', quantity: 1 }]);
  };

  const removeItem = (index: number) => {
    const currentItems = watchedItems || [];
    if (currentItems.length > 1) {
      setValue('items', currentItems.filter((_, i) => i !== index));
    }
  };

  const updateItem = (index: number, field: keyof OrderItemFormData, value: any) => {
    const currentItems = watchedItems || [];
    const updatedItems = [...currentItems];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setValue('items', updatedItems);
  };

  return (
    <form 
      onSubmit={(e) => {
        console.log('Form submit triggered!');
        handleSubmit(onSubmit)(e);
      }} 
      className="space-y-6"
    >
      <div>
        <div className="flex items-center justify-between mb-2">
          <Label htmlFor="customer">Müşteri *</Label>
          <CustomerDialog onSuccess={handleCustomerCreated}>
            <Button type="button" variant="outline" size="sm">
              <Users className="h-4 w-4 mr-2" />
              Yeni Müşteri
            </Button>
          </CustomerDialog>
        </div>
        <CustomerSelect
          value={selectedCustomerId || ''}
          onValueChange={(value) => {
            setValue('customer_id', value);
            // Seçilen müşterinin adını da set et
            const selectedCustomer = customers.find(c => c.id === value);
            if (selectedCustomer) {
              setValue('customer_name', selectedCustomer.name);
              console.log('✅ Müşteri seçildi:', selectedCustomer.name);
            }
          }}
          placeholder="Müşteri seçin"
          disabled={loading}
        />
        {!selectedCustomerId && (
          <p className="text-sm text-red-600">Müşteri seçimi zorunludur</p>
        )}
      </div>

      {/* Ürün Listesi */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <Label>Ürünler *</Label>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            disabled={loading}
          >
            <Plus className="h-4 w-4 mr-1" />
            Ürün Ekle
          </Button>
        </div>
        
        <div className="space-y-3">
          {watchedItems?.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 items-end">
              <div className="col-span-7">
                <Label>Ürün</Label>
                <SimpleSearchableSelect
                  options={productOptions}
                  value={item.product_id}
                  onValueChange={(value) => updateItem(index, 'product_id', value)}
                  placeholder="Ürün seçin"
                  searchPlaceholder="Ürün adı veya kodu ile ara..."
                  emptyText="Ürün bulunamadı"
                  disabled={loading}
                  allowClear
                  maxHeight="300px"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Miktar</Label>
                <Input
                  type="number"
                  step="0.01"
                  min="1"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 1)}
                  disabled={loading}
                  className="w-full"
                />
              </div>
              
              <div className="col-span-2">
                {watchedItems.length > 1 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeItem(index)}
                    disabled={loading}
                    className="w-full"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
              
              <div className="col-span-1">
                {/* Spacer */}
              </div>
            </div>
          ))}
        </div>
        
        {errors.items && (
          <p className="text-sm text-red-600">{errors.items.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="priority">Öncelik *</Label>
          <Select onValueChange={(value) => setValue('priority', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Öncelik seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dusuk">Düşük</SelectItem>
              <SelectItem value="orta">Orta</SelectItem>
              <SelectItem value="yuksek">Yüksek</SelectItem>
            </SelectContent>
          </Select>
          {errors.priority && (
            <p className="text-sm text-red-600">{errors.priority.message}</p>
          )}
        </div>
      </div>

      <div>
        <Label htmlFor="delivery_date">Teslim Tarihi *</Label>
        <Input
          id="delivery_date"
          type="date"
          {...register('delivery_date')}
          disabled={loading}
        />
        {errors.delivery_date && (
          <p className="text-sm text-red-600">{errors.delivery_date.message}</p>
        )}
      </div>

      <div>
        <Label htmlFor="assigned_operator_id">Atanan Operatör</Label>
        <Select 
          onValueChange={(value) => setValue('assigned_operator_id', value === 'none' ? undefined : value)}
          defaultValue="none"
        >
          <SelectTrigger>
            <SelectValue placeholder="Operatör seçin (opsiyonel)" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">Operatör Seçilmedi</SelectItem>
            {operators.length === 0 ? (
              <SelectItem value="no-operators" disabled>
                Operatör bulunamadı
              </SelectItem>
            ) : (
              operators.map((operator) => (
                <SelectItem key={operator.id} value={operator.id}>
                  {operator.user?.name} ({operator.series})
                </SelectItem>
              ))
            )}
          </SelectContent>
        </Select>
        {errors.assigned_operator_id && (
          <p className="text-sm text-red-600">{errors.assigned_operator_id.message}</p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button 
          type="submit" 
          disabled={loading}
          onClick={(e) => {
            console.log('Button clicked!', { selectedCustomerId, loading });
            console.log('Form data:', watch());
          }}
        >
          {loading ? 'Kaydediliyor...' : 'Sipariş Oluştur'}
        </Button>
      </div>
    </form>
  );
}
