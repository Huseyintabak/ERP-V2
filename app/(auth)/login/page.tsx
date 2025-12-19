'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { loginSchema, type LoginFormData } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { LogIn, Loader2 } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Giriş başarısız');
      }

      setUser(result.user);
      toast.success('Giriş başarılı!');

      // Cookie httpOnly olduğu için JavaScript'ten okunamaz
      // Bu yüzden direkt redirect yapıyoruz, cookie server tarafında set edildi
      // Hard navigation cookie'yi garanti eder
      console.log('🔄 Login response:', result);
      console.log('🔄 Redirecting to:', result.redirectUrl);
      console.log('🔄 User:', result.user);
      
      // Immediate redirect - no delay
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error.message || 'Bir hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Thunder ERP v2</CardTitle>
        <CardDescription className="text-center">
          Üretim Yönetim Sistemi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@thunder.com"
              {...register('email')}
              disabled={isLoading}
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Şifre</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              {...register('password')}
              disabled={isLoading}
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Giriş yapılıyor...
              </>
            ) : (
              <>
                <LogIn className="mr-2 h-4 w-4" />
                Giriş Yap
              </>
            )}
          </Button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-600">
          <p className="mb-2">Test Kullanıcıları:</p>
          <p className="text-xs">admin@thunder.com / 123456</p>
          <p className="text-xs">planlama@thunder.com / 123456</p>
          <p className="text-xs">depo@thunder.com / 123456</p>
        </div>

        <div className="mt-4 text-center">
          <a 
            href="/operator-login" 
            className="text-sm text-blue-600 hover:underline"
          >
            Operatör Girişi →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}


