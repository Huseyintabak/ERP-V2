'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { Loader2, Save, X } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

const customerSchema = z.object({
  name: z.string().min(1, 'Müşteri adı gerekli'),
  email: z.string().email('Geçerli email adresi gerekli').optional().or(z.literal('')),
  phone: z.string().optional(),
  company: z.string().optional(),
  address: z.string().optional(),
  tax_number: z.string().optional(),
  is_active: z.boolean().default(true),
});

type CustomerFormData = z.infer<typeof customerSchema>;

interface CustomerFormProps {
  customer?: CustomerFormData & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export function CustomerForm({ customer, onSuccess, onCancel }: CustomerFormProps) {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<CustomerFormData>({
    resolver: zodResolver(customerSchema),
    defaultValues: customer || {
      name: '',
      email: '',
      phone: '',
      company: '',
      address: '',
      tax_number: '',
      is_active: true,
    },
  });

  const onSubmit = async (data: CustomerFormData) => {
    setIsLoading(true);
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const url = customer?.id ? `/api/customers/${customer.id}` : '/api/customers';
      const method = customer?.id ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Müşteri kaydedilemedi');
      }

      const result = await response.json();
      toast.success(customer?.id ? 'Müşteri güncellendi' : 'Müşteri eklendi');
      onSuccess();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Müşteri Adı *</Label>
          <Input
            id="name"
            {...form.register('name')}
            placeholder="Müşteri adı"
            disabled={isLoading}
          />
          {form.formState.errors.name && (
            <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            {...form.register('email')}
            placeholder="email@example.com"
            disabled={isLoading}
          />
          {form.formState.errors.email && (
            <p className="text-sm text-destructive">{form.formState.errors.email.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Telefon</Label>
          <Input
            id="phone"
            {...form.register('phone')}
            placeholder="+90 555 123 4567"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="company">Şirket</Label>
          <Input
            id="company"
            {...form.register('company')}
            placeholder="Şirket adı"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="tax_number">Vergi Numarası</Label>
          <Input
            id="tax_number"
            {...form.register('tax_number')}
            placeholder="1234567890"
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="is_active">Durum</Label>
          <div className="flex items-center space-x-2">
            <Switch
              id="is_active"
              checked={form.watch('is_active')}
              onCheckedChange={(checked) => form.setValue('is_active', checked)}
              disabled={isLoading}
            />
            <Label htmlFor="is_active" className="text-sm">
              {form.watch('is_active') ? 'Aktif' : 'Pasif'}
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Adres</Label>
        <Textarea
          id="address"
          {...form.register('address')}
          placeholder="Müşteri adresi"
          rows={3}
          disabled={isLoading}
        />
      </div>

      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="h-4 w-4 mr-2" />
          İptal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Save className="h-4 w-4 mr-2" />
          )}
          {customer?.id ? 'Güncelle' : 'Kaydet'}
        </Button>
      </div>
    </form>
  );
}

