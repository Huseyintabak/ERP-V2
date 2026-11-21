'use client';

import { useState } from 'react';
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
  const setUser = useAuthStore((state) => state.setUser);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    // Prevent duplicate submissions
    if (isSubmitting || isRedirecting) {
      console.log('🚫 Duplicate submit prevented - isSubmitting:', isSubmitting, 'isRedirecting:', isRedirecting);
      return;
    }

    console.log('🔐 Form submit started');
    setIsLoading(true);
    setIsSubmitting(true);

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

      console.log('✅ Login response:', result);
      console.log('🔄 Redirecting to:', result.redirectUrl);
      console.log('👤 User:', result.user);

      // Set redirect flag to prevent any further submissions
      setIsRedirecting(true);

      // Direct redirect - cookie is already set by server
      // Using replace to prevent back button issues
      window.location.replace(result.redirectUrl);
    } catch (error: any) {
      console.error('❌ Login error:', error);
      toast.error(error.message || 'Bir hata oluştu');
      setIsSubmitting(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="shadow-2xl w-full max-w-md mx-auto">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">Thunder ERP v2</CardTitle>
        <CardDescription className="text-center">
          Üretim Yönetim Sistemi
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-base">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="ornek@thunder.com"
              {...register('email')}
              disabled={isLoading}
              className="h-12 text-base"
              autoComplete="email"
            />
            {errors.email && (
              <p className="text-sm text-red-600">{errors.email.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-base">Şifre</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••"
              {...register('password')}
              disabled={isLoading}
              className="h-12 text-base"
              autoComplete="current-password"
            />
            {errors.password && (
              <p className="text-sm text-red-600">{errors.password.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full h-12 text-base" disabled={isLoading || isRedirecting}>
            {isRedirecting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Yönlendiriliyor...
              </>
            ) : isLoading ? (
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

        <div className="mt-6 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-600 mb-2 font-semibold text-center">Test Kullanıcıları:</p>
          <div className="space-y-1 text-sm text-gray-700">
            <p>👤 admin@thunder.com / 123456</p>
            <p>📋 planlama@thunder.com / 123456</p>
            <p>📦 depo@thunder.com / 123456</p>
            <p>📱 mobil@thunder.com / 123456</p>
          </div>
        </div>

        <div className="mt-4 text-center">
          <a
            href="/operator-login"
            className="inline-block py-2 px-4 text-sm text-blue-600 hover:text-blue-800 hover:underline"
          >
            Operatör Girişi →
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
