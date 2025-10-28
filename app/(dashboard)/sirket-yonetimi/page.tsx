'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Building2,
  Plus,
  Search,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Users,
  Calendar,
  Settings,
  Globe,
  Shield,
  AlertTriangle,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { toast } from 'sonner';

interface Company {
  id: string;
  name: string;
  code: string;
  email: string;
  phone?: string;
  address?: string;
  city?: string;
  country: string;
  logo_url?: string;
  website?: string;
  tax_number?: string;
  is_active: boolean;
  settings: any;
  created_at: string;
  updated_at: string;
  user_count: number;
  subscription_status: 'trial' | 'active' | 'suspended' | 'cancelled';
  subscription_expires_at?: string;
}

const SUBSCRIPTION_STATUSES = {
  trial: { label: 'Deneme', color: 'bg-blue-100 text-blue-800' },
  active: { label: 'Aktif', color: 'bg-green-100 text-green-800' },
  suspended: { label: 'Askıda', color: 'bg-yellow-100 text-yellow-800' },
  cancelled: { label: 'İptal', color: 'bg-red-100 text-red-800' },
};

export default function SirketYonetimiPage() {
  const [companies, setCompanies] = useState<Company[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 0,
  });

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    country: 'Turkey',
    website: '',
    tax_number: '',
    settings: {
      timezone: 'Europe/Istanbul',
      currency: 'TRY',
      language: 'tr',
      date_format: 'DD/MM/YYYY',
      number_format: 'tr-TR',
      features: {
        advanced_reporting: false,
        api_access: false,
        custom_branding: false,
        priority_support: false,
      },
      limits: {
        max_users: 10,
        max_products: 1000,
        max_orders_per_month: 500,
        storage_limit_gb: 5,
      },
    },
  });

  useEffect(() => {
    fetchCompanies();
  }, [pagination.page, searchTerm, statusFilter]);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
      });

      if (searchTerm) params.set('search', searchTerm);
      if (statusFilter) params.set('status', statusFilter);

      const response = await fetch(`/api/companies?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error('Şirketler yüklenemedi');
      }

      const data = await response.json();
      setCompanies(data.data);
      setPagination(data.pagination);
    } catch (error: any) {
      toast.error(error.message || 'Şirketler yüklenirken hata oluştu');
      console.error('Error fetching companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateCompany = async () => {
    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch('/api/companies', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Şirket başarıyla oluşturuldu');
        setIsFormOpen(false);
        resetForm();
        fetchCompanies();
        
        // Show admin credentials
        if (data.adminUser) {
          toast.success(`Admin kullanıcı oluşturuldu: ${data.adminUser.email} / ${data.adminUser.defaultPassword}`);
        }
      } else {
        toast.error(data.error || 'Şirket oluşturulamadı');
      }
    } catch (error: any) {
      toast.error('Şirket oluşturulurken hata oluştu');
      console.error('Error creating company:', error);
    }
  };

  const handleUpdateCompany = async () => {
    if (!selectedCompany) return;

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(`/api/companies/${selectedCompany.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': user.id
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Şirket başarıyla güncellendi');
        setIsEditOpen(false);
        setSelectedCompany(null);
        resetForm();
        fetchCompanies();
      } else {
        toast.error(data.error || 'Şirket güncellenemedi');
      }
    } catch (error: any) {
      toast.error('Şirket güncellenirken hata oluştu');
      console.error('Error updating company:', error);
    }
  };

  const handleDeleteCompany = async () => {
    if (!deleteId) return;

    try {
      if (!user?.id) {
        throw new Error('Kullanıcı kimlik doğrulaması gerekli');
      }

      const response = await fetch(`/api/companies/${deleteId}`, {
        method: 'DELETE',
        headers: {
          'x-user-id': user.id
        }
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Şirket başarıyla silindi');
        fetchCompanies();
      } else {
        toast.error(data.error || 'Şirket silinemedi');
      }
    } catch (error: any) {
      toast.error('Şirket silinirken hata oluştu');
      console.error('Error deleting company:', error);
    } finally {
      setDeleteId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      code: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      country: 'Turkey',
      website: '',
      tax_number: '',
      settings: {
        timezone: 'Europe/Istanbul',
        currency: 'TRY',
        language: 'tr',
        date_format: 'DD/MM/YYYY',
        number_format: 'tr-TR',
        features: {
          advanced_reporting: false,
          api_access: false,
          custom_branding: false,
          priority_support: false,
        },
        limits: {
          max_users: 10,
          max_products: 1000,
          max_orders_per_month: 500,
          storage_limit_gb: 5,
        },
      },
    });
  };

  const openEditDialog = (company: Company) => {
    setSelectedCompany(company);
    setFormData({
      name: company.name,
      code: company.code,
      email: company.email,
      phone: company.phone || '',
      address: company.address || '',
      city: company.city || '',
      country: company.country,
      website: company.website || '',
      tax_number: company.tax_number || '',
      settings: company.settings || formData.settings,
    });
    setIsEditOpen(true);
  };

  const getStatusBadge = (status: string) => {
    const statusInfo = SUBSCRIPTION_STATUSES[status as keyof typeof SUBSCRIPTION_STATUSES];
    return (
      <Badge className={statusInfo.color}>
        {statusInfo.label}
      </Badge>
    );
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const expiry = new Date(expiryDate);
    const now = new Date();
    const diffTime = expiry.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Şirket Yönetimi</h1>
          <p className="text-muted-foreground">
            Multi-tenant sistem yönetimi ve şirket konfigürasyonları
          </p>
        </div>
        <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
          <DialogTrigger asChild>
            <Button onClick={resetForm}>
              <Plus className="mr-2 h-4 w-4" />
              Yeni Şirket
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Yeni Şirket Oluştur</DialogTitle>
              <DialogDescription>
                Multi-tenant sistem için yeni bir şirket ekleyin
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Şirket Adı *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="ABC Şirketi A.Ş."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="code">Şirket Kodu *</Label>
                  <Input
                    id="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    placeholder="ABC001"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                    placeholder="admin@abc.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Telefon</Label>
                  <Input
                    id="phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="+90 212 123 45 67"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Adres</Label>
                <Input
                  id="address"
                  value={formData.address}
                  onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="İstanbul, Türkiye"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="website">Website</Label>
                  <Input
                    id="website"
                    value={formData.website}
                    onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                    placeholder="https://www.abc.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tax_number">Vergi No</Label>
                  <Input
                    id="tax_number"
                    value={formData.tax_number}
                    onChange={(e) => setFormData(prev => ({ ...prev, tax_number: e.target.value }))}
                    placeholder="1234567890"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                  İptal
                </Button>
                <Button onClick={handleCreateCompany}>
                  Şirket Oluştur
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Şirket</CardTitle>
            <Building2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pagination.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Aktif Şirket</CardTitle>
            <CheckCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {companies.filter(c => c.is_active).length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Deneme Sürümü</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {companies.filter(c => c.subscription_status === 'trial').length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Toplam Kullanıcı</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {companies.reduce((sum, c) => sum + c.user_count, 0)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filtreler</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Şirket ara..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Durum seçin" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Tüm Durumlar</SelectItem>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="trial">Deneme</SelectItem>
                <SelectItem value="suspended">Askıda</SelectItem>
                <SelectItem value="cancelled">İptal</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Companies Table */}
      <Card>
        <CardHeader>
          <CardTitle>Şirket Listesi</CardTitle>
          <CardDescription>
            Toplam {pagination.total} şirketten {companies.length} tanesi gösteriliyor
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Şirket</TableHead>
                  <TableHead>Kullanıcı</TableHead>
                  <TableHead>Durum</TableHead>
                  <TableHead>Abonelik</TableHead>
                  <TableHead>Kuruluş</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((company) => (
                  <TableRow key={company.id}>
                    <TableCell>
                      <div>
                        <div className="font-medium">{company.name}</div>
                        <div className="text-sm text-muted-foreground">{company.code}</div>
                        <div className="text-sm text-muted-foreground">{company.email}</div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Users className="h-4 w-4" />
                        {company.user_count}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={company.is_active ? 'default' : 'secondary'}>
                        {company.is_active ? (
                          <>
                            <CheckCircle className="h-3 w-3 mr-1" />
                            Aktif
                          </>
                        ) : (
                          <>
                            <EyeOff className="h-3 w-3 mr-1" />
                            Pasif
                          </>
                        )}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        {getStatusBadge(company.subscription_status)}
                        {company.subscription_status === 'trial' && company.subscription_expires_at && (
                          <div className="text-xs text-muted-foreground">
                            {getDaysUntilExpiry(company.subscription_expires_at)} gün kaldı
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(company.created_at).toLocaleDateString('tr-TR')}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditDialog(company)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setDeleteId(company.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Şirketi Düzenle</DialogTitle>
            <DialogDescription>
              {selectedCompany?.name} şirket bilgilerini güncelleyin
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-name">Şirket Adı</Label>
                <Input
                  id="edit-name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-email">Email</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-phone">Telefon</Label>
                <Input
                  id="edit-phone"
                  value={formData.phone}
                  onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-website">Website</Label>
                <Input
                  id="edit-website"
                  value={formData.website}
                  onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                İptal
              </Button>
              <Button onClick={handleUpdateCompany}>
                Güncelle
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Şirketi Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu şirketi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz ve 
              şirketin tüm verileri kalıcı olarak silinecektir.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteCompany}
              className="bg-red-600 hover:bg-red-700"
            >
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
