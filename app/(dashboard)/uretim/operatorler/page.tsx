'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/stores/auth-store';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from '@/components/ui/card';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn, formatCurrency, formatNumber } from '@/lib/utils';
import {
  Users,
  UserPlus,
  Settings,
  TrendingUp,
  Clock,
  MapPin,
  Star,
  Loader2,
  Edit,
  Trash2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const operatorFormSchema = z.object({
  name: z.string().min(1, 'Ad gerekli'),
  email: z.string().email('Geçerli email gerekli'),
  series: z.enum(['thunder', 'thunder_pro'], { message: 'Seri seçimi gerekli' }),
  experience_years: z.number().min(0, 'Deneyim yılı 0 veya üzeri olmalı'),
  daily_capacity: z.number().min(1, 'Günlük kapasite 1 veya üzeri olmalı'),
  location: z.string().min(1, 'Lokasyon gerekli'),
  hourly_rate: z.number().min(0, 'Saatlik ücret 0 veya üzeri olmalı'),
});

type OperatorFormData = z.infer<typeof operatorFormSchema>;

interface Operator {
  id: string;
  series: 'thunder' | 'thunder_pro';
  experience_years: number;
  daily_capacity: number;
  location: string;
  hourly_rate: number;
  active_productions_count: number;
  user: {
    id: string;
    name: string;
    email: string;
    is_active: boolean;
  };
}

export default function OperatorlerPage() {
  const { user } = useAuthStore();
  const router = useRouter();

  const [operators, setOperators] = useState<Operator[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingOperator, setEditingOperator] = useState<Operator | null>(null);

  const form = useForm<OperatorFormData>({
    resolver: zodResolver(operatorFormSchema),
    defaultValues: {
      name: '',
      email: '',
      series: 'thunder',
      experience_years: 0,
      daily_capacity: 40,
      location: '',
      hourly_rate: 25,
    },
  });

  useEffect(() => {
    fetchOperators();
  }, []);

  const fetchOperators = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/operators');
      if (!response.ok) throw new Error('Failed to fetch operators');
      const data = await response.json();
      setOperators(data);
    } catch (error) {
      console.error('Error fetching operators:', error);
      toast.error('Operatörler yüklenirken hata oluştu');
    } finally {
      setLoading(false);
    }
  };

  const handleAddOperator = async (data: OperatorFormData) => {
    try {
      const response = await fetch('/api/operators', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operatör eklenirken hata oluştu');
      }

      toast.success('Operatör başarıyla eklendi!');
      form.reset();
      setIsAddDialogOpen(false);
      fetchOperators();
    } catch (error: any) {
      console.error('Error adding operator:', error);
      toast.error(error.message);
    }
  };

  const handleEditOperator = (operator: Operator) => {
    setEditingOperator(operator);
    form.reset({
      name: operator.user.name,
      email: operator.user.email,
      series: operator.series,
      experience_years: operator.experience_years,
      daily_capacity: operator.daily_capacity,
      location: operator.location,
      hourly_rate: operator.hourly_rate,
    });
    setIsAddDialogOpen(true);
  };

  const handleDeleteOperator = async (operatorId: string) => {
    if (!confirm('Bu operatörü silmek istediğinizden emin misiniz?')) return;

    try {
      const response = await fetch(`/api/operators/${operatorId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Operatör silinirken hata oluştu');
      }

      toast.success('Operatör başarıyla silindi!');
      fetchOperators();
    } catch (error: any) {
      console.error('Error deleting operator:', error);
      toast.error(error.message);
    }
  };

  // KPI hesaplamaları
  const totalOperators = operators.length;
  const activeOperators = operators.filter(op => op.user.is_active).length;
  const totalActiveProductions = operators.reduce((sum, op) => sum + op.active_productions_count, 0);
  const averageExperience = operators.length > 0 
    ? Math.round(operators.reduce((sum, op) => sum + op.experience_years, 0) / operators.length)
    : 0;

  if (!user) {
    return router.replace('/login');
  }

  if (user.role !== 'yonetici' && user.role !== 'planlama') {
    return (
      <div className="flex items-center justify-center h-full text-lg text-muted-foreground">
        Bu sayfaya erişim yetkiniz bulunmamaktadır.
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Operatör Yönetimi</h1>
          <p className="text-muted-foreground">
            Üretim operatörlerini yönetin ve performanslarını takip edin.
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Yeni Operatör
        </Button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Operatör</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalOperators}</div>
            <p className="text-xs text-muted-foreground">
              {activeOperators} aktif
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Üretim</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalActiveProductions}</div>
            <p className="text-xs text-muted-foreground">
              Devam eden üretimler
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ortalama Deneyim</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{averageExperience}</div>
            <p className="text-xs text-muted-foreground">
              Yıl deneyim
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kapasite</CardTitle>
            <Settings className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {operators.reduce((sum, op) => sum + op.daily_capacity, 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              Günlük üretim kapasitesi
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Operatör Listesi */}
      <Card>
        <CardHeader>
          <CardTitle>Operatör Listesi</CardTitle>
          <CardDescription>
            Tüm operatörlerin detaylı bilgileri ve performans metrikleri.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <Loader2 className="h-8 w-8 animate-spin text-primary-500" />
            </div>
          ) : operators.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">
              Henüz operatör eklenmemiş.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Operatör</TableHead>
                    <TableHead>Seri</TableHead>
                    <TableHead>Deneyim</TableHead>
                    <TableHead>Kapasite</TableHead>
                    <TableHead>Lokasyon</TableHead>
                    <TableHead>Saatlik Ücret</TableHead>
                    <TableHead>Aktif Üretim</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead className="text-right">İşlemler</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {operators.map((operator) => (
                    <TableRow key={operator.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{operator.user.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {operator.user.email}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={operator.series === 'thunder' ? 'default' : 'secondary'}
                          className="capitalize"
                        >
                          {operator.series === 'thunder' ? 'Thunder' : 'Thunder Pro'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 mr-1 text-yellow-500" />
                          {operator.experience_years} yıl
                        </div>
                      </TableCell>
                      <TableCell>{operator.daily_capacity} adet/gün</TableCell>
                      <TableCell>
                        <div className="flex items-center">
                          <MapPin className="h-4 w-4 mr-1 text-muted-foreground" />
                          {operator.location}
                        </div>
                      </TableCell>
                      <TableCell>{formatCurrency(operator.hourly_rate)}/saat</TableCell>
                      <TableCell>
                        <Badge
                          variant={operator.active_productions_count > 0 ? 'default' : 'outline'}
                        >
                          {operator.active_productions_count}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={operator.user.is_active ? 'default' : 'secondary'}
                        >
                          {operator.user.is_active ? 'Aktif' : 'Pasif'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleEditOperator(operator)}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon"
                            onClick={() => handleDeleteOperator(operator.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add/Edit Operator Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              {editingOperator ? 'Operatör Düzenle' : 'Yeni Operatör Ekle'}
            </DialogTitle>
            <DialogDescription>
              {editingOperator 
                ? 'Operatör bilgilerini güncelleyin.'
                : 'Sisteme yeni bir operatör ekleyin.'
              }
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={form.handleSubmit(handleAddOperator)} className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Ad Soyad</Label>
                <Input
                  id="name"
                  {...form.register('name')}
                  placeholder="Operatör adı"
                />
                {form.formState.errors.name && (
                  <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  placeholder="operatör@thunder.com"
                />
                {form.formState.errors.email && (
                  <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="series">Seri</Label>
                <Select
                  onValueChange={(value) => form.setValue('series', value as 'thunder' | 'thunder_pro')}
                  value={form.watch('series')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seri seçin" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="thunder">Thunder</SelectItem>
                    <SelectItem value="thunder_pro">Thunder Pro</SelectItem>
                  </SelectContent>
                </Select>
                {form.formState.errors.series && (
                  <p className="text-sm text-red-500">{form.formState.errors.series.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years">Deneyim (Yıl)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  {...form.register('experience_years', { valueAsNumber: true })}
                  placeholder="5"
                />
                {form.formState.errors.experience_years && (
                  <p className="text-sm text-red-500">{form.formState.errors.experience_years.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="daily_capacity">Günlük Kapasite</Label>
                <Input
                  id="daily_capacity"
                  type="number"
                  {...form.register('daily_capacity', { valueAsNumber: true })}
                  placeholder="40"
                />
                {form.formState.errors.daily_capacity && (
                  <p className="text-sm text-red-500">{form.formState.errors.daily_capacity.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="hourly_rate">Saatlik Ücret</Label>
                <Input
                  id="hourly_rate"
                  type="number"
                  step="0.01"
                  {...form.register('hourly_rate', { valueAsNumber: true })}
                  placeholder="25.00"
                />
                {form.formState.errors.hourly_rate && (
                  <p className="text-sm text-red-500">{form.formState.errors.hourly_rate.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Lokasyon</Label>
              <Input
                id="location"
                {...form.register('location')}
                placeholder="Üretim Salonu A"
              />
              {form.formState.errors.location && (
                <p className="text-sm text-red-500">{form.formState.errors.location.message}</p>
              )}
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsAddDialogOpen(false);
                  setEditingOperator(null);
                  form.reset();
                }}
              >
                İptal
              </Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {editingOperator ? 'Güncelle' : 'Ekle'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

