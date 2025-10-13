'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { 
  Settings, 
  Users, 
  Bell, 
  ArrowRight,
  Save,
  RefreshCw,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { toast } from 'sonner';

interface SystemSettings {
  default_operator_password: string;
  critical_stock_threshold: number;
  production_notification_enabled: boolean;
  email_notifications_enabled: boolean;
  system_maintenance_mode: boolean;
  auto_backup_enabled: boolean;
  backup_retention_days: number;
  max_login_attempts: number;
  session_timeout_minutes: number;
}

export default function AyarlarPage() {
  const router = useRouter();
  const [settings, setSettings] = useState<SystemSettings>({
    default_operator_password: '',
    critical_stock_threshold: 10,
    production_notification_enabled: true,
    email_notifications_enabled: false,
    system_maintenance_mode: false,
    auto_backup_enabled: true,
    backup_retention_days: 30,
    max_login_attempts: 5,
    session_timeout_minutes: 480,
  });
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
      toast.error('Ayarlar yüklenirken hata oluştu');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    try {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings),
      });

      if (response.ok) {
        toast.success('Ayarlar başarıyla kaydedildi');
      } else {
        throw new Error('Ayarlar kaydedilemedi');
      }
    } catch (error: any) {
      toast.error(error.message || 'Ayarlar kaydedilirken hata oluştu');
    } finally {
      setIsSaving(false);
    }
  };

  const handleNavigation = (path: string) => {
    router.push(path);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Ayarlar</h1>
        <p className="text-gray-500">Sistem ayarları ve kullanıcı yönetimi</p>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card 
          className="cursor-pointer transition-shadow hover:shadow-lg"
          onClick={() => handleNavigation('/kullanicilar')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <CardTitle>Kullanıcı Yönetimi</CardTitle>
                  <CardDescription>Kullanıcı ekle, düzenle ve yetkilendir</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
        </Card>

        <Card 
          className="cursor-pointer transition-shadow hover:shadow-lg"
          onClick={() => handleNavigation('/bildirimler')}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-lg bg-orange-100 p-3">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <CardTitle>Bildirim Ayarları</CardTitle>
                  <CardDescription>Kritik stok uyarıları ve bildirimler</CardDescription>
                </div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
            </div>
          </CardHeader>
        </Card>
      </div>

      {/* System Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Sistem Ayarları
          </CardTitle>
          <CardDescription>
            Genel sistem konfigürasyonu ve güvenlik ayarları
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Security Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Güvenlik Ayarları</h3>
            
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="default_password">Varsayılan Operatör Şifresi</Label>
                <Input
                  id="default_password"
                  type="password"
                  value={settings.default_operator_password}
                  onChange={(e) => setSettings({ ...settings, default_operator_password: e.target.value })}
                  placeholder="Yeni operatörler için varsayılan şifre"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="max_login_attempts">Maksimum Giriş Denemesi</Label>
                <Input
                  id="max_login_attempts"
                  type="number"
                  value={settings.max_login_attempts}
                  onChange={(e) => setSettings({ ...settings, max_login_attempts: parseInt(e.target.value) })}
                  min="1"
                  max="10"
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="session_timeout">Oturum Zaman Aşımı (dakika)</Label>
                <Input
                  id="session_timeout"
                  type="number"
                  value={settings.session_timeout_minutes}
                  onChange={(e) => setSettings({ ...settings, session_timeout_minutes: parseInt(e.target.value) })}
                  min="30"
                  max="1440"
                />
              </div>
            </div>
          </div>

          {/* Stock Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Stok Ayarları</h3>
            
            <div className="space-y-2">
              <Label htmlFor="critical_threshold">Kritik Stok Eşiği</Label>
              <Input
                id="critical_threshold"
                type="number"
                value={settings.critical_stock_threshold}
                onChange={(e) => setSettings({ ...settings, critical_stock_threshold: parseInt(e.target.value) })}
                min="1"
                max="100"
              />
              <p className="text-sm text-gray-500">
                Bu miktarın altına düşen stoklar için kritik uyarı gönderilir
              </p>
            </div>
          </div>

          {/* Notification Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Bildirim Ayarları</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="production_notifications">Üretim Bildirimleri</Label>
                  <p className="text-sm text-gray-500">Üretim durumu değişikliklerinde bildirim gönder</p>
                </div>
                <Switch
                  id="production_notifications"
                  checked={settings.production_notification_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, production_notification_enabled: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="email_notifications">Email Bildirimleri</Label>
                  <p className="text-sm text-gray-500">Kritik durumlar için email gönder</p>
                </div>
                <Switch
                  id="email_notifications"
                  checked={settings.email_notifications_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, email_notifications_enabled: checked })}
                />
              </div>
            </div>
          </div>

          {/* System Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Sistem Ayarları</h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="maintenance_mode">Bakım Modu</Label>
                  <p className="text-sm text-gray-500">Sistemi bakım moduna al (sadece admin erişebilir)</p>
                </div>
                <Switch
                  id="maintenance_mode"
                  checked={settings.system_maintenance_mode}
                  onCheckedChange={(checked) => setSettings({ ...settings, system_maintenance_mode: checked })}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="auto_backup">Otomatik Yedekleme</Label>
                  <p className="text-sm text-gray-500">Günlük otomatik veri yedekleme</p>
                </div>
                <Switch
                  id="auto_backup"
                  checked={settings.auto_backup_enabled}
                  onCheckedChange={(checked) => setSettings({ ...settings, auto_backup_enabled: checked })}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="backup_retention">Yedek Saklama Süresi (gün)</Label>
                <Input
                  id="backup_retention"
                  type="number"
                  value={settings.backup_retention_days}
                  onChange={(e) => setSettings({ ...settings, backup_retention_days: parseInt(e.target.value) })}
                  min="7"
                  max="365"
                />
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end pt-6 border-t">
            <Button 
              onClick={handleSaveSettings}
              disabled={isSaving}
              className="min-w-[120px]"
            >
              {isSaving ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Kaydediliyor...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Ayarları Kaydet
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

