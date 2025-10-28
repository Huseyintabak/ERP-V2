'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, X } from 'lucide-react';
import { toast } from 'sonner';
import { logger } from '@/lib/utils/logger';
import { useAuthStore } from '@/stores/auth-store';

const userSchema = z.object({
  name: z.string().min(1, 'Ad soyad gerekli').max(255, 'Ad soyad çok uzun'),
  email: z.string().email('Geçerli bir email adresi girin'),
  password: z.string().min(6, 'Şifre en az 6 karakter olmalı').optional(),
  role: z.enum(['yonetici', 'planlama', 'depo', 'operator'], {
    required_error: 'Rol seçin',
  }),
  is_active: z.boolean().default(true),
});

type UserFormData = z.infer<typeof userSchema>;

interface UserFormProps {
  user?: any;
  onSuccess: () => void;
  onCancel: () => void;
}

export default function UserForm({ user, onSuccess, onCancel }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const isEditing = !!user;
  const { user: currentUser } = useAuthStore();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<UserFormData>({
    resolver: zodResolver(userSchema),
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      password: '',
      role: user?.role || 'operator',
      is_active: user?.is_active ?? true,
    },
  });

  const watchedRole = watch('role');
  const watchedIsActive = watch('is_active');

  useEffect(() => {
    if (user) {
      setValue('name', user.name);
      setValue('email', user.email);
      setValue('role', user.role);
      setValue('is_active', user.is_active);
    }
  }, [user, setValue]);

  const onSubmit = async (data: UserFormData) => {
    setIsLoading(true);
    try {
      const url = isEditing ? `/api/users/${user.id}` : '/api/users';
      const method = isEditing ? 'PUT' : 'POST';

      // Don't send password if it's empty during editing
      const submitData = { ...data };
      if (isEditing && !submitData.password) {
        delete submitData.password;
      }

      if (!currentUser?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': currentUser.id
        },
        body: JSON.stringify(submitData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'İşlem başarısız');
      }

      toast.success(
        isEditing ? 'Kullanıcı başarıyla güncellendi' : 'Kullanıcı başarıyla oluşturuldu'
      );
      onSuccess();
    } catch (error: any) {
      toast.error(error.message || 'İşlem sırasında hata oluştu');
      logger.error('Error saving user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case 'yonetici':
        return 'Yönetici';
      case 'planlama':
        return 'Planlama';
      case 'depo':
        return 'Depo';
      case 'operator':
        return 'Operatör';
      default:
        return role;
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Ad Soyad *</Label>
          <Input
            id="name"
            {...register('name')}
            placeholder="Kullanıcının adını ve soyadını girin"
          />
          {errors.name && (
            <p className="text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email *</Label>
          <Input
            id="email"
            type="email"
            {...register('email')}
            placeholder="ornek@thunder.com"
          />
          {errors.email && (
            <p className="text-sm text-red-600">{errors.email.message}</p>
          )}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="password">
            Şifre {isEditing ? '(Boş bırakırsanız değişmez)' : '*'}
          </Label>
          <Input
            id="password"
            type="password"
            {...register('password')}
            placeholder={isEditing ? 'Yeni şifre girin' : 'Şifre girin'}
          />
          {errors.password && (
            <p className="text-sm text-red-600">{errors.password.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="role">Rol *</Label>
          <Select value={watchedRole} onValueChange={(value) => setValue('role', value as any)}>
            <SelectTrigger>
              <SelectValue placeholder="Rol seçin" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="operator">Operatör</SelectItem>
              <SelectItem value="depo">Depo</SelectItem>
              <SelectItem value="planlama">Planlama</SelectItem>
              <SelectItem value="yonetici">Yönetici</SelectItem>
            </SelectContent>
          </Select>
          {errors.role && (
            <p className="text-sm text-red-600">{errors.role.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <Switch
            id="is_active"
            checked={watchedIsActive}
            onCheckedChange={(checked) => setValue('is_active', checked)}
          />
          <Label htmlFor="is_active">Kullanıcı aktif</Label>
        </div>
        <p className="text-sm text-muted-foreground">
          Pasif kullanıcılar sisteme giriş yapamaz
        </p>
      </div>

      {watchedRole === 'operator' && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-medium text-blue-900 mb-2">Operatör Bilgileri</h4>
          <p className="text-sm text-blue-700">
            Bu kullanıcı operatör olarak işaretlendi. Operatör detayları 
            (seri numarası, lokasyon, vs.) kullanıcı oluşturulduktan sonra 
            "Operatörler" sayfasından düzenlenebilir.
          </p>
        </div>
      )}

      <div className="flex items-center justify-end space-x-2 pt-4 border-t">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          <X className="mr-2 h-4 w-4" />
          İptal
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Kaydediliyor...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              {isEditing ? 'Güncelle' : 'Oluştur'}
            </>
          )}
        </Button>
      </div>
    </form>
  );
}

