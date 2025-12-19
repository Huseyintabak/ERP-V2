'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Loader2, UserCog } from 'lucide-react';
import { useAuthStore } from '@/stores/auth-store';

interface Operator {
  id: string;
  name: string;
  email: string;
  series: string;
  location: string;
}

export default function OperatorLoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((state) => state.setUser);
  const [operators, setOperators] = useState<Operator[]>([]);
  const [selectedOperatorId, setSelectedOperatorId] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingOperators, setIsLoadingOperators] = useState(true);

  useEffect(() => {
    // Direkt olarak operatörleri set et
    const mockOperators = [
      {
        id: '11111111-1111-1111-1111-111111111111',
        name: 'Thunder Operatör',
        email: 'operator1@thunder.com',
        series: 'thunder',
        location: 'Üretim Salonu A',
      },
      {
        id: '22222222-2222-2222-2222-222222222222',
        name: 'ThunderPro Operatör',
        email: 'operator2@thunder.com',
        series: 'thunder_pro',
        location: 'Üretim Salonu B',
      }
    ];
    
    setOperators(mockOperators);
    setIsLoadingOperators(false);
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedOperatorId) {
      toast.error('Lütfen bir operatör seçin');
      return;
    }

    if (!password) {
      toast.error('Lütfen şifre girin');
      return;
    }

    setIsLoading(true);

    try {
      const selectedOp = operators.find(o => o.id === selectedOperatorId);
      if (!selectedOp) throw new Error('Operatör bulunamadı');

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: selectedOp.email,
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Giriş başarısız');
      }

      setUser(result.user);
      toast.success(`Hoş geldiniz, ${result.user.name}!`);
      
      // Cookie httpOnly olduğu için JavaScript'ten okunamaz
      // Bu yüzden direkt redirect yapıyoruz, cookie server tarafında set edildi
      // Hard navigation cookie'yi garanti eder
      console.log('🔄 Operator login response:', result);
      console.log('🔄 Redirecting to:', result.redirectUrl);
      
      // Immediate redirect - middleware handles cookie validation
      window.location.href = result.redirectUrl;
    } catch (error: any) {
      toast.error(error.message || 'Giriş başarısız');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingOperators) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-red-100">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-orange-600 mx-auto mb-4" />
          <p className="text-orange-600">Operatörler yükleniyor...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-orange-50 to-red-100 p-4">
      <Card className="w-full max-w-md shadow-2xl border-orange-200">
        <CardHeader className="space-y-1 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-t-lg">
          <div className="flex items-center justify-center mb-2">
            <UserCog className="h-12 w-12" />
          </div>
          <CardTitle className="text-2xl font-bold text-center">Operatör Girişi</CardTitle>
          <CardDescription className="text-center text-orange-100">
            Thunder ERP Üretim Paneli
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="operator">Operatör Seçin</Label>
              <Select
                value={selectedOperatorId}
                onValueChange={setSelectedOperatorId}
                disabled={isLoading}
              >
                <SelectTrigger id="operator">
                  <SelectValue placeholder="Operatör seçin..." />
                </SelectTrigger>
                <SelectContent>
                  {operators.map((op) => (
                    <SelectItem key={op.id} value={op.id}>
                      <div className="flex flex-col">
                        <span className="font-medium">{op.name}</span>
                        <span className="text-xs text-gray-500">
                          {op.series.toUpperCase()} - {op.location}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Şifre</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={isLoading}
              />
            </div>

            <Button 
              type="submit" 
              className="w-full bg-orange-600 hover:bg-orange-700" 
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Giriş yapılıyor...
                </>
              ) : (
                'Giriş Yap'
              )}
            </Button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-600">
            <p className="text-xs">Varsayılan Şifre: 123456</p>
          </div>

          <div className="mt-4 text-center">
            <a 
              href="/login" 
              className="text-sm text-blue-600 hover:underline"
            >
              ← Yönetici/Personel Girişi
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}